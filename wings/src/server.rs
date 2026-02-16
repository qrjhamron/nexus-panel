use std::sync::Arc;

use axum::extract::Request;
use axum::middleware::{self, Next};
use axum::response::Response;
use axum::routing::{delete, get, post, put};
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::auth::auth_middleware;
use crate::routes;
use crate::state::AppState;

/// Middleware that injects the Config into request extensions for the auth middleware.
async fn inject_config(
    state: axum::extract::State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Response {
    request.extensions_mut().insert(state.config.clone());
    next.run(request).await
}

pub fn build_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Public routes (no auth)
    let public_routes = Router::new()
        .route("/api/health", get(routes::system::health));

    // Authenticated routes
    let protected_routes = Router::new()
        // System
        .route("/api/system", get(routes::system::system_info))
        // Servers
        .route("/api/servers", post(routes::servers::create_server))
        .route("/api/servers/{uuid}", delete(routes::servers::delete_server))
        .route(
            "/api/servers/{uuid}/power",
            post(routes::servers::power_action),
        )
        .route(
            "/api/servers/{uuid}/command",
            post(routes::servers::send_command),
        )
        .route(
            "/api/servers/{uuid}/resources",
            put(routes::servers::update_resources),
        )
        .route(
            "/api/servers/{uuid}/status",
            get(routes::servers::get_status),
        )
        .route(
            "/api/servers/{uuid}/install",
            post(routes::servers::install_server),
        )
        // Files
        .route(
            "/api/servers/{uuid}/files",
            get(routes::files::list_files),
        )
        .route(
            "/api/servers/{uuid}/files/read",
            get(routes::files::read_file),
        )
        .route(
            "/api/servers/{uuid}/files/write",
            post(routes::files::write_file),
        )
        .route(
            "/api/servers/{uuid}/files/directory",
            post(routes::files::create_directory),
        )
        .route(
            "/api/servers/{uuid}/files/rename",
            post(routes::files::rename_file),
        )
        .route(
            "/api/servers/{uuid}/files/delete",
            post(routes::files::delete_files),
        )
        .route(
            "/api/servers/{uuid}/files/compress",
            post(routes::files::compress_files),
        )
        .route(
            "/api/servers/{uuid}/files/decompress",
            post(routes::files::decompress_file),
        )
        .route(
            "/api/servers/{uuid}/files/upload",
            post(routes::files::upload_file),
        )
        .layer(middleware::from_fn(auth_middleware))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            inject_config,
        ));

    // WebSocket routes (auth via query param)
    let ws_routes = Router::new().route(
        "/api/servers/{uuid}/ws",
        get(routes::ws::ws_handler),
    );

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(ws_routes)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}
