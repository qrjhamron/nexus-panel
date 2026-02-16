# Wings Configuration

Wings is configured via a TOML file located at `/etc/nexus-wings/config.toml`.

## Configuration Reference

### `[panel]`

| Key     | Type   | Default | Description                                |
|---------|--------|---------|--------------------------------------------|
| `url`   | string | —       | **Required.** Full URL of the Nexus Panel (e.g., `https://panel.example.com`) |
| `token` | string | —       | **Required.** Authentication token generated when creating the node in the Panel |

```toml
[panel]
url = "https://panel.example.com"
token = "your-node-token"
```

### `[api]`

| Key    | Type   | Default     | Description                          |
|--------|--------|-------------|--------------------------------------|
| `host` | string | `0.0.0.0`  | Address to bind the Wings HTTP server |
| `port` | u16    | `8080`     | Port to bind the Wings HTTP server    |

```toml
[api]
host = "0.0.0.0"
port = 8080
```

### `[api.tls]`

| Key         | Type   | Default | Description                              |
|-------------|--------|---------|------------------------------------------|
| `enabled`   | bool   | `false` | Enable TLS for the Wings API             |
| `cert_path` | string | —       | Path to the TLS certificate file (PEM)   |
| `key_path`  | string | —       | Path to the TLS private key file (PEM)   |

```toml
[api.tls]
enabled = true
cert_path = "/etc/nexus-wings/tls/cert.pem"
key_path = "/etc/nexus-wings/tls/key.pem"
```

#### TLS Setup

1. Obtain a certificate (e.g., via Let's Encrypt / certbot):

   ```bash
   sudo certbot certonly --standalone -d node1.example.com
   ```

2. Copy or symlink the certificates:

   ```bash
   sudo mkdir -p /etc/nexus-wings/tls
   sudo ln -s /etc/letsencrypt/live/node1.example.com/fullchain.pem /etc/nexus-wings/tls/cert.pem
   sudo ln -s /etc/letsencrypt/live/node1.example.com/privkey.pem /etc/nexus-wings/tls/key.pem
   ```

3. Enable TLS in the configuration and restart Wings.

### `[docker]`

| Key       | Type   | Default                    | Description                                  |
|-----------|--------|----------------------------|----------------------------------------------|
| `socket`  | string | `/var/run/docker.sock`     | Path to the Docker daemon socket             |
| `network` | string | `nexus_network`            | Docker network for server containers         |

```toml
[docker]
socket = "/var/run/docker.sock"
network = "nexus_network"
```

Wings will automatically create the Docker network if it does not exist.

### `[storage]`

| Key         | Type   | Default                        | Description                            |
|-------------|--------|--------------------------------|----------------------------------------|
| `data_path` | string | `/var/lib/nexus-wings/data`    | Root directory for server data volumes |

```toml
[storage]
data_path = "/var/lib/nexus-wings/data"
```

Each server's files are stored under `<data_path>/<server-uuid>/`.

### `[logging]`

| Key     | Type   | Default | Description                              |
|---------|--------|---------|------------------------------------------|
| `level` | string | `info`  | Log level: `trace`, `debug`, `info`, `warn`, `error` |
| `format`| string | `text`  | Log format: `text` or `json`             |

```toml
[logging]
level = "info"
format = "text"
```

### `[resources]`

| Key              | Type | Default | Description                                      |
|------------------|------|---------|--------------------------------------------------|
| `max_cpu_percent`| u32  | `0`     | Maximum total CPU % Wings may allocate (0 = unlimited) |
| `max_memory_mb`  | u64  | `0`     | Maximum total memory in MB (0 = unlimited)       |
| `max_disk_mb`    | u64  | `0`     | Maximum total disk in MB (0 = unlimited)         |

```toml
[resources]
max_cpu_percent = 800   # 8 cores
max_memory_mb = 32768   # 32 GB
max_disk_mb = 512000    # 500 GB
```

## Full Example Configuration

```toml
[panel]
url = "https://panel.example.com"
token = "nxn_aBcDeFgHiJkLmNoPqRsTuVwXyZ"

[api]
host = "0.0.0.0"
port = 8080

[api.tls]
enabled = true
cert_path = "/etc/nexus-wings/tls/cert.pem"
key_path = "/etc/nexus-wings/tls/key.pem"

[docker]
socket = "/var/run/docker.sock"
network = "nexus_network"

[storage]
data_path = "/var/lib/nexus-wings/data"

[logging]
level = "info"
format = "json"

[resources]
max_cpu_percent = 800
max_memory_mb = 32768
max_disk_mb = 512000
```
