#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Nexus Wings — Installation Script
# Targets: Ubuntu 22.04 LTS (fresh node server)
# Installs: Docker (if missing), Nexus Wings daemon
# Idempotent — safe to run multiple times
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

info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
success() { echo -e "${GREEN}[OK]${NC}      $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
error()   { echo -e "${RED}[ERROR]${NC}   $*"; }
header()  { echo -e "\n${CYAN}${BOLD}── $* ──${NC}\n"; }

die() { error "$*"; exit 1; }

# ── Configuration ────────────────────────────────────────────────────
WINGS_USER="nexus-wings"
WINGS_BINARY="/usr/local/bin/nexus-wings"
CONFIG_DIR="/etc/nexus"
DATA_DIR="/var/lib/nexus/volumes"
SERVICE_FILE="/etc/systemd/system/nexus-wings.service"

# Determine architecture
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    *)       die "Unsupported architecture: $ARCH" ;;
esac

# Placeholder download URL — replace with actual release URL
DOWNLOAD_URL="https://github.com/YOUR_ORG/nexus/releases/latest/download/wings_linux_${ARCH}"

# ── Preflight ────────────────────────────────────────────────────────
header "Nexus Wings Installer"

if [[ $EUID -ne 0 ]]; then
    die "This script must be run as root (try: sudo bash $0)"
fi

SUPPORTED_OS=false
if grep -qi 'ubuntu' /etc/os-release 2>/dev/null; then
    OS_VERSION=$(grep VERSION_ID /etc/os-release | tr -dc '0-9.')
    case "$OS_VERSION" in
        20.04|22.04|24.04) SUPPORTED_OS=true ;;
    esac
fi
if grep -qi 'debian' /etc/os-release 2>/dev/null; then
    OS_VERSION=$(grep VERSION_ID /etc/os-release | tr -dc '0-9')
    case "$OS_VERSION" in
        11|12) SUPPORTED_OS=true ;;
    esac
fi

if [[ "$SUPPORTED_OS" != "true" ]]; then
    warn "This script is designed for Ubuntu 20.04/22.04/24.04 or Debian 11/12."
    warn "Proceeding anyway — things may break."
fi

# ── Step 1: Docker ───────────────────────────────────────────────────
header "Step 1/5 — Ensuring Docker is installed"

if command -v docker &>/dev/null; then
    success "Docker is already installed"
else
    info "Installing Docker via official convenience script…"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    success "Docker installed"
fi

# Ensure Docker is running
systemctl enable --now docker
if ! docker info &>/dev/null; then
    die "Docker daemon is not running. Check: systemctl status docker"
fi

# Version check (minimum 20.x)
DOCKER_VERSION="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
if [[ -n "$DOCKER_VERSION" ]]; then
    DOCKER_MAJOR="${DOCKER_VERSION%%.*}"
    if [[ "$DOCKER_MAJOR" -lt 20 ]]; then
        die "Docker >= 20.x required (found ${DOCKER_VERSION})"
    fi
    success "Docker version: ${DOCKER_VERSION}"
else
    warn "Could not determine Docker version"
fi

# ── Step 2: Create nexus-wings user ──────────────────────────────────
header "Step 2/5 — Creating system user"

if id "${WINGS_USER}" &>/dev/null; then
    success "User '${WINGS_USER}' already exists"
else
    useradd --system --create-home --shell /usr/sbin/nologin "${WINGS_USER}"
    success "User '${WINGS_USER}' created"
fi

# Add user to docker group
usermod -aG docker "${WINGS_USER}" 2>/dev/null || true
success "User '${WINGS_USER}' added to docker group"

# ── Step 3: Create directories ───────────────────────────────────────
header "Step 3/5 — Creating directories"

mkdir -p "${CONFIG_DIR}"
mkdir -p "${DATA_DIR}"

chown "${WINGS_USER}:${WINGS_USER}" "${CONFIG_DIR}"
chown "${WINGS_USER}:${WINGS_USER}" "${DATA_DIR}"
chmod 750 "${CONFIG_DIR}"
chmod 750 "${DATA_DIR}"

success "${CONFIG_DIR}  created (config)"
success "${DATA_DIR}    created (server volumes)"

# ── Step 4: Download Wings binary ────────────────────────────────────
header "Step 4/5 — Installing Wings binary"

install_binary() {
    info "Downloading Wings binary (${ARCH})…"
    if curl -fsSL -o "${WINGS_BINARY}" "${DOWNLOAD_URL}" 2>/dev/null; then
        chmod 755 "${WINGS_BINARY}"
        success "Binary installed at ${WINGS_BINARY}"
    else
        warn "Download failed (placeholder URL). You can build from source instead:"
        warn "  cd /path/to/nexus/wings && make build"
        warn "  cp target/release/nexus-wings ${WINGS_BINARY}"

        # Create a placeholder so the service file is valid
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
        install_binary
    fi
else
    install_binary
fi

# ── Step 5: Systemd service ─────────────────────────────────────────
header "Step 5/5 — Installing systemd service"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRIB_SERVICE="${SCRIPT_DIR}/../wings/contrib/nexus-wings.service"
LOCAL_SERVICE="${SCRIPT_DIR}/nexus-wings.service"

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

# ── Summary ──────────────────────────────────────────────────────────
header "Installation Complete"

echo -e "${GREEN}${BOLD}Nexus Wings has been installed successfully!${NC}"
echo ""
echo -e "${BOLD}Installed Components:${NC}"
echo -e "  ┌──────────────────────────────────────────────────────────┐"
echo -e "  │  Binary         : ${CYAN}${WINGS_BINARY}${NC}"
echo -e "  │  Config dir     : ${CYAN}${CONFIG_DIR}${NC}"
echo -e "  │  Volumes dir    : ${CYAN}${DATA_DIR}${NC}"
echo -e "  │  Systemd service: ${CYAN}${SERVICE_FILE}${NC}"
echo -e "  │  User           : ${CYAN}${WINGS_USER}${NC}"
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
