use std::collections::HashMap;

use bollard::container::{
    Config as ContainerConfig, CreateContainerOptions, ListContainersOptions, LogOutput,
    LogsOptions, RemoveContainerOptions, StartContainerOptions, StopContainerOptions,
    StatsOptions,
};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::image::CreateImageOptions;
use bollard::models::{HostConfig, PortBinding, PortMap};
use bollard::network::CreateNetworkOptions;
use bollard::Docker;
use futures_util::stream::{Stream, StreamExt};
use serde::{Deserialize, Serialize};

use crate::error::WingsError;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ServerConfig {
    pub uuid: String,
    #[serde(alias = "dockerImage")]
    pub docker_image: String,
    #[serde(alias = "startupCommand")]
    pub startup_command: String,
    pub environment: HashMap<String, String>,
    #[serde(alias = "memoryLimit")]
    pub memory_limit: u64,
    #[serde(alias = "cpuLimit")]
    pub cpu_limit: u64,
    #[serde(alias = "diskLimit")]
    pub disk_limit: u64,
    #[serde(alias = "portMappings")]
    pub port_mappings: Vec<PortMapping>,
    #[serde(alias = "volumePath")]
    pub volume_path: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PortMapping {
    #[serde(alias = "hostPort")]
    pub host_port: u16,
    #[serde(alias = "containerPort")]
    pub container_port: u16,
}

#[derive(Debug, Serialize, Clone)]
pub struct ResourceStats {
    pub cpu_percent: f64,
    pub memory_bytes: u64,
    pub memory_limit: u64,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
    pub disk_bytes: u64,
    pub timestamp: String,
}

pub struct DockerManager {
    client: Docker,
}

impl DockerManager {
    pub fn new(socket_path: &str) -> Result<Self, WingsError> {
        let client = Docker::connect_with_local(socket_path, 120, bollard::API_DEFAULT_VERSION)
            .map_err(WingsError::Docker)?;
        Ok(Self { client })
    }

    pub fn client(&self) -> &Docker {
        &self.client
    }

    fn container_name(uuid: &str) -> String {
        format!("nexus-{uuid}")
    }

    pub async fn create_server(&self, config: &ServerConfig) -> Result<String, WingsError> {
        // Pull image
        let mut pull_stream = self.client.create_image(
            Some(CreateImageOptions {
                from_image: config.docker_image.clone(),
                ..Default::default()
            }),
            None,
            None,
        );
        while let Some(result) = pull_stream.next().await {
            result.map_err(WingsError::Docker)?;
        }

        // Build port bindings
        let mut port_bindings: PortMap = HashMap::new();
        let mut exposed_ports: HashMap<String, HashMap<(), ()>> = HashMap::new();
        for pm in &config.port_mappings {
            let container_port_key = format!("{}/tcp", pm.container_port);
            exposed_ports.insert(container_port_key.clone(), HashMap::new());
            port_bindings.insert(
                container_port_key,
                Some(vec![PortBinding {
                    host_ip: Some("0.0.0.0".to_string()),
                    host_port: Some(pm.host_port.to_string()),
                }]),
            );
        }

        // Build environment variables
        let env: Vec<String> = config
            .environment
            .iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect();

        let host_config = HostConfig {
            memory: Some(config.memory_limit as i64),
            nano_cpus: Some(config.cpu_limit as i64),
            port_bindings: Some(port_bindings),
            binds: Some(vec![format!("{}:/server", config.volume_path)]),
            ..Default::default()
        };

        let cmd: Vec<&str> = config.startup_command.split_whitespace().collect();

        let container_config = ContainerConfig {
            image: Some(config.docker_image.clone()),
            cmd: Some(cmd.into_iter().map(String::from).collect()),
            env: Some(env),
            exposed_ports: Some(exposed_ports),
            host_config: Some(host_config),
            open_stdin: Some(true),
            attach_stdin: Some(true),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            tty: Some(true),
            working_dir: Some("/server".to_string()),
            ..Default::default()
        };

        let name = Self::container_name(&config.uuid);
        let response = self
            .client
            .create_container(
                Some(CreateContainerOptions {
                    name: name.as_str(),
                    platform: None,
                }),
                container_config,
            )
            .await
            .map_err(WingsError::Docker)?;

        Ok(response.id)
    }

    pub async fn start_server(&self, uuid: &str) -> Result<(), WingsError> {
        self.client
            .start_container(
                &Self::container_name(uuid),
                None::<StartContainerOptions<String>>,
            )
            .await
            .map_err(WingsError::Docker)?;
        Ok(())
    }

    pub async fn stop_server(&self, uuid: &str, timeout: u64) -> Result<(), WingsError> {
        self.client
            .stop_container(
                &Self::container_name(uuid),
                Some(StopContainerOptions {
                    t: timeout as i64,
                }),
            )
            .await
            .map_err(WingsError::Docker)?;
        Ok(())
    }

    pub async fn kill_server(&self, uuid: &str) -> Result<(), WingsError> {
        self.client
            .kill_container::<String>(&Self::container_name(uuid), None)
            .await
            .map_err(WingsError::Docker)?;
        Ok(())
    }

    pub async fn restart_server(&self, uuid: &str) -> Result<(), WingsError> {
        self.client
            .restart_container(&Self::container_name(uuid), None)
            .await
            .map_err(WingsError::Docker)?;
        Ok(())
    }

    pub async fn delete_server(
        &self,
        uuid: &str,
        remove_volumes: bool,
    ) -> Result<(), WingsError> {
        let name = Self::container_name(uuid);
        // Try to stop first (ignore errors if already stopped)
        let _ = self
            .client
            .stop_container(&name, Some(StopContainerOptions { t: 10 }))
            .await;

        self.client
            .remove_container(
                &name,
                Some(RemoveContainerOptions {
                    force: true,
                    v: remove_volumes,
                    ..Default::default()
                }),
            )
            .await
            .map_err(WingsError::Docker)?;
        Ok(())
    }

    pub async fn get_stats(&self, uuid: &str) -> Result<ResourceStats, WingsError> {
        let name = Self::container_name(uuid);
        let mut stream = self.client.stats(
            &name,
            Some(StatsOptions {
                stream: false,
                one_shot: true,
            }),
        );

        let stats = stream
            .next()
            .await
            .ok_or_else(|| WingsError::ServerNotFound(uuid.to_string()))?
            .map_err(WingsError::Docker)?;

        let cpu_percent = calculate_cpu_percent(&stats);
        let memory_bytes = stats.memory_stats.usage.unwrap_or(0);
        let memory_limit = stats.memory_stats.limit.unwrap_or(0);

        let (network_rx, network_tx) = stats
            .networks
            .as_ref()
            .map(|nets| {
                nets.values().fold((0u64, 0u64), |(rx, tx), net| {
                    (rx + net.rx_bytes, tx + net.tx_bytes)
                })
            })
            .unwrap_or((0, 0));

        Ok(ResourceStats {
            cpu_percent,
            memory_bytes,
            memory_limit,
            network_rx_bytes: network_rx,
            network_tx_bytes: network_tx,
            disk_bytes: 0,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    pub fn stream_stats(
        &self,
        uuid: &str,
    ) -> impl Stream<Item = Result<ResourceStats, WingsError>> + '_ {
        let name = Self::container_name(uuid);
        let stream = self.client.stats(
            &name,
            Some(StatsOptions {
                stream: true,
                one_shot: false,
            }),
        );

        stream.map(|result| {
            let stats = result.map_err(WingsError::Docker)?;
            let cpu_percent = calculate_cpu_percent(&stats);
            let memory_bytes = stats.memory_stats.usage.unwrap_or(0);
            let memory_limit = stats.memory_stats.limit.unwrap_or(0);

            let (network_rx, network_tx) = stats
                .networks
                .as_ref()
                .map(|nets| {
                    nets.values().fold((0u64, 0u64), |(rx, tx), net| {
                        (rx + net.rx_bytes, tx + net.tx_bytes)
                    })
                })
                .unwrap_or((0, 0));

            Ok(ResourceStats {
                cpu_percent,
                memory_bytes,
                memory_limit,
                network_rx_bytes: network_rx,
                network_tx_bytes: network_tx,
                disk_bytes: 0,
                timestamp: chrono::Utc::now().to_rfc3339(),
            })
        })
    }

    pub async fn attach_console(
        &self,
        uuid: &str,
    ) -> Result<
        (
            tokio::sync::mpsc::Sender<String>,
            tokio::sync::mpsc::Receiver<String>,
        ),
        WingsError,
    > {
        let name = Self::container_name(uuid);
        let exec = self
            .client
            .create_exec(
                &name,
                CreateExecOptions {
                    cmd: Some(vec!["/bin/sh".to_string()]),
                    attach_stdout: Some(true),
                    attach_stderr: Some(true),
                    attach_stdin: Some(true),
                    tty: Some(true),
                    ..Default::default()
                },
            )
            .await
            .map_err(WingsError::Docker)?;

        let result = self
            .client
            .start_exec(&exec.id, None)
            .await
            .map_err(WingsError::Docker)?;

        let (tx_input, mut rx_input) = tokio::sync::mpsc::channel::<String>(100);
        let (tx_output, rx_output) = tokio::sync::mpsc::channel::<String>(100);

        if let StartExecResults::Attached { mut output, input } = result {
            let mut input = input;
            // Read output task
            tokio::spawn(async move {
                while let Some(Ok(msg)) = output.next().await {
                    let text = match msg {
                        LogOutput::StdOut { message } => {
                            String::from_utf8_lossy(&message).to_string()
                        }
                        LogOutput::StdErr { message } => {
                            String::from_utf8_lossy(&message).to_string()
                        }
                        _ => continue,
                    };
                    if tx_output.send(text).await.is_err() {
                        break;
                    }
                }
            });

            // Write input task
            tokio::spawn(async move {
                use tokio::io::AsyncWriteExt;
                while let Some(cmd) = rx_input.recv().await {
                    if input.write_all(cmd.as_bytes()).await.is_err() {
                        break;
                    }
                }
            });
        }

        Ok((tx_input, rx_output))
    }

    pub async fn send_command(&self, uuid: &str, command: &str) -> Result<(), WingsError> {
        let name = Self::container_name(uuid);
        let exec = self
            .client
            .create_exec(
                &name,
                CreateExecOptions {
                    cmd: Some(vec![
                        "/bin/sh".to_string(),
                        "-c".to_string(),
                        command.to_string(),
                    ]),
                    attach_stdout: Some(true),
                    attach_stderr: Some(true),
                    ..Default::default()
                },
            )
            .await
            .map_err(WingsError::Docker)?;

        self.client
            .start_exec(&exec.id, None)
            .await
            .map_err(WingsError::Docker)?;
        Ok(())
    }

    pub async fn get_logs(&self, uuid: &str, tail: usize) -> Result<Vec<String>, WingsError> {
        let name = Self::container_name(uuid);
        let mut stream = self.client.logs::<String>(
            &name,
            Some(LogsOptions {
                stdout: true,
                stderr: true,
                tail: tail.to_string(),
                ..Default::default()
            }),
        );

        let mut lines = Vec::new();
        while let Some(result) = stream.next().await {
            let log = result.map_err(WingsError::Docker)?;
            let text = match log {
                LogOutput::StdOut { message } => {
                    String::from_utf8_lossy(&message).to_string()
                }
                LogOutput::StdErr { message } => {
                    String::from_utf8_lossy(&message).to_string()
                }
                _ => continue,
            };
            lines.push(text);
        }
        Ok(lines)
    }

    pub async fn get_container_status(&self, uuid: &str) -> Result<String, WingsError> {
        let name = Self::container_name(uuid);
        let filters: HashMap<String, Vec<String>> =
            [("name".to_string(), vec![name.clone()])].into();

        let containers = self
            .client
            .list_containers(Some(ListContainersOptions {
                all: true,
                filters,
                ..Default::default()
            }))
            .await
            .map_err(WingsError::Docker)?;

        if let Some(container) = containers.first() {
            Ok(container
                .state
                .clone()
                .unwrap_or_else(|| "unknown".to_string()))
        } else {
            Err(WingsError::ServerNotFound(uuid.to_string()))
        }
    }

    pub async fn docker_version(&self) -> Result<String, WingsError> {
        let version = self.client.version().await.map_err(WingsError::Docker)?;
        Ok(version.version.unwrap_or_else(|| "unknown".to_string()))
    }

    /// Ensure the `nexus0` bridge network exists, creating it if necessary.
    pub async fn ensure_network(&self) -> Result<(), WingsError> {
        const NETWORK_NAME: &str = "nexus0";
        match self.client.inspect_network::<String>(NETWORK_NAME, None).await {
            Ok(_) => {
                tracing::debug!("Docker network '{NETWORK_NAME}' already exists");
            }
            Err(_) => {
                tracing::info!("Creating Docker network '{NETWORK_NAME}'");
                self.client
                    .create_network(CreateNetworkOptions {
                        name: NETWORK_NAME,
                        driver: "bridge",
                        ..Default::default()
                    })
                    .await
                    .map_err(WingsError::Docker)?;
            }
        }
        Ok(())
    }

    /// Attach all running nexus server containers to the nexus0 network.
    pub async fn attach_containers_to_network(&self) -> Result<(), WingsError> {
        const NETWORK_NAME: &str = "nexus0";
        let filters: HashMap<String, Vec<String>> =
            [("name".to_string(), vec!["nexus-".to_string()])].into();

        let containers = self
            .client
            .list_containers(Some(ListContainersOptions {
                all: true,
                filters,
                ..Default::default()
            }))
            .await
            .map_err(WingsError::Docker)?;

        for container in &containers {
            let id = match &container.id {
                Some(id) => id,
                None => continue,
            };

            // Check if already connected
            let already_connected = container
                .network_settings
                .as_ref()
                .and_then(|ns| ns.networks.as_ref())
                .map(|nets| nets.contains_key(NETWORK_NAME))
                .unwrap_or(false);

            if already_connected {
                continue;
            }

            tracing::info!("Attaching container {id} to network '{NETWORK_NAME}'");
            let connect_opts = bollard::network::ConnectNetworkOptions {
                container: id.as_str(),
                ..Default::default()
            };
            if let Err(e) = self.client.connect_network(NETWORK_NAME, connect_opts).await {
                tracing::warn!("Failed to attach container {id} to '{NETWORK_NAME}': {e}");
            }
        }
        Ok(())
    }
}

fn calculate_cpu_percent(stats: &bollard::container::Stats) -> f64 {
    let cpu_stats = &stats.cpu_stats;
    let precpu_stats = &stats.precpu_stats;

    let cpu_delta = cpu_stats.cpu_usage.total_usage as f64
        - precpu_stats.cpu_usage.total_usage as f64;
    let system_delta = cpu_stats.system_cpu_usage.unwrap_or(0) as f64
        - precpu_stats.system_cpu_usage.unwrap_or(0) as f64;

    if system_delta > 0.0 && cpu_delta > 0.0 {
        let num_cpus = cpu_stats
            .cpu_usage
            .percpu_usage
            .as_ref()
            .map(|v| v.len())
            .unwrap_or(1) as f64;
        (cpu_delta / system_delta) * num_cpus * 100.0
    } else {
        0.0
    }
}
