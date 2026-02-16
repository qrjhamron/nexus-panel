# Egg Development

Eggs are the core abstraction that tells Nexus how to install, configure, and run a specific type of game server.

## What is an Egg?

An Egg is a JSON document that defines:

- The Docker image to use
- How to install the server files
- How to start the server
- Which configuration options to expose to users
- How to detect if the server is online

Think of it as a recipe: it tells Wings exactly how to set up and run a particular game server.

## Creating a Custom Egg

### Egg JSON Structure

```json
{
  "meta": {
    "version": "1.0.0"
  },
  "name": "My Custom Server",
  "author": "you@example.com",
  "description": "A custom game server egg.",
  "docker_image": "ghcr.io/nexus/yolks:java_21",
  "startup": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
  "stop_command": "stop",
  "detect_online": {
    "type": "log_match",
    "pattern": "Done \\(.*\\)!"
  },
  "environment": [
    {
      "name": "SERVER_JARFILE",
      "description": "The name of the server jar file.",
      "default_value": "server.jar",
      "user_viewable": true,
      "user_editable": true,
      "required": true,
      "rules": "string|max:50"
    },
    {
      "name": "SERVER_MEMORY",
      "description": "Maximum memory allocation in MB.",
      "default_value": "1024",
      "user_viewable": true,
      "user_editable": false,
      "required": true,
      "rules": "integer|min:128|max:32768"
    },
    {
      "name": "MINECRAFT_VERSION",
      "description": "Minecraft server version to install.",
      "default_value": "latest",
      "user_viewable": true,
      "user_editable": true,
      "required": true,
      "rules": "string|max:20"
    }
  ],
  "install": {
    "docker_image": "ghcr.io/nexus/installers:alpine",
    "script": "#!/bin/ash\ncd /mnt/server\n\nMC_VERSION=${MINECRAFT_VERSION}\nif [ \"$MC_VERSION\" = \"latest\" ]; then\n  MC_VERSION=$(curl -s https://launchermeta.mojang.com/mc/game/version_manifest.json | jq -r '.latest.release')\nfi\n\necho \"Downloading Minecraft ${MC_VERSION}...\"\nMANIFEST_URL=$(curl -s https://launchermeta.mojang.com/mc/game/version_manifest.json | jq -r --arg v \"$MC_VERSION\" '.versions[] | select(.id==$v) | .url')\nSERVER_URL=$(curl -s \"$MANIFEST_URL\" | jq -r '.downloads.server.url')\n\ncurl -o ${SERVER_JARFILE} \"$SERVER_URL\"\necho \"eula=true\" > eula.txt\necho \"Install complete.\""
  }
}
```

## Environment Variables

Environment variables allow users to customize server behavior without editing config files directly.

| Field            | Type    | Description                                         |
|------------------|---------|-----------------------------------------------------|
| `name`           | string  | Variable name (e.g., `SERVER_JARFILE`)              |
| `description`    | string  | Human-readable description shown in the Panel UI    |
| `default_value`  | string  | Default value used if the user doesn't override it  |
| `user_viewable`  | boolean | Whether users can see this variable                 |
| `user_editable`  | boolean | Whether users can change this variable              |
| `required`       | boolean | Whether the variable must have a value              |
| `rules`          | string  | Validation rules (pipe-separated)                   |

### Validation Rules

- `string` — must be a string
- `integer` — must be an integer
- `boolean` — must be `true` or `false`
- `min:N` — minimum value (integer) or length (string)
- `max:N` — maximum value (integer) or length (string)
- `in:a,b,c` — must be one of the listed values

Variables are available in the startup command and install script as `{{VARIABLE_NAME}}` (startup) or `$VARIABLE_NAME` (install script).

## Install Script Conventions

The install script runs inside a temporary container (defined by `install.docker_image`) with the server's data directory mounted at `/mnt/server`.

### Guidelines

1. **Use `/mnt/server` as the working directory** — all files should be written here.
2. **The script runs as root** inside the install container.
3. **Use `ash` for Alpine-based images** and `bash` for Debian/Ubuntu-based images.
4. **Download only what's needed** — keep install times short.
5. **Make it idempotent** — the script may be re-run to update/repair the server.
6. **Print progress messages** — they appear in the Panel during installation.
7. **Exit with code 0 on success** — any non-zero exit code marks the install as failed.

### Available Install Images

| Image                              | Base    | Includes                    |
|------------------------------------|---------|-----------------------------|
| `ghcr.io/nexus/installers:alpine`  | Alpine  | curl, jq, wget, unzip, tar |
| `ghcr.io/nexus/installers:debian`  | Debian  | curl, jq, wget, unzip, tar, git |

## Best Practices

- **Test your Egg locally** before importing it into the Panel. You can run the install script manually in a Docker container:

  ```bash
  docker run --rm -it -v /tmp/test-server:/mnt/server \
    ghcr.io/nexus/installers:alpine ash
  ```

- **Pin versions** where possible (Docker images, download URLs) to avoid breaking changes.
- **Use the `detect_online` field** so the Panel knows when the server is ready.
- **Document environment variables clearly** — users rely on descriptions in the UI.
- **Keep the Docker image minimal** — smaller images mean faster server creation.
- **Handle updates gracefully** — install scripts should update server files without wiping user data.

## Example Egg: Vanilla Minecraft

```json
{
  "meta": {
    "version": "1.0.0"
  },
  "name": "Minecraft - Vanilla",
  "author": "admin@example.com",
  "description": "Vanilla Minecraft Java Edition server.",
  "docker_image": "ghcr.io/nexus/yolks:java_21",
  "startup": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} --nogui",
  "stop_command": "stop",
  "detect_online": {
    "type": "log_match",
    "pattern": "Done \\(.*\\)! For help, type"
  },
  "environment": [
    {
      "name": "SERVER_JARFILE",
      "description": "Name of the server jar file.",
      "default_value": "server.jar",
      "user_viewable": true,
      "user_editable": true,
      "required": true,
      "rules": "string|max:50"
    },
    {
      "name": "SERVER_MEMORY",
      "description": "Maximum memory in MB (set by resource limits).",
      "default_value": "1024",
      "user_viewable": true,
      "user_editable": false,
      "required": true,
      "rules": "integer|min:128|max:32768"
    },
    {
      "name": "MINECRAFT_VERSION",
      "description": "Minecraft version to install.",
      "default_value": "latest",
      "user_viewable": true,
      "user_editable": true,
      "required": true,
      "rules": "string|max:20"
    }
  ],
  "install": {
    "docker_image": "ghcr.io/nexus/installers:alpine",
    "script": "#!/bin/ash\ncd /mnt/server\n\nMC_VERSION=${MINECRAFT_VERSION}\nif [ \"$MC_VERSION\" = \"latest\" ]; then\n  MC_VERSION=$(curl -s https://launchermeta.mojang.com/mc/game/version_manifest.json | jq -r '.latest.release')\nfi\n\necho \"Installing Minecraft ${MC_VERSION}...\"\nMANIFEST_URL=$(curl -s https://launchermeta.mojang.com/mc/game/version_manifest.json | jq -r --arg v \"$MC_VERSION\" '.versions[] | select(.id==$v) | .url')\nSERVER_URL=$(curl -s \"$MANIFEST_URL\" | jq -r '.downloads.server.url')\n\ncurl -o ${SERVER_JARFILE} \"$SERVER_URL\"\necho \"eula=true\" > eula.txt\necho \"Install complete.\""
  }
}
```
