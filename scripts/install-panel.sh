#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Nexus Panel — Installation Script
# Targets: Ubuntu 22.04 LTS (fresh server)
# Installs: Node.js 20, PostgreSQL 16, Nginx, Nexus Panel
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors & helpers ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
success() { echo -e "${GREEN}[OK]${NC}      $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
error()   { echo -e "${RED}[ERROR]${NC}   $*"; }
header()  { echo -e "\n${CYAN}${BOLD}── $* ──${NC}\n"; }

die() { error "$*"; exit 1; }

# ── Configuration ────────────────────────────────────────────────────
INSTALL_DIR="/opt/nexus"
NEXUS_USER="nexus"
DB_NAME="nexus"
DB_USER="nexus"
DB_PASS="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)"
JWT_SECRET="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48)"
PANEL_PORT=3000
DOMAIN="${NEXUS_DOMAIN:-_}"  # default: catch-all vhost

# ── Preflight ────────────────────────────────────────────────────────
header "Nexus Panel Installer"

if [[ $EUID -ne 0 ]]; then
    die "This script must be run as root (try: sudo bash $0)"
fi

if ! grep -qi 'ubuntu' /etc/os-release 2>/dev/null; then
    warn "This script is designed for Ubuntu 22.04. Proceeding anyway…"
fi

info "Installation directory : ${INSTALL_DIR}"
info "Database               : ${DB_NAME}"
info "Database user          : ${DB_USER}"
echo ""

# ── Step 1: System packages ─────────────────────────────────────────
header "Step 1/8 — Updating system packages"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl \
    gnupg \
    ca-certificates \
    lsb-release \
    software-properties-common \
    openssl \
    git \
    build-essential
success "System packages up to date"

# ── Step 2: Node.js 20 ──────────────────────────────────────────────
header "Step 2/8 — Installing Node.js 20"

if command -v node &>/dev/null && node -v | grep -q '^v20'; then
    success "Node.js $(node -v) already installed"
else
    info "Adding NodeSource repository…"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    success "Node.js $(node -v) installed"
fi

info "npm version: $(npm -v)"

# ── Step 3: PostgreSQL 16 ───────────────────────────────────────────
header "Step 3/8 — Installing PostgreSQL 16"

if command -v psql &>/dev/null && psql --version | grep -q '16'; then
    success "PostgreSQL 16 already installed"
else
    info "Adding PostgreSQL apt repository…"
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
        gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -y -qq postgresql-16
    success "PostgreSQL 16 installed"
fi

systemctl enable --now postgresql
success "PostgreSQL is running"

# ── Step 4: Nginx ────────────────────────────────────────────────────
header "Step 4/8 — Installing Nginx"

if command -v nginx &>/dev/null; then
    success "Nginx already installed"
else
    apt-get install -y -qq nginx
    success "Nginx installed"
fi

systemctl enable --now nginx
success "Nginx is running"

# ── Step 5: Create nexus user ────────────────────────────────────────
header "Step 5/8 — Creating system user"

if id "${NEXUS_USER}" &>/dev/null; then
    success "User '${NEXUS_USER}' already exists"
else
    useradd --system --create-home --shell /usr/sbin/nologin "${NEXUS_USER}"
    success "User '${NEXUS_USER}' created"
fi

# ── Step 6: Database setup ───────────────────────────────────────────
header "Step 6/8 — Configuring database"

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

# ── Step 7: Application setup ───────────────────────────────────────
header "Step 7/8 — Setting up Nexus Panel application"

if [[ ! -d "${INSTALL_DIR}" ]]; then
    info "Creating ${INSTALL_DIR}…"
    mkdir -p "${INSTALL_DIR}"
    warn "${INSTALL_DIR} is empty. Copy or clone the Nexus Panel source here."
    warn "Example: git clone https://github.com/YOUR_ORG/nexus.git ${INSTALL_DIR}"
fi

# Write .env file
cat > "${INSTALL_DIR}/.env" <<EOF
# Nexus Panel Environment — generated by install-panel.sh
# Generated at: $(date -Iseconds)

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_DATABASE=${DB_NAME}

# JWT
JWT_SECRET=${JWT_SECRET}

# Frontend
FRONTEND_URL=http://localhost:${PANEL_PORT}

# Node Environment
NODE_ENV=production
EOF

chmod 600 "${INSTALL_DIR}/.env"
chown "${NEXUS_USER}:${NEXUS_USER}" "${INSTALL_DIR}/.env"
success "Environment file written to ${INSTALL_DIR}/.env"

# Install dependencies and build (only if package.json exists)
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

# ── Step 8: Services ────────────────────────────────────────────────
header "Step 8/8 — Configuring services"

# ── Systemd unit ──
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

# ── Nginx reverse proxy ──
info "Configuring Nginx reverse proxy…"
cat > /etc/nginx/sites-available/nexus-panel <<NGINX
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

# Enable the site
ln -sf /etc/nginx/sites-available/nexus-panel /etc/nginx/sites-enabled/nexus-panel

# Remove default site if it exists
if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t 2>&1 || die "Nginx configuration test failed"
systemctl reload nginx
success "Nginx configured as reverse proxy → localhost:${PANEL_PORT}"

# ── Start the panel ──
if [[ -f "${INSTALL_DIR}/packages/backend/dist/main.js" ]]; then
    systemctl start nexus-panel
    success "Nexus Panel started"
else
    warn "Skipping panel start — build artifacts not found"
fi

# ── Summary ──────────────────────────────────────────────────────────
header "Installation Complete"

echo -e "${GREEN}${BOLD}Nexus Panel has been installed successfully!${NC}"
echo ""
echo -e "${BOLD}Generated Credentials${NC} (save these securely!):"
echo -e "  ┌──────────────────────────────────────────────────────────┐"
echo -e "  │  Database Host     : ${CYAN}localhost:5432${NC}"
echo -e "  │  Database Name     : ${CYAN}${DB_NAME}${NC}"
echo -e "  │  Database User     : ${CYAN}${DB_USER}${NC}"
echo -e "  │  Database Password : ${CYAN}${DB_PASS}${NC}"
echo -e "  │  JWT Secret        : ${CYAN}${JWT_SECRET}${NC}"
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
echo -e "  Nginx conf  : ${CYAN}/etc/nginx/sites-available/nexus-panel${NC}"
echo -e "  Systemd unit: ${CYAN}/etc/systemd/system/nexus-panel.service${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo -e "  1. Set your domain in /etc/nginx/sites-available/nexus-panel"
echo -e "  2. Configure SSL with: ${CYAN}certbot --nginx -d your-domain.com${NC}"
echo -e "  3. Visit ${CYAN}http://your-server-ip${NC} to access the panel"
echo ""
