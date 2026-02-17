# Nexus Panel

> Modern, open-source game server management panel built with TypeScript, React, NestJS, and Rust.

Nexus Panel provides a beautiful web interface for managing game servers across multiple machines. It consists of two main components: the **Panel** (central control plane) and **Wings** (per-node daemon communicating over gRPC).

---

## Features

- **Multi-node architecture** — manage servers across any number of machines from a single dashboard
- **gRPC communication** — fast, type-safe Panel-to-Wings communication via Protocol Buffers
- **Docker-based isolation** — every game server runs in its own container
- **Egg system** — fully customizable server definitions (install scripts, configuration, startup commands)
- **Real-time console** — live WebSocket-powered server console with command input
- **File manager** — browse, edit, upload, and download server files from the browser
- **User management** — role-based access control with fine-grained permissions
- **API-first** — comprehensive REST API with JWT and API key authentication
- **Resource limits** — CPU, memory, disk, and network controls per server
- **Schedules & tasks** — cron-based task scheduling for backups, restarts, and commands
- **Event-driven architecture** — real-time state updates via SSE with in-memory caching
- **Static binary Wings** — single 10MB binary, runs on any Linux (musl-linked)
- **Modern stack** — TypeScript, React, NestJS, Rust

## Architecture

```
┌─────────────────────────────────────────┐
│              Nexus Panel                │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ Frontend │  │  Backend (API)     │   │
│  │ React/TS │──│  NestJS / Node.js  │   │
│  └──────────┘  └────────┬───────────┘   │
│                         │               │
│                    PostgreSQL            │
└─────────────────────┬───────────────────┘
                      │ gRPC / HTTPS
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Wings  │  │  Wings  │  │  Wings  │
   │ (node1) │  │ (node2) │  │ (node3) │
   │  Rust   │  │  Rust   │  │  Rust   │
   └─────────┘  └─────────┘  └─────────┘
```

**Panel** — Central web application storing configuration, users, and server metadata in PostgreSQL. Communicates with Wings daemons over gRPC for control operations and HTTPS for file transfers.

**Wings** — Lightweight Rust daemon (~10MB static binary) installed on each node. Manages Docker containers, streams console output, handles file operations, and reports resource usage via heartbeat.

## Quick Start

### 1. Install the Panel

```bash
curl -sSL https://raw.githubusercontent.com/qrjhamron/nexus-panel/main/install.sh | sudo bash -s panel
```

### 2. Add a Node (Wings)

```bash
curl -sSL https://raw.githubusercontent.com/qrjhamron/nexus-panel/main/install.sh | sudo bash -s wings
```

### 3. Deploy a Server

Log in to the Panel, go to Admin → Nodes → Create Node, then create a server from the dashboard.

## Installation

### Unified Installer

The installer supports both Panel and Wings installation:

```bash
# Interactive mode — choose what to install
bash install.sh

# Install Panel
bash install.sh panel

# Install Wings
bash install.sh wings
```

### Download Wings Binary

Pre-built static binaries are available from [GitHub Releases](https://github.com/qrjhamron/nexus-panel/releases/latest):

| Platform | Download |
|----------|----------|
| Linux x86_64 | [wings_linux_amd64](https://github.com/qrjhamron/nexus-panel/releases/latest/download/wings_linux_amd64) |
| Linux ARM64 | [wings_linux_arm64](https://github.com/qrjhamron/nexus-panel/releases/latest/download/wings_linux_arm64) |

```bash
# Download and install manually
curl -Lo /usr/local/bin/nexus-wings \
  https://github.com/qrjhamron/nexus-panel/releases/latest/download/wings_linux_amd64
chmod +x /usr/local/bin/nexus-wings
```

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Panel** | 1 CPU, 1GB RAM, 10GB disk | 2 CPU, 2GB RAM, 20GB disk |
| **Wings** | 1 CPU, 1GB RAM, 20GB disk | 2+ CPU, 4GB+ RAM, 50GB+ disk |

**Supported OS:** Ubuntu 20.04+, Debian 11+, RHEL/CentOS/Rocky/Alma 8+

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL 16
- Rust >= 1.83 (for Wings)
- Docker (for Wings runtime)
- protoc (Protocol Buffers compiler, for Wings build)

### Panel & Frontend

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start the backend and frontend in dev mode
npm run dev
```

### Wings

```bash
cd wings
cargo run
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend  | React, TypeScript, Vite, Material UI, Zustand |
| Backend   | NestJS, TypeScript, TypeORM |
| Database  | PostgreSQL 16 |
| Wings     | Rust, Axum, Tonic (gRPC), Bollard (Docker API) |
| Protocol  | gRPC / Protocol Buffers |
| CI/CD     | GitHub Actions |
| Containers| Docker |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
