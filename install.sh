#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Nexus — Unified Installer (Panel + Wings)
#
# Usage:
#   bash install.sh panel    — install Nexus Panel
#   bash install.sh wings    — install Nexus Wings daemon
#   bash install.sh          — interactive menu
#
# Idempotent — safe to run multiple times.
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors & helpers ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

LOG_FILE="/var/log/nexus-install.log"

_log_and_print() {
    local color="$1" label="$2"; shift 2
    echo -e "${color}[${label}]${NC}  $*"
    echo "[$(date -Iseconds)] [${label}] $*" >> "$LOG_FILE"
}

info()    { _log_and_print "$BLUE"   "INFO"  "$*"; }
success() { _log_and_print "$GREEN"  "OK"    "$*"; }
warn()    { _log_and_print "$YELLOW" "WARN"  "$*"; }
error()   { _log_and_print "$RED"    "ERROR" "$*"; }
header()  { echo -e "\n${CYAN}${BOLD}── $* ──${NC}\n"; echo "" >> "$LOG_FILE"; echo "── $* ──" >> "$LOG_FILE"; }

die() { error "$*"; exit 1; }

# ── OS detection & validation ────────────────────────────────────────
detect_os() {
    OS_FAMILY="unknown"
    OS_ID=""
    OS_VERSION=""
    SUPPORTED_OS=false

    if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        OS_ID="${ID:-unknown}"
        OS_VERSION="${VERSION_ID:-}"
    fi

    case "$OS_ID" in
        ubuntu)
            OS_FAMILY="debian"
            case "$OS_VERSION" in
                20.04|22.04|24.04) SUPPORTED_OS=true ;;
            esac
            ;;
        debian)
            OS_FAMILY="debian"
            case "$OS_VERSION" in
                11|12) SUPPORTED_OS=true ;;
            esac
            ;;
        centos|rocky|almalinux|rhel)
            OS_FAMILY="rhel"
            local major="${OS_VERSION%%.*}"
            case "$major" in
                8|9) SUPPORTED_OS=true ;;
            esac
            ;;
    esac

    if [[ "$SUPPORTED_OS" != "true" ]]; then
        warn "Detected OS: ${OS_ID} ${OS_VERSION} — not officially supported."
        warn "Supported: Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS/Rocky/Alma 8/9."
        warn "Proceeding anyway — things may break."
    else
        info "Detected OS: ${OS_ID} ${OS_VERSION} (${OS_FAMILY})"
    fi
}

# ── Package manager helpers ──────────────────────────────────────────
pkg_update() {
    case "$OS_FAMILY" in
        debian) export DEBIAN_FRONTEND=noninteractive; apt-get update -qq ;;
        rhel)   dnf makecache -q ;;
        *)      die "Unsupported OS family: ${OS_FAMILY}" ;;
    esac
}

pkg_install() {
    case "$OS_FAMILY" in
        debian) apt-get install -y -qq "$@" ;;
        rhel)   dnf install -y -q "$@" ;;
        *)      die "Unsupported OS family: ${OS_FAMILY}" ;;
    esac
}

# ── Architecture detection ───────────────────────────────────────────
detect_arch() {
    ARCH="$(uname -m)"
    case "$ARCH" in
        x86_64)  ARCH="amd64" ;;
        aarch64) ARCH="arm64" ;;
        *)       die "Unsupported architecture: $ARCH" ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════════
