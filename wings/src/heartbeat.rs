use std::sync::Arc;

use serde::Serialize;
use tokio::time::{self, Duration};

use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HeartbeatPayload {
    version: String,
    total_memory: u64,
    used_memory: u64,
    total_disk: u64,
    used_disk: u64,
    cpu_percent: f64,
    servers: Vec<ServerState>,
}

#[derive(Debug, Serialize)]
struct ServerState {
    uuid: String,
    state: String,
}

/// Spawn the heartbeat background task.
pub fn start(state: Arc<AppState>, shutdown: tokio::sync::watch::Receiver<()>) {
    tokio::spawn(run_heartbeat_loop(state, shutdown));
}

async fn run_heartbeat_loop(state: Arc<AppState>, mut shutdown: tokio::sync::watch::Receiver<()>) {
    // Mark initial value as seen so changed() waits for actual shutdown signal
    let _ = *shutdown.borrow_and_update();

    let mut interval = time::interval(Duration::from_secs(30));
    let client = reqwest::Client::new();

    loop {
        tokio::select! {
            _ = interval.tick() => {
                if let Err(e) = send_heartbeat(&client, &state).await {
                    tracing::warn!("Heartbeat failed: {e}");
                }
            }
            _ = shutdown.changed() => {
                tracing::info!("Heartbeat task shutting down");
                return;
            }
        }
    }
}

async fn send_heartbeat(client: &reqwest::Client, state: &AppState) -> anyhow::Result<()> {
    let config = &state.config;
    let url = format!("{}/api/v1/nodes/heartbeat", config.panel.url.trim_end_matches('/'));
    let auth = format!("Bearer {}.{}", config.panel.token_id, config.panel.token);

    let (mem_total, mem_used) = read_memory_info();
    let (disk_total, disk_used) = read_disk_usage(&config.storage.data_dir);
    let cpu_usage = read_cpu_usage().await;

    // Get server states from Docker
    let server_states = match state.docker.client().list_containers(Some(
        bollard::container::ListContainersOptions::<String> {
            all: true,
            filters: [("label".to_string(), vec!["nexus.managed=true".to_string()])].into(),
            ..Default::default()
        },
    )).await {
        Ok(containers) => {
            containers.iter().filter_map(|c| {
                let uuid = c.labels.as_ref()?.get("nexus.server_uuid")?.clone();
                let state = c.state.clone().unwrap_or_else(|| "unknown".to_string());
                Some(ServerState { uuid, state })
            }).collect()
        }
        Err(e) => {
            tracing::warn!("Failed to list containers for heartbeat: {e}");
            Vec::new()
        }
    };

    let payload = HeartbeatPayload {
        version: env!("CARGO_PKG_VERSION").to_string(),
        total_memory: mem_total,
        used_memory: mem_used,
        total_disk: disk_total,
        used_disk: disk_used,
        cpu_percent: cpu_usage,
        servers: server_states,
    };

    client
        .post(&url)
        .header("Authorization", &auth)
        .json(&payload)
        .timeout(Duration::from_secs(10))
        .send()
        .await?;

    tracing::debug!("Heartbeat sent successfully");
    Ok(())
}

/// Parse /proc/meminfo for total and used memory (in bytes).
pub fn read_memory_info() -> (u64, u64) {
    let content = match std::fs::read_to_string("/proc/meminfo") {
        Ok(c) => c,
        Err(_) => return (0, 0),
    };

    let mut total_kb = 0u64;
    let mut available_kb = 0u64;

    for line in content.lines() {
        if let Some(val) = line.strip_prefix("MemTotal:") {
            total_kb = parse_meminfo_value(val);
        } else if let Some(val) = line.strip_prefix("MemAvailable:") {
            available_kb = parse_meminfo_value(val);
        }
    }

    let total = total_kb * 1024;
    let used = total.saturating_sub(available_kb * 1024);
    (total, used)
}

fn parse_meminfo_value(s: &str) -> u64 {
    s.split_whitespace()
        .next()
        .and_then(|v| v.parse().ok())
        .unwrap_or(0)
}

/// Get disk usage via statvfs for the data directory.
pub fn read_disk_usage(path: &str) -> (u64, u64) {
    match nix::sys::statvfs::statvfs(path) {
        Ok(stat) => {
            let total = stat.blocks() * stat.fragment_size();
            let free = stat.blocks_available() * stat.fragment_size();
            (total, total.saturating_sub(free))
        }
        Err(_) => (0, 0),
    }
}

/// Sample CPU usage from /proc/stat over a short interval.
pub async fn read_cpu_usage() -> f64 {
    let sample = || -> Option<(u64, u64)> {
        let content = std::fs::read_to_string("/proc/stat").ok()?;
        let cpu_line = content.lines().next()?;
        let vals: Vec<u64> = cpu_line
            .split_whitespace()
            .skip(1)
            .filter_map(|v| v.parse().ok())
            .collect();
        if vals.len() < 4 {
            return None;
        }
        let idle = vals[3];
        let total: u64 = vals.iter().sum();
        Some((idle, total))
    };

    let Some((idle1, total1)) = sample() else {
        return 0.0;
    };
    tokio::time::sleep(Duration::from_millis(100)).await;
    let Some((idle2, total2)) = sample() else {
        return 0.0;
    };

    let idle_delta = idle2.saturating_sub(idle1) as f64;
    let total_delta = total2.saturating_sub(total1) as f64;
    if total_delta == 0.0 {
        return 0.0;
    }
    ((total_delta - idle_delta) / total_delta) * 100.0
}
