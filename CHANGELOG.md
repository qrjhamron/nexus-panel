# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2025-02-17

### Added

- **gRPC communication** — Panel-to-Wings control operations now use gRPC/Protobuf instead of REST/JSON
- **Event-driven architecture** — real-time server state updates via EventEmitter and SSE
- **In-memory caching** — server stats and state cached in memory, no DB writes for heartbeat data
- **Bidirectional event streaming** — gRPC EventStream RPC for real-time server events
- **Static musl binary** — Wings compiles to a ~10MB statically-linked binary that runs on any Linux
- **Unified installer script** — single `install.sh` for both Panel and Wings installation
- **Persistent server config registry** — Wings survives restarts without losing server configurations
- **Per-UUID mutex** — prevents concurrent power actions on the same server
- **Background power actions** — stop/restart/kill run asynchronously to avoid gRPC deadline timeouts
- **Architecture detection** — installer auto-detects amd64/arm64 for Wings binary download
- **RHEL support** — installer now supports CentOS, Rocky Linux, and Alma Linux 8/9
- **AuthUser type** — properly typed `@CurrentUser()` decorator replacing `any` annotations

### Changed

- Wings gRPC server runs on `api.port + 1` (default 8081) alongside HTTP on 8080
- Panel `WingsService` completely rewritten from HTTP client to gRPC client
- Wings Dockerfile rewritten for Alpine-based multi-stage musl build
- Release workflow uses Docker-based Alpine builds instead of cross-compilation
- tokio runtime uses custom 8MB thread stack for musl compatibility
- reqwest switched from `native-tls` to `rustls-tls` for musl compatibility

### Fixed

- Server start fails after Wings restart (container recreation from persistent config)
- Wings binary SEGFAULT on musl cross-compilation (switched to native Alpine build)
- Missing `JWT_REFRESH_SECRET` in CI environment
- Missing `protoc` in Wings CI job
- ESLint flat config migration issues in CI
- Frontend test snapshot mismatches in CI
- `#[allow(dead_code)]` on actively-used `ResourceUpdate` struct

### Removed

- REST-based Panel-to-Wings communication for control operations (file ops remain HTTP)
- `native-tls` dependency in Wings (replaced by `rustls-tls`)

## [0.1.0] - 2025-02-14

### Added

- Initial release with Panel (NestJS + React) and Wings (Rust + Axum)
- Docker-based game server management
- Egg system for customizable server definitions
- Real-time console via WebSocket
- File manager with upload/download support
- User management with role-based access control
- REST API with JWT authentication
- Schedule system for automated tasks
- Resource limits (CPU, memory, disk)
