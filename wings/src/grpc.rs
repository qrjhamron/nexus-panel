use std::collections::HashMap;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use dashmap::DashMap;
use futures_util::StreamExt;
use tokio::sync::{mpsc, Mutex};
use tokio_stream::Stream;
use tonic::{Request, Response, Status, Streaming};

use crate::docker::{ServerConfig as DockerServerConfig, PortMapping as DockerPortMapping};
use crate::installer;
use crate::state::AppState;

pub mod proto {
    tonic::include_proto!("nexus.wings");
}

use proto::wings_service_server::WingsService;
use proto::*;

/// Bounded event buffer for offline queueing
const MAX_EVENT_BUFFER: usize = 1000;

/// Shared event sender — Wings pushes events here, gRPC stream reads them
pub type EventSender = mpsc::Sender<WingsEvent>;
pub type EventReceiver = mpsc::Receiver<WingsEvent>;

/// Per-server mutex to deduplicate concurrent power commands
pub type ServerLocks = Arc<DashMap<String, Arc<Mutex<()>>>>;

pub struct WingsGrpcService {
    state: Arc<AppState>,
    event_tx: EventSender,
    server_locks: ServerLocks,
}

impl WingsGrpcService {
    pub fn new(state: Arc<AppState>, event_tx: EventSender) -> Self {
        Self {
            state,
            event_tx,
            server_locks: Arc::new(DashMap::new()),
        }
    }

    fn get_lock(&self, uuid: &str) -> Arc<Mutex<()>> {
        self.server_locks
            .entry(uuid.to_string())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }

    fn to_docker_config(cfg: &ServerConfig) -> DockerServerConfig {
        DockerServerConfig {
            uuid: cfg.uuid.clone(),
            docker_image: cfg.docker_image.clone(),
            startup_command: cfg.startup_command.clone(),
            environment: cfg.environment.clone(),
            memory_limit: cfg.memory_limit_mb,
            cpu_limit: cfg.cpu_limit as u64,
            disk_limit: cfg.disk_limit_mb,
            port_mappings: cfg
                .port_mappings
                .iter()
                .map(|pm| DockerPortMapping {
                    host_port: pm.host_port as u16,
                    container_port: pm.container_port as u16,
                })
                .collect(),
            volume_path: cfg.volume_path.clone(),
        }
    }

    fn docker_state_to_proto(state: &str) -> ServerState {
        match state {
            "running" => ServerState::StateRunning,
            "created" | "restarting" => ServerState::StateStarting,
            "paused" | "exited" | "dead" | "removing" => ServerState::StateOffline,
            _ => ServerState::StateUnknown,
        }
    }

    async fn emit_event(&self, event: WingsEvent) {
        if self.event_tx.try_send(event).is_err() {
            tracing::warn!("Event buffer full, dropping oldest events");
        }
    }

    /// Calculate disk usage for a server data directory
    fn calculate_disk_usage(data_dir: &str, uuid: &str) -> u64 {
        let path = std::path::Path::new(data_dir).join(uuid);
        if !path.exists() {
            return 0;
        }
        walkdir::WalkDir::new(&path)
            .max_depth(64)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter_map(|e| e.metadata().ok())
            .filter(|m| m.is_file())
            .map(|m| m.len())
            .sum()
    }
}

