# Architecture

Nexus follows a **Panel + Wings** split architecture, separating the control plane from the data plane.

## Overview

```
                    ┌────────────────────────┐
                    │       Nexus Panel       │
                    │                        │
Users ──────────▶  │  Frontend  ◀──▶  API   │
                    │  (React)      (NestJS) │
                    │                  │     │
                    │             PostgreSQL  │
                    └──────────────┬─────────┘
                                   │
                          Authenticated HTTPS
                          + WebSocket
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        ┌───────────┐       ┌───────────┐       ┌───────────┐
        │   Wings   │       │   Wings   │       │   Wings   │
        │  (Rust)   │       │  (Rust)   │       │  (Rust)   │
        │           │       │           │       │           │
        │  Docker   │       │  Docker   │       │  Docker   │
        │ ┌──┐ ┌──┐ │       │ ┌──┐ ┌──┐ │       │ ┌──┐      │
        │ │S1│ │S2│ │       │ │S3│ │S4│ │       │ │S5│      │
        │ └──┘ └──┘ │       │ └──┘ └──┘ │       │ └──┘      │
        └───────────┘       └───────────┘       └───────────┘
```

## Panel

The Panel is the central web application that users interact with. It is responsible for:

- **User authentication and authorization** (JWT-based sessions, API keys)
- **Server metadata storage** (names, resource limits, assigned nodes, environment variables)
- **Node registry** — tracking which Wings daemons are available
- **Egg definitions** — storing the templates that describe how to install and run each type of server
- **Scheduling** — cron-based tasks for backups, restarts, and commands
- **API surface** — RESTful API consumed by the frontend and external integrations

All persistent state lives in **PostgreSQL**.

### Frontend

A single-page React application built with Vite and TailwindCSS. Communicates exclusively with the backend API (never directly with Wings).

### Backend

A NestJS application exposing a versioned REST API (`/api/v1/...`). Handles business logic, proxies console WebSocket connections to Wings, and manages database migrations via TypeORM.

## Wings

Wings is a lightweight daemon written in Rust using the Axum web framework. One instance runs on each physical or virtual machine ("node") that hosts game servers.

### Responsibilities

- **Docker container management** — creating, starting, stopping, and deleting containers via the Bollard Docker API client.
- **Console streaming** — attaching to container stdout/stderr and streaming output to the Panel over WebSocket.
- **File management** — listing, reading, writing, compressing, and decompressing files inside server data directories.
- **Resource monitoring** — collecting CPU, memory, disk, and network metrics from Docker stats.
- **Install scripts** — running Egg-defined install scripts inside ephemeral containers to set up server files.

### Communication Protocol

Wings exposes an HTTP/WebSocket API secured by a shared token generated when a node is created in the Panel.

| Endpoint Pattern           | Method | Description                       |
|----------------------------|--------|-----------------------------------|
| `/api/servers`             | GET    | List servers on this node         |
| `/api/servers/:id/power`   | POST   | Start / stop / restart / kill     |
| `/api/servers/:id/console` | WS     | Real-time console stream          |
| `/api/servers/:id/files`   | GET    | List directory contents           |
| `/api/servers/:id/files/*` | GET/PUT| Read / write files                |
| `/api/system`              | GET    | Node resource usage               |

All requests must include the `Authorization: Bearer <token>` header.

## Egg System

An **Egg** is a JSON template that describes how to install and run a particular type of server (e.g., Minecraft Java, CS2, Rust).

Each Egg defines:

- **Docker image** — the base container image
- **Startup command** — the command used to launch the server
- **Environment variables** — configurable values exposed in the Panel UI
- **Install script** — a Bash script run inside an install container to download and set up server files
- **Configuration files** — file parsers that let users edit config values from the Panel

See [Egg Development](egg-development.md) for details on creating custom Eggs.

## Docker Container Mapping

Each game server gets its own Docker container:

```
Container: nexus-server-<uuid>
├── Image:   defined by Egg (e.g., ghcr.io/nexus/yolks:java_21)
├── Network: nexus_network (bridge)
├── Volumes:
│   └── /home/container → /var/lib/nexus-wings/data/<uuid>
├── CPU:     limited by server config
├── Memory:  limited by server config
└── Ports:   mapped from allocation
```

## Database Schema Overview

| Table           | Description                                      |
|-----------------|--------------------------------------------------|
| `users`         | User accounts, passwords, roles                  |
| `servers`       | Server metadata, resource limits, environment     |
| `nodes`         | Registered Wings nodes, FQDN, token              |
| `eggs`          | Server type templates                             |
| `nests`         | Egg groupings / categories                        |
| `allocations`   | IP:port pairs assigned to nodes                   |
| `api_keys`      | User and application API keys                     |
| `schedules`     | Scheduled tasks per server                        |
| `tasks`         | Individual actions within a schedule              |
| `audit_logs`    | Action audit trail                                |

Migrations are managed by TypeORM and run automatically on Panel startup.
