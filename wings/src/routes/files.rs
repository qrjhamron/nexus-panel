use std::path::Path;
use std::sync::Arc;

use axum::extract::{Multipart, Path as AxumPath, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::WingsError;
use crate::files as file_ops;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct PathQuery {
    pub path: Option<String>,
}

#[derive(Deserialize)]
pub struct WriteRequest {
    pub path: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct DirectoryRequest {
    pub path: String,
}

#[derive(Deserialize)]
pub struct RenameRequest {
    pub from: String,
    pub to: String,
}

#[derive(Deserialize)]
pub struct DeleteRequest {
    pub paths: Vec<String>,
}

#[derive(Deserialize)]
pub struct CompressRequest {
    pub paths: Vec<String>,
    pub destination: String,
}

#[derive(Deserialize)]
pub struct DecompressRequest {
    pub path: String,
    pub destination: String,
}

#[derive(Serialize)]
pub struct FileListResponse {
    pub files: Vec<file_ops::FileEntry>,
}

fn server_root(state: &AppState, uuid: &str) -> std::path::PathBuf {
    Path::new(&state.config.storage.data_dir).join(uuid)
}

pub async fn list_files(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Query(query): Query<PathQuery>,
) -> Result<Json<FileListResponse>, WingsError> {
    let root = server_root(&state, &uuid);
    let requested = query.path.as_deref().unwrap_or("/");
    let path = file_ops::validate_path(&root, requested)?;
    let files = file_ops::list_directory(&path)?;
    Ok(Json(FileListResponse { files }))
}

pub async fn read_file(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Query(query): Query<PathQuery>,
) -> Result<String, WingsError> {
    let root = server_root(&state, &uuid);
    let requested = query.path.as_deref().unwrap_or("/");
    let path = file_ops::validate_path(&root, requested)?;
    file_ops::read_file(&path)
}

pub async fn write_file(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<WriteRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);
    let path = file_ops::validate_path(&root, &body.path)?;
    file_ops::write_file(&path, &body.content)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn create_directory(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<DirectoryRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);
    let path = file_ops::validate_path(&root, &body.path)?;
    file_ops::create_directory(&path)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn rename_file(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<RenameRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);
    let from = file_ops::validate_path(&root, &body.from)?;
    let to = file_ops::validate_path(&root, &body.to)?;
    file_ops::rename_entry(&from, &to)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn delete_files(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<DeleteRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);
    let paths: Vec<std::path::PathBuf> = body
        .paths
        .iter()
        .map(|p| file_ops::validate_path(&root, p))
        .collect::<Result<Vec<_>, _>>()?;
    file_ops::delete_entries(&paths)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn compress_files(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<CompressRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);
    let paths: Vec<std::path::PathBuf> = body
        .paths
        .iter()
        .map(|p| file_ops::validate_path(&root, p))
        .collect::<Result<Vec<_>, _>>()?;
    let dest = file_ops::validate_path(&root, &body.destination)?;
    file_ops::compress(&paths, &dest)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn decompress_file(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    Json(body): Json<DecompressRequest>,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);
    let archive = file_ops::validate_path(&root, &body.path)?;
    let dest = file_ops::validate_path(&root, &body.destination)?;
    file_ops::decompress(&archive, &dest)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn upload_file(
    State(state): State<Arc<AppState>>,
    AxumPath(uuid): AxumPath<String>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, WingsError> {
    let root = server_root(&state, &uuid);

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
    })? {
        let file_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "upload".to_string());
        let path = file_ops::validate_path(&root, &file_name)?;
        let data = field.bytes().await.map_err(|e| {
            WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
        })?;
        std::fs::write(&path, &data).map_err(WingsError::Io)?;
    }

    Ok(Json(serde_json::json!({ "success": true })))
}
