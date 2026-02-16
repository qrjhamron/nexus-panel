use std::sync::Arc;

use axum::extract::{Path as AxumPath, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::docker::ServerConfig;
use crate::error::WingsError;
use crate::installer;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct PowerAction {
    pub action: String, // start, stop, restart, kill
}

#[derive(Deserialize)]
pub struct CommandRequest {
    pub command: String,
}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct ResourceUpdate {
    pub memory_limit: Option<u64>,
    pub cpu_limit: Option<u64>,
    pub disk_limit: Option<u64>,
}

#[derive(Serialize)]
pub struct ServerStatus {
    pub uuid: String,
    pub state: String,
    pub resources: Option<crate::docker::ResourceStats>,
}

#[derive(Deserialize)]
pub struct InstallRequest {
    pub script: Option<String>,
    #[serde(alias = "installScript")]
    pub install_script: Option<String>,
    #[serde(alias = "installDockerImage")]
    pub install_image: Option<String>,
    #[serde(alias = "server")]
    pub server_config: Option<ServerConfig>,
}

#[derive(Deserialize)]
pub struct CreateServerRequest {
    pub server: ServerConfig,
    #[serde(alias = "installScript")]
    pub install_script: Option<String>,
    #[serde(alias = "installDockerImage")]
    pub install_docker_image: Option<String>,
}

#[derive(Deserialize)]
pub struct DeleteQuery {
    #[serde(default)]
    pub remove_volumes: bool,
}

pub async fn create_server(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateServerRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let config = body.server;

    // Ensure the data directory exists
    let server_dir = std::path::Path::new(&state.config.storage.data_dir).join(&config.uuid);
    std::fs::create_dir_all(&server_dir).map_err(WingsError::Io)?;

    // Update volume_path to use actual storage dir
    let mut config = config;
    config.volume_path = server_dir.to_string_lossy().to_string();

    let container_id = state.docker.create_server(&config).await?;

    // Run install script if provided
    if let (Some(script), Some(image)) = (body.install_script, body.install_docker_image) {
        let panel_url = Some(state.config.panel.url.as_str());
        let panel_auth_str = format!("{}.{}", state.config.panel.token_id, state.config.panel.token);
        let panel_auth = Some(panel_auth_str.as_str());
        match installer::run_install(&state.docker, &config, &script, &image, panel_url, panel_auth).await {
            Ok(output) => {
                tracing::info!("Install script completed for {}: {} lines", config.uuid, output.len());
            }
            Err(e) => {
                tracing::error!("Install script failed for {}: {}", config.uuid, e);
            }
        }
    }

    Ok(Json(serde_json::json!({
        "container_id": container_id,
        "uuid": config.uuid,
    })))
}

pub async fn delete_server(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    query: axum::extract::Query<DeleteQuery>,
) -> Result<Json<serde_json::Value>, WingsError> {
    state
        .docker
        .delete_server(&uuid, query.remove_volumes)
        .await?;

    // Remove console buffer
    state.console_buffers.write().await.remove(&uuid);

    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn power_action(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(action): Json<PowerAction>,
) -> Result<Json<serde_json::Value>, WingsError> {
    match action.action.as_str() {
        "start" => state.docker.start_server(&uuid).await?,
        "stop" => state.docker.stop_server(&uuid, 30).await?,
        "restart" => state.docker.restart_server(&uuid).await?,
        "kill" => state.docker.kill_server(&uuid).await?,
        other => {
            return Err(WingsError::Config(format!("Unknown power action: {other}")));
        }
    }
    Ok(Json(serde_json::json!({
        "success": true,
        "action": action.action,
    })))
}

pub async fn send_command(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<CommandRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    state.docker.send_command(&uuid, &body.command).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn update_resources(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<ResourceUpdate>,
) -> Result<Json<serde_json::Value>, WingsError> {
    tracing::info!(uuid = %uuid, "Updating container resources");

    let short = uuid.replace('-', "");
    let container_name = format!("nexus-{}", &short[..std::cmp::min(8, short.len())]);

    let update_config = bollard::container::UpdateContainerOptions::<String> {
        memory: body.memory_limit.map(|m| (m * 1024 * 1024) as i64),
        nano_cpus: body.cpu_limit.map(|c| (c as i64) * 10_000_000),
        ..Default::default()
    };

    state.docker.client().update_container(&container_name, update_config)
        .await
        .map_err(WingsError::Docker)?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Resource limits updated"
    })))
}

pub async fn get_status(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
) -> Result<Json<ServerStatus>, WingsError> {
    let container_state = state.docker.get_container_status(&uuid).await?;
    let resources = if container_state == "running" {
        state.docker.get_stats(&uuid).await.ok()
    } else {
        None
    };

    Ok(Json(ServerStatus {
        uuid,
        state: container_state,
        resources,
    }))
}

pub async fn install_server(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<InstallRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let script = body.install_script.or(body.script)
        .ok_or(WingsError::Config("Missing install script".into()))?;
    let image = body.install_image
        .ok_or(WingsError::Config("Missing install image".into()))?;

    let server_dir = std::path::Path::new(&state.config.storage.data_dir).join(&uuid);
    let config = body.server_config.unwrap_or(ServerConfig {
        uuid: uuid.clone(),
        docker_image: String::new(),
        startup_command: String::new(),
        environment: std::collections::HashMap::new(),
        memory_limit: 0,
        cpu_limit: 0,
        disk_limit: 0,
        port_mappings: vec![],
        volume_path: server_dir.to_string_lossy().to_string(),
    });

    let panel_url = Some(state.config.panel.url.as_str());
    let panel_auth_str = format!("{}.{}", state.config.panel.token_id, state.config.panel.token);
    let panel_auth = Some(panel_auth_str.as_str());

    let output = installer::run_install(
        &state.docker,
        &config,
        &script,
        &image,
        panel_url,
        panel_auth,
    )
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "output": output,
    })))
}