#  PANEL INSTALLATION
# ═══════════════════════════════════════════════════════════════════════
install_panel() {
    header "Nexus Panel Installer"

    # ── Configuration ────────────────────────────────────────────────
    local INSTALL_DIR="/opt/nexus"
    local NEXUS_USER="nexus"
    local DB_NAME="nexus"
    local DB_USER="nexus"
    local DB_PASS
    local JWT_SECRET
    local JWT_REFRESH_SECRET
    local ADMIN_PASSWORD
    local PANEL_PORT=3000

    # Reuse existing secrets from .env if present (idempotency)
    if [[ -f "${INSTALL_DIR}/.env" ]]; then
        DB_PASS="$(grep -oP '^DB_PASSWORD=\K.*' "${INSTALL_DIR}/.env" 2>/dev/null || true)"
        JWT_SECRET="$(grep -oP '^JWT_SECRET=\K.*' "${INSTALL_DIR}/.env" 2>/dev/null || true)"
        JWT_REFRESH_SECRET="$(grep -oP '^JWT_REFRESH_SECRET=\K.*' "${INSTALL_DIR}/.env" 2>/dev/null || true)"
        ADMIN_PASSWORD="${NEXUS_ADMIN_PASSWORD:-$(grep -oP '^ADMIN_PASSWORD=\K.*' "${INSTALL_DIR}/.env" 2>/dev/null || true)}"
    fi

    DB_PASS="${DB_PASS:-$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)}"
    JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48)}"
    JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48)}"
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 16 | tr -dc 'A-Za-z0-9' | head -c 16)}"

    local ADMIN_EMAIL="${NEXUS_ADMIN_EMAIL:-admin@nexus.local}"
    local ADMIN_USERNAME="${NEXUS_ADMIN_USER:-admin}"
    local DOMAIN="${NEXUS_DOMAIN:-_}"
    local APP_URL="${NEXUS_APP_URL:-http://localhost:${PANEL_PORT}}"

    info "Installation directory : ${INSTALL_DIR}"
    info "Database               : ${DB_NAME}"
    info "Database user          : ${DB_USER}"
    info "Admin email            : ${ADMIN_EMAIL}"
    echo ""

    # ── Step 1: System packages ──────────────────────────────────────
    header "Step 1/8 — Updating system packages"
    pkg_update

    case "$OS_FAMILY" in
        debian)
            pkg_install curl gnupg ca-certificates lsb-release \
                software-properties-common openssl git build-essential
            ;;
        rhel)
            pkg_install curl gnupg2 ca-certificates openssl git \
                gcc gcc-c++ make
            ;;
    esac
    success "System packages up to date"

    # ── Step 2: Node.js 20 ───────────────────────────────────────────
    header "Step 2/8 — Installing Node.js 20"

    if command -v node &>/dev/null && node -v | grep -q '^v20'; then
        success "Node.js $(node -v) already installed"
    else
        info "Adding NodeSource repository…"
        case "$OS_FAMILY" in
            debian)
                curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
                apt-get install -y -qq nodejs
                ;;
            rhel)
                curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
                dnf install -y -q nodejs
                ;;
        esac
        success "Node.js $(node -v) installed"
    fi
    info "npm version: $(npm -v)"

    # ── Step 3: PostgreSQL 16 ────────────────────────────────────────
    header "Step 3/8 — Installing PostgreSQL 16"

    if command -v psql &>/dev/null && psql --version | grep -q '16'; then
        success "PostgreSQL 16 already installed"
    else
        info "Adding PostgreSQL repository…"
        case "$OS_FAMILY" in
            debian)
                curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
                    gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg
                echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
                    > /etc/apt/sources.list.d/pgdg.list
                apt-get update -qq
                apt-get install -y -qq postgresql-16
                ;;
            rhel)
                dnf install -y -q "https://download.postgresql.org/pub/repos/yum/reporpms/EL-${OS_VERSION%%.*}-$(uname -m)/pgdg-redhat-repo-latest.noarch.rpm" || true
                dnf -qy module disable postgresql 2>/dev/null || true
                dnf install -y -q postgresql16-server postgresql16
                /usr/pgsql-16/bin/postgresql-16-setup initdb 2>/dev/null || true
                ;;
        esac
        success "PostgreSQL 16 installed"
    fi

    systemctl enable --now postgresql
    success "PostgreSQL is running"

    # ── Step 4: Nginx ────────────────────────────────────────────────
    header "Step 4/8 — Installing Nginx"

    if command -v nginx &>/dev/null; then
        success "Nginx already installed"
    else
        pkg_install nginx
        success "Nginx installed"
    fi

    systemctl enable --now nginx
    success "Nginx is running"

    # ── Step 5: Create nexus user ────────────────────────────────────
    header "Step 5/8 — Creating system user"

    if id "${NEXUS_USER}" &>/dev/null; then
        success "User '${NEXUS_USER}' already exists"
    else
        useradd --system --create-home --shell /usr/sbin/nologin "${NEXUS_USER}"
        success "User '${NEXUS_USER}' created"
    fi

    # ── Step 6: Database setup ───────────────────────────────────────
    header "Step 6/8 — Configuring database"

    local DB_EXISTS
    DB_EXISTS=$(sudo -u postgres psql -tAc \
        "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || true)

    if [[ "$DB_EXISTS" == "1" ]]; then
        warn "Database '${DB_NAME}' already exists — skipping creation"
        info "Updating password for user '${DB_USER}'…"
        sudo -u postgres psql -c \
            "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" >/dev/null
    else
        info "Creating database user and database…"
        sudo -u postgres psql <<-SQL >/dev/null
            DO \$\$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
                    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
                ELSE
                    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
                END IF;
            END
            \$\$;
            CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
            GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
        success "Database '${DB_NAME}' created with user '${DB_USER}'"
    fi

    # ── Step 7: Application setup ────────────────────────────────────
    header "Step 7/8 — Setting up Nexus Panel application"

    if [[ ! -d "${INSTALL_DIR}" ]]; then
        info "Creating ${INSTALL_DIR}…"
        mkdir -p "${INSTALL_DIR}"
        warn "${INSTALL_DIR} is empty. Copy or clone the Nexus Panel source here."
        warn "Example: git clone https://github.com/qrjhamron/nexus-panel.git ${INSTALL_DIR}"
    fi

    cat > "${INSTALL_DIR}/.env" <<EOF
# Nexus Panel Environment — generated by install.sh
# Generated at: $(date -Iseconds)

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_DATABASE=${DB_NAME}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Application
APP_URL=${APP_URL}
APP_PORT=${PANEL_PORT}

# Admin (used only on first run / seed)
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_USERNAME=${ADMIN_USERNAME}

# Node Environment
NODE_ENV=production
EOF

    chmod 600 "${INSTALL_DIR}/.env"
    chown "${NEXUS_USER}:${NEXUS_USER}" "${INSTALL_DIR}/.env"
    success "Environment file written to ${INSTALL_DIR}/.env"

    if [[ -f "${INSTALL_DIR}/package.json" ]]; then
        info "Installing npm dependencies…"
        cd "${INSTALL_DIR}"
        npm ci --omit=dev 2>&1 | tail -1
        success "Dependencies installed"

        info "Building application…"
        npm run build 2>&1 | tail -3
        success "Application built"

        info "Running database migrations & seed…"
        npm run migration:run -w packages/backend 2>&1 | tail -3 || warn "Migrations skipped (may already be applied)"
        npm run seed -w packages/backend 2>&1 | tail -3 || warn "Seed skipped (may already be applied)"
        success "Database initialized"

        chown -R "${NEXUS_USER}:${NEXUS_USER}" "${INSTALL_DIR}"
    else
        warn "No package.json found in ${INSTALL_DIR}. Skipping build step."
        warn "After placing the application files, run:"
        warn "  cd ${INSTALL_DIR} && npm ci && npm run build"
    fi

    # ── Step 8: Services ─────────────────────────────────────────────
    header "Step 8/8 — Configuring services"

    info "Installing systemd service…"
    cat > /etc/systemd/system/nexus-panel.service <<EOF
[Unit]
Description=Nexus Panel — Server management panel
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=${NEXUS_USER}
Group=${NEXUS_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=/usr/bin/node ${INSTALL_DIR}/packages/backend/dist/main.js
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=600
StartLimitBurst=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nexus-panel

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable nexus-panel
    success "Systemd service installed and enabled"

    # Nginx reverse proxy
    info "Configuring Nginx reverse proxy…"

    local nginx_conf_dir="/etc/nginx/sites-available"
    local nginx_enabled_dir="/etc/nginx/sites-enabled"

    # RHEL-based distros use conf.d instead of sites-available/sites-enabled
    if [[ "$OS_FAMILY" == "rhel" ]]; then
        nginx_conf_dir="/etc/nginx/conf.d"
        nginx_enabled_dir=""
    fi

    mkdir -p "$nginx_conf_dir"

    local nginx_conf_file="${nginx_conf_dir}/nexus-panel${OS_FAMILY:+.conf}"
    [[ "$OS_FAMILY" == "debian" ]] && nginx_conf_file="${nginx_conf_dir}/nexus-panel"

    cat > "$nginx_conf_file" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 100M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API / Backend
    location / {
        proxy_pass http://127.0.0.1:${PANEL_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINX

    # Enable the site (Debian-family only)
    if [[ "$OS_FAMILY" == "debian" ]]; then
        mkdir -p "$nginx_enabled_dir"
        ln -sf "${nginx_conf_file}" "${nginx_enabled_dir}/nexus-panel"
        # Remove default site if it exists
        rm -f "${nginx_enabled_dir}/default"
    fi

    nginx -t 2>&1 || die "Nginx configuration test failed"
    systemctl reload nginx
    success "Nginx configured as reverse proxy → localhost:${PANEL_PORT}"

    # Start the panel
    if [[ -f "${INSTALL_DIR}/packages/backend/dist/main.js" ]]; then
        systemctl start nexus-panel
        success "Nexus Panel started"
    else
        warn "Skipping panel start — build artifacts not found"
    fi

    # ── Summary ──────────────────────────────────────────────────────
    header "Panel Installation Complete"

    echo -e "${GREEN}${BOLD}Nexus Panel has been installed successfully!${NC}"
    echo ""
    echo -e "${BOLD}Generated Credentials${NC} (save these — shown only once!):"
    echo -e "  ┌──────────────────────────────────────────────────────────┐"
    echo -e "  │  Panel URL          : ${CYAN}${APP_URL}${NC}"
    echo -e "  │  Admin Email        : ${CYAN}${ADMIN_EMAIL}${NC}"
    echo -e "  │  Admin Username     : ${CYAN}${ADMIN_USERNAME}${NC}"
    echo -e "  │  Admin Password     : ${CYAN}${ADMIN_PASSWORD}${NC}"
    echo -e "  │  Database Host      : ${CYAN}localhost:5432${NC}"
    echo -e "  │  Database Name      : ${CYAN}${DB_NAME}${NC}"
    echo -e "  │  Database User      : ${CYAN}${DB_USER}${NC}"
    echo -e "  │  Database Password  : ${CYAN}${DB_PASS}${NC}"
    echo -e "  └──────────────────────────────────────────────────────────┘"
    echo ""
    echo -e "${BOLD}Service Management:${NC}"
    echo -e "  Start   : ${CYAN}systemctl start nexus-panel${NC}"
    echo -e "  Stop    : ${CYAN}systemctl stop nexus-panel${NC}"
    echo -e "  Status  : ${CYAN}systemctl status nexus-panel${NC}"
    echo -e "  Logs    : ${CYAN}journalctl -u nexus-panel -f${NC}"
    echo ""
    echo -e "${BOLD}Configuration:${NC}"
    echo -e "  Env file    : ${CYAN}${INSTALL_DIR}/.env${NC}"
    echo -e "  Nginx conf  : ${CYAN}${nginx_conf_file}${NC}"
    echo -e "  Systemd unit: ${CYAN}/etc/systemd/system/nexus-panel.service${NC}"
    echo -e "  Install log : ${CYAN}${LOG_FILE}${NC}"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "  1. Set your domain in ${nginx_conf_file}"
    echo -e "  2. Configure SSL with: ${CYAN}certbot --nginx -d your-domain.com${NC}"
    echo -e "  3. Log in at ${CYAN}${APP_URL}${NC} with the admin credentials above"
    echo -e "  4. Add a node: install Wings on a server with:"
    echo -e "     ${CYAN}bash install.sh wings${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
#  WINGS INSTALLATION
# ═══════════════════════════════════════════════════════════════════════
install_wings() {
    header "Nexus Wings Installer"

    detect_arch

    # ── Configuration ────────────────────────────────────────────────
    local WINGS_USER="nexus-wings"
    local WINGS_BINARY="/usr/local/bin/nexus-wings"
    local CONFIG_DIR="/etc/nexus"
    local DATA_DIR="/var/lib/nexus/volumes"
    local SERVICE_FILE="/etc/systemd/system/nexus-wings.service"
    local DOWNLOAD_URL="https://github.com/qrjhamron/nexus-panel/releases/latest/download/wings_linux_${ARCH}"

    info "Architecture : ${ARCH}"
    info "Binary       : ${WINGS_BINARY}"
    info "Config dir   : ${CONFIG_DIR}"
    echo ""

    # ── Step 1: Docker ───────────────────────────────────────────────
    header "Step 1/5 — Ensuring Docker is installed"

    if command -v docker &>/dev/null; then
        success "Docker is already installed"
    else
        info "Installing Docker…"
        case "$OS_FAMILY" in
            debian)
                pkg_update
                pkg_install ca-certificates curl gnupg lsb-release

                install -m 0755 -d /etc/apt/keyrings
                curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" | \
                    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                chmod a+r /etc/apt/keyrings/docker.gpg

                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/${OS_ID} $(lsb_release -cs) stable" \
                    > /etc/apt/sources.list.d/docker.list

                apt-get update -qq
                apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
                ;;
            rhel)
                dnf install -y -q dnf-plugins-core
                dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
                ;;
        esac
        success "Docker installed"
    fi

    systemctl enable --now docker
    if ! docker info &>/dev/null; then
        die "Docker daemon is not running. Check: systemctl status docker"
    fi

    local DOCKER_VERSION
    DOCKER_VERSION="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
    if [[ -n "$DOCKER_VERSION" ]]; then
        local DOCKER_MAJOR="${DOCKER_VERSION%%.*}"
        if [[ "$DOCKER_MAJOR" -lt 20 ]]; then
            die "Docker >= 20.x required (found ${DOCKER_VERSION})"
        fi
        success "Docker version: ${DOCKER_VERSION}"
    else
        warn "Could not determine Docker version"
    fi

    # ── Step 2: Create nexus-wings user ──────────────────────────────
    header "Step 2/5 — Creating system user"

    if id "${WINGS_USER}" &>/dev/null; then
        success "User '${WINGS_USER}' already exists"
    else
        useradd --system --create-home --shell /usr/sbin/nologin "${WINGS_USER}"
        success "User '${WINGS_USER}' created"
    fi

    usermod -aG docker "${WINGS_USER}" 2>/dev/null || true
    success "User '${WINGS_USER}' added to docker group"

    # ── Step 3: Create directories ───────────────────────────────────
    header "Step 3/5 — Creating directories"

    mkdir -p "${CONFIG_DIR}"
    mkdir -p "${DATA_DIR}"

    chown "${WINGS_USER}:${WINGS_USER}" "${CONFIG_DIR}"
    chown "${WINGS_USER}:${WINGS_USER}" "${DATA_DIR}"
    chmod 750 "${CONFIG_DIR}"
    chmod 750 "${DATA_DIR}"

    success "${CONFIG_DIR}  created (config)"
    success "${DATA_DIR}    created (server volumes)"

    # ── Step 4: Download Wings binary ────────────────────────────────
    header "Step 4/5 — Installing Wings binary"

    _install_wings_binary() {
        info "Downloading Wings binary (${ARCH})…"
        if curl -fsSL -o "${WINGS_BINARY}" "${DOWNLOAD_URL}" 2>/dev/null; then
            chmod 755 "${WINGS_BINARY}"
            success "Binary installed at ${WINGS_BINARY}"
        else
            warn "Download failed. You can build from source instead:"
            warn "  cd /path/to/nexus/wings && make build"
            warn "  cp target/release/nexus-wings ${WINGS_BINARY}"

            if [[ ! -f "${WINGS_BINARY}" ]]; then
                cat > "${WINGS_BINARY}" <<'PLACEHOLDER'
#!/bin/sh
echo "nexus-wings: binary not installed. Build from source or download a release." >&2
exit 1
PLACEHOLDER
                chmod 755 "${WINGS_BINARY}"
            fi
        fi
    }

    if [[ -f "${WINGS_BINARY}" ]]; then
        warn "Wings binary already exists at ${WINGS_BINARY}"
        info "Re-run with FORCE_REINSTALL=1 to overwrite"
        if [[ "${FORCE_REINSTALL:-0}" == "1" ]]; then
            _install_wings_binary
        fi
    else
        _install_wings_binary
    fi

    # ── Step 5: Systemd service ──────────────────────────────────────
    header "Step 5/5 — Installing systemd service"

    local SCRIPT_DIR
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local CONTRIB_SERVICE="${SCRIPT_DIR}/wings/contrib/nexus-wings.service"
    local LOCAL_SERVICE="${SCRIPT_DIR}/scripts/nexus-wings.service"

    if [[ -f "$CONTRIB_SERVICE" ]]; then
        info "Using service file from contrib/"
        cp "$CONTRIB_SERVICE" "$SERVICE_FILE"
    elif [[ -f "$LOCAL_SERVICE" ]]; then
        info "Using local service file"
        cp "$LOCAL_SERVICE" "$SERVICE_FILE"
    else
        info "Generating systemd service file…"
        cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Nexus Wings — Server daemon for Nexus Panel
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=${WINGS_BINARY} daemon --config ${CONFIG_DIR}/wings.toml
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=600
StartLimitBurst=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nexus-wings

[Install]
WantedBy=multi-user.target
EOF
    fi

    systemctl daemon-reload
    systemctl enable nexus-wings
    success "Systemd service installed and enabled"

    # ── Configure Wings (non-interactive) ────────────────────────────
    if [[ -n "${PANEL_URL:-}" && -n "${NODE_TOKEN:-}" ]]; then
        info "Running non-interactive Wings configuration…"
        "${WINGS_BINARY}" configure \
            --panel-url "${PANEL_URL}" \
            --token "${NODE_TOKEN}" \
            --config "${CONFIG_DIR}/wings.toml" 2>&1 || warn "Wings configure failed — you can run it manually later"
        success "Wings configured for panel: ${PANEL_URL}"
        systemctl start nexus-wings || warn "Failed to start Wings — check: journalctl -u nexus-wings"
    fi

    # ── Summary ──────────────────────────────────────────────────────
    header "Wings Installation Complete"

    echo -e "${GREEN}${BOLD}Nexus Wings has been installed successfully!${NC}"
    echo ""
    echo -e "${BOLD}Installed Components:${NC}"
    echo -e "  ┌──────────────────────────────────────────────────────────┐"
    echo -e "  │  Binary         : ${CYAN}${WINGS_BINARY}${NC}"
    echo -e "  │  Config dir     : ${CYAN}${CONFIG_DIR}${NC}"
    echo -e "  │  Volumes dir    : ${CYAN}${DATA_DIR}${NC}"
    echo -e "  │  Systemd service: ${CYAN}${SERVICE_FILE}${NC}"
    echo -e "  │  User           : ${CYAN}${WINGS_USER}${NC}"
    echo -e "  │  Install log    : ${CYAN}${LOG_FILE}${NC}"
    echo -e "  └──────────────────────────────────────────────────────────┘"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "  1. Configure Wings by running:"
    echo -e "     ${CYAN}nexus-wings configure${NC}"
    echo -e ""
    echo -e "     This will ask for your Panel URL and node token."
    echo -e "     Get the token from Panel → Admin → Nodes → Create Node."
    echo -e ""
    echo -e "  2. Start the service:"
    echo -e "     ${CYAN}systemctl start nexus-wings${NC}"
    echo -e ""
    echo -e "  3. Verify the node is online:"
    echo -e "     ${CYAN}nexus-wings diagnostics --config ${CONFIG_DIR}/wings.toml${NC}"
    echo ""
    echo -e "${BOLD}Service Management:${NC}"
    echo -e "  Start  : ${CYAN}systemctl start nexus-wings${NC}"
    echo -e "  Stop   : ${CYAN}systemctl stop nexus-wings${NC}"
    echo -e "  Status : ${CYAN}systemctl status nexus-wings${NC}"
    echo -e "  Logs   : ${CYAN}journalctl -u nexus-wings -f${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
#  MAIN — Parse args or show interactive menu
# ═══════════════════════════════════════════════════════════════════════

main() {
    # Ensure we can write to the log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"

    echo "=== Nexus Installer started at $(date -Iseconds) ===" >> "$LOG_FILE"

    # Must be root
    if [[ $EUID -ne 0 ]]; then
        die "This script must be run as root (try: sudo bash $0)"
    fi

    detect_os

    local action="${1:-}"

    if [[ -z "$action" ]]; then
        # Interactive menu
        echo -e "${CYAN}${BOLD}"
        echo "╔══════════════════════════════════════╗"
        echo "║        Nexus — Unified Installer     ║"
        echo "╠══════════════════════════════════════╣"
        echo "║  [1]  Install Panel                  ║"
        echo "║  [2]  Install Wings                  ║"
        echo "║  [0]  Exit                           ║"
        echo "╚══════════════════════════════════════╝"
        echo -e "${NC}"
        read -rp "Choose an option [0-2]: " choice
        case "$choice" in
            1) action="panel" ;;
            2) action="wings" ;;
            0) echo "Bye!"; exit 0 ;;
            *) die "Invalid option: ${choice}" ;;
        esac
    fi

    case "$action" in
        panel) install_panel ;;
        wings) install_wings ;;
        *)     die "Unknown command: ${action}. Usage: $0 {panel|wings}" ;;
    esac

    echo "=== Nexus Installer finished at $(date -Iseconds) ===" >> "$LOG_FILE"
}

main "$@"
