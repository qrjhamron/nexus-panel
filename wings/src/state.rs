use std::collections::HashMap;
use std::sync::Arc;

use crate::config::Config;
use crate::console::ConsoleBuffer;
use crate::docker::DockerManager;

pub struct AppState {
    pub config: Config,
    pub docker: DockerManager,
    pub console_buffers: Arc<tokio::sync::RwLock<HashMap<String, ConsoleBuffer>>>,
}

impl AppState {
    pub fn new(config: Config, docker: DockerManager) -> Self {
        Self {
            config,
            docker,
            console_buffers: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    pub async fn get_or_create_buffer(&self, uuid: &str) -> ConsoleBuffer {
        let mut buffers = self.console_buffers.write().await;
        buffers
            .entry(uuid.to_string())
            .or_insert_with(ConsoleBuffer::new)
            .clone()
    }
}
