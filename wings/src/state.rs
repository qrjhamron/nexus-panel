use std::collections::HashMap;
use std::sync::Arc;

use crate::config::Config;
use crate::console::ConsoleBuffer;
use crate::docker::{DockerManager, ServerConfig};

pub struct AppState {
    pub config: Config,
    pub docker: DockerManager,
    pub console_buffers: Arc<tokio::sync::RwLock<HashMap<String, ConsoleBuffer>>>,
    /// Persistent server config registry — survives Wings restart via disk serialization
    server_configs: Arc<tokio::sync::RwLock<HashMap<String, ServerConfig>>>,
}

impl AppState {
    pub fn new(config: Config, docker: DockerManager) -> Self {
        // Load persisted server configs from disk
        let configs = Self::load_configs(&config.storage.data_dir);
        Self {
            config,
            docker,
            console_buffers: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            server_configs: Arc::new(tokio::sync::RwLock::new(configs)),
        }
    }

    pub async fn get_or_create_buffer(&self, uuid: &str) -> ConsoleBuffer {
        let mut buffers = self.console_buffers.write().await;
        buffers
            .entry(uuid.to_string())
            .or_insert_with(ConsoleBuffer::new)
            .clone()
    }

    pub async fn store_server_config(&self, config: &ServerConfig) {
        let mut configs = self.server_configs.write().await;
        configs.insert(config.uuid.clone(), config.clone());
        // Persist to disk
        Self::persist_config(&self.config.storage.data_dir, &config.uuid, config);
    }

    pub async fn get_server_config(&self, uuid: &str) -> Option<ServerConfig> {
        let configs = self.server_configs.read().await;
        configs.get(uuid).cloned()
    }

    pub async fn remove_server_config(&self, uuid: &str) {
        let mut configs = self.server_configs.write().await;
        configs.remove(uuid);
        // Remove persisted config
        let path = std::path::Path::new(&self.config.storage.data_dir)
            .join(uuid)
            .join(".nexus-config.json");
        let _ = std::fs::remove_file(path);
    }

    fn persist_config(data_dir: &str, uuid: &str, config: &ServerConfig) {
        let dir = std::path::Path::new(data_dir).join(uuid);
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join(".nexus-config.json");
        if let Ok(json) = serde_json::to_string_pretty(config) {
            let _ = std::fs::write(path, json);
        }
    }

    fn load_configs(data_dir: &str) -> HashMap<String, ServerConfig> {
        let mut configs = HashMap::new();
        let data_path = std::path::Path::new(data_dir);
        if !data_path.exists() {
            return configs;
        }
        if let Ok(entries) = std::fs::read_dir(data_path) {
            for entry in entries.flatten() {
                let config_path = entry.path().join(".nexus-config.json");
                if config_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&config_path) {
                        if let Ok(config) = serde_json::from_str::<ServerConfig>(&content) {
                            configs.insert(config.uuid.clone(), config);
                        }
                    }
                }
            }
        }
        configs
    }
}