#[tonic::async_trait]
impl WingsService for WingsGrpcService {
    async fn create_server(
        &self,
        request: Request<CreateServerRequest>,
    ) -> Result<Response<CreateServerResponse>, Status> {
        let req = request.into_inner();
        let server_cfg = req.server.ok_or_else(|| Status::invalid_argument("Missing server config"))?;

        let mut docker_cfg = Self::to_docker_config(&server_cfg);

        // Ensure data directory
        let server_dir = std::path::Path::new(&self.state.config.storage.data_dir).join(&docker_cfg.uuid);
        std::fs::create_dir_all(&server_dir).map_err(|e| Status::internal(e.to_string()))?;
        docker_cfg.volume_path = server_dir.to_string_lossy().to_string();

        // Store config in registry for later reconstruction
        self.state.store_server_config(&docker_cfg).await;

        tracing::info!(uuid = %docker_cfg.uuid, image = %docker_cfg.docker_image, "Creating server");

        let container_id = self.state.docker.create_server(&docker_cfg)
            .await
            .map_err(|e| Status::internal(format!("Docker create failed: {e}")))?;

        // Run install if provided
        if !req.install_script.is_empty() && !req.install_docker_image.is_empty() {
            let state = self.state.clone();
            let event_tx = self.event_tx.clone();
            let cfg = docker_cfg.clone();
            let script = req.install_script;
            let image = req.install_docker_image;

            tokio::spawn(async move {
                let panel_url = Some(state.config.panel.url.as_str());
                let panel_auth_str = format!("{}.{}", state.config.panel.token_id, state.config.panel.token);
                let panel_auth = Some(panel_auth_str.as_str());

                match installer::run_install(&state.docker, &cfg, &script, &image, panel_url, panel_auth).await {
                    Ok(output) => {
                        tracing::info!(uuid = %cfg.uuid, lines = output.len(), "Install completed");
                        let _ = event_tx.try_send(WingsEvent {
                            event: Some(wings_event::Event::InstallComplete(ServerInstallComplete {
                                uuid: cfg.uuid.clone(),
                                timestamp_ms: chrono::Utc::now().timestamp_millis(),
                            })),
                        });
                    }
                    Err(e) => {
                        tracing::error!(uuid = %cfg.uuid, error = %e, "Install failed");
                        let _ = event_tx.try_send(WingsEvent {
                            event: Some(wings_event::Event::InstallFailed(ServerInstallFailed {
                                uuid: cfg.uuid.clone(),
                                error_message: e.to_string(),
                                timestamp_ms: chrono::Utc::now().timestamp_millis(),
                            })),
                        });
                    }
                }
            });
        }

        Ok(Response::new(CreateServerResponse {
            container_id,
            uuid: docker_cfg.uuid,
        }))
    }

    async fn delete_server(
        &self,
        request: Request<DeleteServerRequest>,
    ) -> Result<Response<DeleteServerResponse>, Status> {
        let req = request.into_inner();
        let lock = self.get_lock(&req.uuid);
        let _guard = lock.lock().await;

        tracing::info!(uuid = %req.uuid, "Deleting server");

        self.state.docker.delete_server(&req.uuid, req.remove_volumes)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        self.state.console_buffers.write().await.remove(&req.uuid);
        self.state.remove_server_config(&req.uuid).await;
        self.server_locks.remove(&req.uuid);

        Ok(Response::new(DeleteServerResponse {}))
    }

    async fn reinstall_server(
        &self,
        request: Request<ReinstallServerRequest>,
    ) -> Result<Response<ReinstallServerResponse>, Status> {
        let req = request.into_inner();
        let server_cfg = req.server.ok_or_else(|| Status::invalid_argument("Missing server config"))?;
        let docker_cfg = Self::to_docker_config(&server_cfg);

        tracing::info!(uuid = %docker_cfg.uuid, "Reinstalling server");

        // Update stored config
        self.state.store_server_config(&docker_cfg).await;

        let state = self.state.clone();
        let event_tx = self.event_tx.clone();
        let script = req.install_script;
        let image = req.install_docker_image;
        let cfg = docker_cfg;

        tokio::spawn(async move {
            let panel_url = Some(state.config.panel.url.as_str());
            let panel_auth_str = format!("{}.{}", state.config.panel.token_id, state.config.panel.token);
            let panel_auth = Some(panel_auth_str.as_str());

            match installer::run_install(&state.docker, &cfg, &script, &image, panel_url, panel_auth).await {
                Ok(_) => {
                    let _ = event_tx.try_send(WingsEvent {
                        event: Some(wings_event::Event::InstallComplete(ServerInstallComplete {
                            uuid: cfg.uuid.clone(),
                            timestamp_ms: chrono::Utc::now().timestamp_millis(),
                        })),
                    });
                }
                Err(e) => {
                    let _ = event_tx.try_send(WingsEvent {
                        event: Some(wings_event::Event::InstallFailed(ServerInstallFailed {
                            uuid: cfg.uuid.clone(),
                            error_message: e.to_string(),
                            timestamp_ms: chrono::Utc::now().timestamp_millis(),
                        })),
                    });
                }
            }
        });

        Ok(Response::new(ReinstallServerResponse {}))
    }

