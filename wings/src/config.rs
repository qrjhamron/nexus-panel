use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::error::WingsError;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub panel: PanelConfig,
    pub api: ApiConfig,
    pub docker: DockerConfig,
    pub storage: StorageConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PanelConfig {
    pub url: String,
    #[serde(default)]
    pub token_id: String,
    pub token: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ApiConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    pub tls_cert: Option<String>,
    pub tls_key: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DockerConfig {
    #[serde(default = "default_socket")]
    pub socket: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct StorageConfig {
    #[serde(default = "default_data_dir")]
    pub data_dir: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct LoggingConfig {
    #[serde(default = "default_log_level")]
    pub level: String,
    pub file: Option<String>,
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}
fn default_port() -> u16 {
    8080
}
fn default_socket() -> String {
    "/var/run/docker.sock".to_string()
}
fn default_data_dir() -> String {
    "/var/lib/nexus-wings/data".to_string()
}
fn default_log_level() -> String {
    "info".to_string()
}

impl Config {
    pub fn load(path: &Path) -> Result<Self, WingsError> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| WingsError::Config(format!("Failed to read config file: {e}")))?;
        let config: Config = toml::from_str(&content)
            .map_err(|e| WingsError::Config(format!("Failed to parse config: {e}")))?;
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_values() {
        assert_eq!(default_host(), "0.0.0.0");
        assert_eq!(default_port(), 8080);
        assert_eq!(default_socket(), "/var/run/docker.sock");
        assert_eq!(default_data_dir(), "/var/lib/nexus-wings/data");
        assert_eq!(default_log_level(), "info");
    }

    #[test]
    fn test_parse_config_from_toml_string() {
        let toml_str = r#"
[panel]
url = "https://panel.example.com"
token_id = "tid-123"
token = "my-secret-token"

[api]
host = "127.0.0.1"
port = 9090

[docker]
socket = "/var/run/docker.sock"

[storage]
data_dir = "/data"

[logging]
level = "debug"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();

        assert_eq!(config.panel.url, "https://panel.example.com");
        assert_eq!(config.panel.token_id, "tid-123");
        assert_eq!(config.panel.token, "my-secret-token");
        assert_eq!(config.api.host, "127.0.0.1");
        assert_eq!(config.api.port, 9090);
        assert_eq!(config.docker.socket, "/var/run/docker.sock");
        assert_eq!(config.storage.data_dir, "/data");
        assert_eq!(config.logging.level, "debug");
    }

    #[test]
    fn test_parse_config_with_defaults() {
        let toml_str = r#"
[panel]
url = "https://panel.example.com"
token = "token123"

[api]

[docker]

[storage]

[logging]
"#;
        let config: Config = toml::from_str(toml_str).unwrap();

        assert_eq!(config.api.host, "0.0.0.0");
        assert_eq!(config.api.port, 8080);
        assert_eq!(config.docker.socket, "/var/run/docker.sock");
        assert_eq!(config.storage.data_dir, "/var/lib/nexus-wings/data");
        assert_eq!(config.logging.level, "info");
    }
}
