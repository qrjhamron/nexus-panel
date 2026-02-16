use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::error::WingsError;

const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: DateTime<Utc>,
    pub mime_type: String,
}

/// Validates and resolves a requested path to ensure it stays within server_root.
pub fn validate_path(server_root: &Path, requested_path: &str) -> Result<PathBuf, WingsError> {
    let clean = requested_path.trim_start_matches('/');
    let joined = server_root.join(clean);
    let canonical_root = server_root
        .canonicalize()
        .map_err(|_| WingsError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Server root does not exist",
        )))?;

    // For non-existent paths, check parent
    let canonical = if joined.exists() {
        joined.canonicalize().map_err(WingsError::Io)?
    } else {
        let parent = joined
            .parent()
            .ok_or(WingsError::PathTraversal)?
            .canonicalize()
            .map_err(WingsError::Io)?;
        if !parent.starts_with(&canonical_root) {
            return Err(WingsError::PathTraversal);
        }
        parent.join(joined.file_name().ok_or(WingsError::PathTraversal)?)
    };

    if !canonical.starts_with(&canonical_root) {
        return Err(WingsError::PathTraversal);
    }

    Ok(canonical)
}

pub fn list_directory(path: &Path) -> Result<Vec<FileEntry>, WingsError> {
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(path).map_err(WingsError::Io)? {
        let entry = entry.map_err(WingsError::Io)?;
        let metadata = entry.metadata().map_err(WingsError::Io)?;
        let name = entry.file_name().to_string_lossy().to_string();
        let modified: DateTime<Utc> = metadata
            .modified()
            .map_err(WingsError::Io)?
            .into();
        let mime = if metadata.is_dir() {
            "directory".to_string()
        } else {
            mime_guess::from_path(&name)
                .first_or_octet_stream()
                .to_string()
        };
        entries.push(FileEntry {
            name,
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified,
            mime_type: mime,
        });
    }
    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

pub fn read_file(path: &Path) -> Result<String, WingsError> {
    let metadata = std::fs::metadata(path).map_err(WingsError::Io)?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err(WingsError::FileTooLarge);
    }
    std::fs::read_to_string(path).map_err(WingsError::Io)
}

pub fn write_file(path: &Path, content: &str) -> Result<(), WingsError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(WingsError::Io)?;
    }
    std::fs::write(path, content).map_err(WingsError::Io)
}

pub fn create_directory(path: &Path) -> Result<(), WingsError> {
    std::fs::create_dir_all(path).map_err(WingsError::Io)
}

pub fn rename_entry(from: &Path, to: &Path) -> Result<(), WingsError> {
    std::fs::rename(from, to).map_err(WingsError::Io)
}

pub fn delete_entries(paths: &[PathBuf]) -> Result<(), WingsError> {
    for path in paths {
        if path.is_dir() {
            std::fs::remove_dir_all(path).map_err(WingsError::Io)?;
        } else {
            std::fs::remove_file(path).map_err(WingsError::Io)?;
        }
    }
    Ok(())
}

pub fn compress(paths: &[PathBuf], dest: &Path) -> Result<(), WingsError> {
    let file = std::fs::File::create(dest).map_err(WingsError::Io)?;
    let mut zip_writer = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for path in paths {
        if path.is_dir() {
            for entry in walkdir::WalkDir::new(path) {
                let entry = entry.map_err(|e| {
                    WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
                })?;
                let entry_path = entry.path();
                let name = entry_path
                    .strip_prefix(path.parent().unwrap_or(path))
                    .unwrap_or(entry_path)
                    .to_string_lossy()
                    .to_string();
                if entry_path.is_dir() {
                    zip_writer.add_directory(&name, options).map_err(|e| {
                        WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
                    })?;
                } else {
                    zip_writer.start_file(&name, options).map_err(|e| {
                        WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
                    })?;
                    let mut f = std::fs::File::open(entry_path).map_err(WingsError::Io)?;
                    let mut buf = Vec::new();
                    f.read_to_end(&mut buf).map_err(WingsError::Io)?;
                    zip_writer.write_all(&buf).map_err(WingsError::Io)?;
                }
            }
        } else {
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            zip_writer.start_file(&name, options).map_err(|e| {
                WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;
            let mut f = std::fs::File::open(path).map_err(WingsError::Io)?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf).map_err(WingsError::Io)?;
            zip_writer.write_all(&buf).map_err(WingsError::Io)?;
        }
    }

    zip_writer.finish().map_err(|e| {
        WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
    })?;
    Ok(())
}

pub fn decompress(archive: &Path, dest: &Path) -> Result<(), WingsError> {
    let extension = archive
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    match extension {
        "zip" => {
            let file = std::fs::File::open(archive).map_err(WingsError::Io)?;
            let mut zip = zip::ZipArchive::new(file).map_err(|e| {
                WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;
            zip.extract(dest).map_err(|e| {
                WingsError::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;
        }
        "gz" | "tgz" => {
            let file = std::fs::File::open(archive).map_err(WingsError::Io)?;
            let gz = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(gz);
            archive.unpack(dest).map_err(WingsError::Io)?;
        }
        _ => {
            return Err(WingsError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Unsupported archive format: {extension}"),
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_validate_path_rejects_traversal() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();

        let result = validate_path(root, "../../etc/passwd");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_accepts_valid_paths() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();

        // Create the file so canonicalize works
        std::fs::write(root.join("test.txt"), "hello").unwrap();

        let result = validate_path(root, "test.txt");
        assert!(result.is_ok());
        assert!(result.unwrap().ends_with("test.txt"));
    }

    #[test]
    fn test_list_directory() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();

        std::fs::write(root.join("file1.txt"), "content").unwrap();
        std::fs::write(root.join("file2.log"), "data").unwrap();
        std::fs::create_dir(root.join("subdir")).unwrap();

        let entries = list_directory(root).unwrap();
        assert_eq!(entries.len(), 3);
        // Directories should come first
        assert!(entries[0].is_directory);
        assert_eq!(entries[0].name, "subdir");
    }

    #[test]
    fn test_write_file_and_read_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");

        write_file(&path, "hello world").unwrap();
        let content = read_file(&path).unwrap();
        assert_eq!(content, "hello world");
    }

    #[test]
    fn test_create_directory() {
        let dir = TempDir::new().unwrap();
        let new_dir = dir.path().join("a/b/c");

        create_directory(&new_dir).unwrap();
        assert!(new_dir.exists());
        assert!(new_dir.is_dir());
    }
}