    async fn send_power_action(
        &self,
        request: Request<PowerActionRequest>,
    ) -> Result<Response<PowerActionResponse>, Status> {
        let req = request.into_inner();
        let lock = self.get_lock(&req.uuid);
        let _guard = lock.lock().await;

        let action = PowerAction::try_from(req.action)
            .map_err(|_| Status::invalid_argument("Invalid power action"))?;

        tracing::info!(uuid = %req.uuid, action = ?action, "Power action");

        // If starting and container doesn't exist, recreate from stored config
        if matches!(action, PowerAction::PowerStart) {
            let container_exists = self.state.docker.get_container_status(&req.uuid).await.is_ok();
            if !container_exists {
                tracing::info!(uuid = %req.uuid, "Container missing, recreating from stored config");
                if let Some(cfg) = self.state.get_server_config(&req.uuid).await {
                    self.state.docker.create_server(&cfg)
                        .await
                        .map_err(|e| Status::internal(format!("Failed to recreate container: {e}")))?;
                } else {
                    return Err(Status::not_found("Server config not found in registry, cannot recreate container"));
                }
            }
        }

        let prev_state = self.state.docker.get_container_status(&req.uuid).await.unwrap_or_else(|_| "unknown".to_string());

        // For stop/restart/kill, run in background and respond immediately
        // These can take up to 30s for graceful shutdown
        match action {
            PowerAction::PowerStart => {
                self.state.docker.start_server(&req.uuid).await
                    .map_err(|e| Status::internal(e.to_string()))?;

                let new_state_str = self.state.docker.get_container_status(&req.uuid).await.unwrap_or_else(|_| "unknown".to_string());
                self.emit_event(WingsEvent {
                    event: Some(wings_event::Event::StateChanged(ServerStateChanged {
                        uuid: req.uuid.clone(),
                        previous_state: Self::docker_state_to_proto(&prev_state).into(),
                        new_state: Self::docker_state_to_proto(&new_state_str).into(),
                        timestamp_ms: chrono::Utc::now().timestamp_millis(),
                    })),
                }).await;
            }
            _ => {
                // Stop/restart/kill: spawn background task, respond immediately
                let state = self.state.clone();
                let event_tx = self.event_tx.clone();
                let uuid = req.uuid.clone();
                let prev = prev_state.clone();
                tokio::spawn(async move {
                    let result = match action {
                        PowerAction::PowerStop => state.docker.stop_server(&uuid, 30).await,
                        PowerAction::PowerRestart => state.docker.restart_server(&uuid).await,
                        PowerAction::PowerKill => state.docker.kill_server(&uuid).await,
                        _ => unreachable!(),
                    };
                    if let Err(e) = result {
                        tracing::error!(uuid = %uuid, error = %e, "Background power action failed");
                        return;
                    }
                    let new_state_str = state.docker.get_container_status(&uuid).await.unwrap_or_else(|_| "unknown".to_string());
                    let _ = event_tx.try_send(WingsEvent {
                        event: Some(wings_event::Event::StateChanged(ServerStateChanged {
                            uuid: uuid.clone(),
                            previous_state: WingsGrpcService::docker_state_to_proto(&prev).into(),
                            new_state: WingsGrpcService::docker_state_to_proto(&new_state_str).into(),
                            timestamp_ms: chrono::Utc::now().timestamp_millis(),
                        })),
                    });
                });
            }
        }

        Ok(Response::new(PowerActionResponse {}))
    }

    async fn send_command(
        &self,
        request: Request<CommandRequest>,
    ) -> Result<Response<CommandResponse>, Status> {
        let req = request.into_inner();
        self.state.docker.send_command(&req.uuid, &req.command)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;
        Ok(Response::new(CommandResponse {}))
    }

    async fn sync_server_config(
        &self,
        request: Request<SyncConfigRequest>,
    ) -> Result<Response<SyncConfigResponse>, Status> {
        let req = request.into_inner();
        let cfg = req.server.ok_or_else(|| Status::invalid_argument("Missing server config"))?;
        let docker_cfg = Self::to_docker_config(&cfg);
        self.state.store_server_config(&docker_cfg).await;
        tracing::info!(uuid = %docker_cfg.uuid, "Server config synced");
        Ok(Response::new(SyncConfigResponse {}))
    }

