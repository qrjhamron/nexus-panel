use std::sync::Arc;

use axum::extract::State;
use axum::Json;
use serde::Serialize;

use crate::error::WingsError;
use crate::state::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub version: String,
    pub docker_version: String,
    pub uptime_seconds: u64,
}

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}

pub async fn system_info(
    State(state): State<Arc<AppState>>,
) -> Result<Json<SystemInfo>, WingsError> {
    let docker_version = state.docker.docker_version().await?;

    // Get system uptime
    let uptime = std::fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|s| s.split_whitespace().next().map(String::from))
        .and_then(|s| s.parse::<f64>().ok())
        .map(|f| f as u64)
        .unwrap_or(0);

    Ok(Json(SystemInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        docker_version,
        uptime_seconds: uptime,
    }))
}
