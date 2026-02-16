use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum WingsError {
    #[error("Docker error: {0}")]
    Docker(#[from] bollard::errors::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Path traversal detected")]
    PathTraversal,
    #[error("Server not found: {0}")]
    ServerNotFound(String),
    #[error("File too large")]
    FileTooLarge,
    #[error("Configuration error: {0}")]
    Config(String),
    #[error("Authentication failed")]
    AuthFailed,
}

impl IntoResponse for WingsError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            WingsError::Docker(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            WingsError::Io(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            WingsError::PathTraversal => (StatusCode::FORBIDDEN, self.to_string()),
            WingsError::ServerNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            WingsError::FileTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, self.to_string()),
            WingsError::Config(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            WingsError::AuthFailed => (StatusCode::UNAUTHORIZED, self.to_string()),
        };

        let body = json!({ "error": message });
        (status, axum::Json(body)).into_response()
    }
}
