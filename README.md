# Nexus Panel

> Modern, open-source game server management panel.

Nexus Panel provides a beautiful web interface for managing game servers across multiple machines. It consists of two main components: the **Panel** (central control plane) and **Wings** (per-node daemon).

---

## Features

- **Multi-node architecture** — manage servers across any number of machines from a single dashboard
- **Docker-based isolation** — every game server runs in its own container
- **Egg system** — fully customizable server definitions (install scripts, configuration, startup commands)
- **Real-time console** — live WebSocket-powered server console with command input
- **File manager** — browse, edit, upload, and download server files from the browser
- **User management** — role-based access control with fine-grained permissions
- **API-first** — comprehensive REST API with JWT and API key authentication
- **Resource limits** — CPU, memory, disk, and network controls per server
- **Schedules & tasks** — cron-based task scheduling for backups, restarts, and commands
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
                      │ HTTPS / WebSocket
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Wings  │  │  Wings  │  │  Wings  │
   │ (node1) │  │ (node2) │  │ (node3) │
   │  Rust   │  │  Rust   │  │  Rust   │
   └─────────┘  └─────────┘  └─────────┘
```

**Panel** — Central web application that stores all configuration, users, and server metadata in PostgreSQL. Communicates with Wings daemons over authenticated HTTPS/WebSocket connections.

**Wings** — Lightweight Rust daemon installed on each node. Manages Docker containers, streams console output, handles file operations, and reports resource usage back to the Panel.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/nexus.git
cd nexus

# Start everything with Docker Compose
docker compose up -d

# Panel:    http://localhost:3000
# Frontend: http://localhost:5173
# Wings:    http://localhost:8080
```

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL 16
- Rust >= 1.83 (for Wings)
- Docker (for Wings runtime)

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

See [docs/getting-started.md](docs/getting-started.md) for the full guide.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend  | React, TypeScript, Vite, TailwindCSS |
| Backend   | NestJS, TypeScript, TypeORM |
| Database  | PostgreSQL 16 |
| Wings     | Rust, Axum, Bollard (Docker API) |
| CI/CD     | GitHub Actions |
| Containers| Docker |

## Screenshots

> _Coming soon — screenshots of the dashboard, server console, and file manager._

## Documentation

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Wings Configuration](docs/wings-configuration.md)
- [Egg Development](docs/egg-development.md)
- [Contributing](docs/contributing.md)

## Contributing

Contributions are welcome! Please see [docs/contributing.md](docs/contributing.md) for guidelines.

## License

[MIT](LICENSE)