    async fn get_server_status(
        &self,
        request: Request<ServerStatusRequest>,
    ) -> Result<Response<ServerStatusResponse>, Status> {
        let req = request.into_inner();
        let container_state = self.state.docker.get_container_status(&req.uuid)
            .await
            .map_err(|e| Status::not_found(e.to_string()))?;

        let resources = if container_state == "running" {
            match self.state.docker.get_stats(&req.uuid).await {
                Ok(mut stats) => {
                    stats.disk_bytes = Self::calculate_disk_usage(
                        &self.state.config.storage.data_dir,
                        &req.uuid,
                    );
                    Some(ResourceStats {
                        uuid: req.uuid.clone(),
                        cpu_percent: stats.cpu_percent,
                        memory_bytes: stats.memory_bytes,
                        memory_limit: stats.memory_limit,
                        network_rx_bytes: stats.network_rx_bytes,
                        network_tx_bytes: stats.network_tx_bytes,
                        disk_bytes: stats.disk_bytes,
                        timestamp_ms: chrono::Utc::now().timestamp_millis(),
                    })
                }
                Err(_) => None,
            }
        } else {
            None
        };

        Ok(Response::new(ServerStatusResponse {
            uuid: req.uuid,
            state: Self::docker_state_to_proto(&container_state).into(),
            resources,
        }))
    }

    async fn get_system_info(
        &self,
        _request: Request<SystemInfoRequest>,
    ) -> Result<Response<SystemInfoResponse>, Status> {
        let docker_version = self.state.docker.docker_version().await.unwrap_or_else(|_| "unknown".to_string());

        let (mem_total, mem_used) = crate::heartbeat::read_memory_info();
        let (disk_total, disk_used) = crate::heartbeat::read_disk_usage(&self.state.config.storage.data_dir);
        let cpu = crate::heartbeat::read_cpu_usage().await;

        let server_count = {
            let filters: HashMap<String, Vec<String>> =
                [("label".to_string(), vec!["nexus.managed=true".to_string()])].into();
            self.state.docker.client().list_containers(Some(
                bollard::container::ListContainersOptions::<String> {
                    all: true,
                    filters,
                    ..Default::default()
                },
            ))
            .await
            .map(|c| c.len() as u32)
            .unwrap_or(0)
        };

        Ok(Response::new(SystemInfoResponse {
            version: env!("CARGO_PKG_VERSION").to_string(),
            docker_version,
            total_memory: mem_total,
            used_memory: mem_used,
            total_disk: disk_total,
            used_disk: disk_used,
            cpu_percent: cpu,
            server_count,
        }))
    }

    async fn update_resources(
        &self,
        request: Request<UpdateResourcesRequest>,
    ) -> Result<Response<UpdateResourcesResponse>, Status> {
        let req = request.into_inner();
        let lock = self.get_lock(&req.uuid);
        let _guard = lock.lock().await;

        tracing::info!(uuid = %req.uuid, mem = req.memory_limit_mb, cpu = req.cpu_limit, disk = req.disk_limit_mb, "Updating resources");

        // Use Docker update API for live resource changes
        let container_name = format!("nexus-{}", &req.uuid.replace('-', "")[..8.min(req.uuid.replace('-', "").len())]);
        let update_config = bollard::container::UpdateContainerOptions::<String> {
            memory: Some((req.memory_limit_mb * 1024 * 1024) as i64),
            nano_cpus: Some((req.cpu_limit as i64) * 10_000_000),
            ..Default::default()
        };

        self.state.docker.client().update_container(&container_name, update_config)
            .await
            .map_err(|e| Status::internal(format!("Docker update failed: {e}")))?;

        // Update stored config
        if let Some(mut cfg) = self.state.get_server_config(&req.uuid).await {
            cfg.memory_limit = req.memory_limit_mb;
            cfg.cpu_limit = req.cpu_limit as u64;
            cfg.disk_limit = req.disk_limit_mb;
            self.state.store_server_config(&cfg).await;
        }

        Ok(Response::new(UpdateResourcesResponse {}))
    }

    type EventStreamStream = Pin<Box<dyn Stream<Item = Result<PanelCommand, Status>> + Send>>;

    async fn event_stream(
        &self,
        _request: Request<Streaming<WingsEvent>>,
    ) -> Result<Response<Self::EventStreamStream>, Status> {
        // Panel commands stream (currently no Panel→Wings commands, just keepalive)
        let stream = tokio_stream::wrappers::IntervalStream::new(
            tokio::time::interval(Duration::from_secs(30)),
        )
        .map(|_| Ok(PanelCommand {
            command_type: "keepalive".to_string(),
            payload: vec![],
        }));

        Ok(Response::new(Box::pin(stream)))
    }
}

/// Create event channel
pub fn create_event_channel() -> (EventSender, EventReceiver) {
    mpsc::channel(MAX_EVENT_BUFFER)
}
