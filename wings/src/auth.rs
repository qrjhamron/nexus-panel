use axum::extract::Request;
use axum::http::header::AUTHORIZATION;
use axum::middleware::Next;
use axum::response::Response;

use crate::error::WingsError;

pub async fn auth_middleware(request: Request, next: Next) -> Result<Response, WingsError> {
    let config = request
        .extensions()
        .get::<crate::config::Config>()
        .cloned()
        .ok_or(WingsError::Config("Missing config in extensions".into()))?;

    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(WingsError::AuthFailed)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(WingsError::AuthFailed)?;

    if token != config.panel.token {
        return Err(WingsError::AuthFailed);
    }

    Ok(next.run(request).await)
}
