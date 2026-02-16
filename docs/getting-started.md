# Getting Started

This guide walks you through installing and running Nexus Panel and Wings from scratch.

## System Requirements

### Panel

| Resource   | Minimum        | Recommended     |
|------------|---------------|-----------------|
| CPU        | 1 core        | 2+ cores        |
| RAM        | 1 GB          | 2+ GB           |
| Disk       | 5 GB          | 20+ GB          |
| OS         | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| Node.js    | 20.x          | 20.x LTS        |
| PostgreSQL | 16            | 16              |

### Wings (each node)

| Resource   | Minimum        | Recommended     |
|------------|---------------|-----------------|
| CPU        | 2 cores       | 4+ cores        |
| RAM        | 2 GB (+ server RAM) | 4+ GB    |
| Disk       | 20 GB         | depends on servers |
| OS         | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| Docker     | 20.x          | latest stable    |

## Installing PostgreSQL

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y postgresql-16

# Create the nexus database and user
sudo -u postgres psql <<SQL
CREATE USER nexus WITH PASSWORD 'your-secure-password';
CREATE DATABASE nexus OWNER nexus;
SQL
```

## Running the Panel (Development)

```bash
# Clone and enter the repository
git clone https://github.com/YOUR_ORG/nexus.git
cd nexus

# Install Node.js dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and a strong JWT_SECRET

# Start in development mode
npm run dev
```

The backend API will be available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

### Running with Docker Compose

```bash
docker compose up -d
```

This starts PostgreSQL, the Panel backend, the frontend, and a Wings instance.

## Installing Docker on a Node

Wings requires Docker to manage game server containers.

```bash
# Install Docker using the official convenience script
curl -fsSL https://get.docker.com | bash

# Enable and start Docker
sudo systemctl enable --now docker

# Verify
docker info
```

## Running Wings

### Option A: Using the install script

```bash
sudo bash scripts/install-wings.sh
```

The script will:

1. Verify Docker is installed and running
2. Download the Wings binary
3. Install a systemd service
4. Prompt for your Panel URL and authentication token
5. Start the Wings daemon

### Option B: From source

```bash
cd wings
cargo build --release
sudo cp target/release/nexus-wings /usr/local/bin/

# Create configuration
sudo mkdir -p /etc/nexus-wings
sudo cp scripts/nexus-wings.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexus-wings
```

## Connecting the First Node

1. Log in to the Panel web interface.
2. Navigate to **Admin → Nodes → Create Node**.
3. Enter the node's FQDN or IP address and the Wings port (default `8080`).
4. Copy the generated authentication token.
5. On the node, run the install script and paste the token when prompted.
6. The node should appear as **Online** in the Panel within a few seconds.

## Creating the First Server

1. Ensure at least one node is connected and online.
2. Go to **Admin → Servers → Create Server**.
3. Select a node, choose an Egg (e.g., Minecraft, Rust, etc.), and configure resource limits.
4. Click **Create** — Wings will pull the Docker image, run the install script, and start the server.
5. The server console is available immediately via the web interface.
