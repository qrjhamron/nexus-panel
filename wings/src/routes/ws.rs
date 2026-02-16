use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path as AxumPath, Query, State};
use axum::response::IntoResponse;
use futures_util::stream::StreamExt;
use futures_util::SinkExt;
use serde::Deserialize;

use crate::error::WingsError;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct WsQuery {
    pub token: String,
}

pub async fn ws_handler(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Query(query): Query<WsQuery>,
    ws: WebSocketUpgrade,
) -> Result<impl IntoResponse, WingsError> {
    // Authenticate via query param token
    if query.token != state.config.panel.token {
        return Err(WingsError::AuthFailed);
    }

    let state = state.clone();
    let uuid = uuid.clone();

    Ok(ws.on_upgrade(move |socket| handle_ws(socket, state, uuid)))
}

async fn handle_ws(socket: WebSocket, state: Arc<AppState>, uuid: String) {
    let (mut ws_tx, mut ws_rx) = socket.split();

    // Replay console buffer
    let buffer = state.get_or_create_buffer(&uuid).await;
    for line in buffer.lines() {
        let msg = serde_json::json!({ "type": "console", "data": line });
        if ws_tx
            .send(Message::Text(msg.to_string().into()))
            .await
            .is_err()
        {
            return;
        }
    }

    // Spawn stats streaming task
    let stats_state = state.clone();
    let stats_uuid = uuid.clone();
    let (stats_tx, mut stats_rx) = tokio::sync::mpsc::channel::<String>(32);

    let stats_task = tokio::spawn(async move {
        let mut stream = stats_state.docker.stream_stats(&stats_uuid);
        while let Some(Ok(stats)) = stream.next().await {
            let msg = serde_json::json!({ "type": "stats", "data": stats });
            if stats_tx.send(msg.to_string()).await.is_err() {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }
    });

    // Spawn log streaming task
    let log_state = state.clone();
    let log_uuid = uuid.clone();
    let (log_tx, mut log_rx) = tokio::sync::mpsc::channel::<String>(128);

    let log_task = tokio::spawn(async move {
        let mut stream = log_state.docker.client().logs::<String>(
            &format!("nexus-{log_uuid}"),
            Some(bollard::container::LogsOptions {
                follow: true,
                stdout: true,
                stderr: true,
                ..Default::default()
            }),
        );
        while let Some(Ok(log)) = stream.next().await {
            let text = match log {
                bollard::container::LogOutput::StdOut { message } => {
                    String::from_utf8_lossy(&message).to_string()
                }
                bollard::container::LogOutput::StdErr { message } => {
                    String::from_utf8_lossy(&message).to_string()
                }
                _ => continue,
            };
            // Store in buffer
            let buffer = log_state.get_or_create_buffer(&log_uuid).await;
            buffer.push(text.clone());
            if log_tx.send(text).await.is_err() {
                break;
            }
        }
    });

    // Forward stats and logs to WebSocket
    let forward_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                Some(stats_msg) = stats_rx.recv() => {
                    if ws_tx.send(Message::Text(stats_msg.into())).await.is_err() {
                        break;
                    }
                }
                Some(log_line) = log_rx.recv() => {
                    let msg = serde_json::json!({ "type": "console", "data": log_line });
                    if ws_tx.send(Message::Text(msg.to_string().into())).await.is_err() {
                        break;
                    }
                }
                else => break,
            }
        }
    });

    // Read commands from WebSocket client
    while let Some(Ok(msg)) = ws_rx.next().await {
        if let Message::Text(text) = msg {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                if let Some(cmd) = parsed.get("command").and_then(|v| v.as_str()) {
                    let _ = state.docker.send_command(&uuid, cmd).await;
                }
            }
        }
    }

    // Clean up
    stats_task.abort();
    log_task.abort();
    forward_task.abort();
}
