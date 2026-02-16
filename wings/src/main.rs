mod auth;
mod config;
mod console;
mod docker;
mod error;
mod files;
mod heartbeat;
mod installer;
mod routes;
mod server;
mod state;

use std::path::PathBuf;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "nexus-wings", version, about = "Nexus Wings — Server daemon for Nexus Panel")]
struct Cli {
    /// Path to the configuration file
    #[arg(short, long, default_value = "/etc/nexus-wings/config.toml")]
    config: PathBuf,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Interactive setup wizard
    Configure,
    /// Run diagnostics (check Docker, config, Panel connectivity)
    Diagnostics,
    /// Print version information
    Version,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Configure) => run_configure().await,
        Some(Commands::Diagnostics) => run_diagnostics(&cli.config).await,
        Some(Commands::Version) => {
            println!(
                "nexus-wings v{} (commit: {}, built: {})",
                env!("CARGO_PKG_VERSION"),
                env!("GIT_COMMIT_HASH"),
                env!("BUILD_TIMESTAMP"),
            );
            Ok(())
        }
        None => run_daemon(&cli.config).await,
    }
}

async fn run_daemon(config_path: &PathBuf) -> anyhow::Result<()> {
    let cfg = config::Config::load(config_path)
        .map_err(|e| anyhow::anyhow!("Failed to load config: {e}"))?;

    // Initialize tracing
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(&cfg.logging.level));

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .init();

    tracing::info!(
        "Starting Nexus Wings v{} (commit: {}, built: {})",
        env!("CARGO_PKG_VERSION"),
        env!("GIT_COMMIT_HASH"),
        env!("BUILD_TIMESTAMP"),
    );

    // Ensure Docker network
    let docker = crate::docker::DockerManager::new(&cfg.docker.socket)?;
    if let Err(e) = docker.ensure_network().await {
        tracing::warn!("Failed to ensure Docker network: {e}");
    }
    if let Err(e) = docker.attach_containers_to_network().await {
        tracing::warn!("Failed to attach containers to network: {e}");
    }

    let state = std::sync::Arc::new(state::AppState::new(cfg.clone(), docker));

    // Reconstruct server registry from existing containers
    {
        let filters: std::collections::HashMap<String, Vec<String>> = [(
            "label".to_string(),
            vec!["nexus.managed=true".to_string()],
        )]
        .into();

        match state.docker.client().list_containers(Some(
            bollard::container::ListContainersOptions {
                all: true,
                filters,
                ..Default::default()
            },
        )).await {
            Ok(containers) => {
                let mut count = 0;
                for container in &containers {
                    if let Some(labels) = &container.labels {
                        if let Some(uuid) = labels.get("nexus.server_uuid") {
                            let container_state = container
                                .state
                                .as_deref()
                                .unwrap_or("unknown");
                            tracing::debug!(
                                "Reconstructed server {uuid} with state {container_state}"
                            );
                            count += 1;
                        }
                    }
                }
                tracing::info!("Reconstructed {count} server(s) from existing containers");
            }
            Err(e) => {
                tracing::warn!("Failed to list containers for reconstruction: {e}");
            }
        }
    }

    // Shutdown signal
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(());

    // Start heartbeat
    heartbeat::start(state.clone(), shutdown_rx);

    // Build router and serve
    let app = server::build_router(state);
    let addr = format!("{}:{}", cfg.api.host, cfg.api.port);
    tracing::info!("Nexus Wings listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    let shutdown_signal = async {
        let ctrl_c = tokio::signal::ctrl_c();
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut sigterm) => {
                tokio::select! {
                    _ = ctrl_c => { tracing::info!("Received SIGINT"); }
                    _ = sigterm.recv() => { tracing::info!("Received SIGTERM"); }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to install SIGTERM handler: {e}, falling back to SIGINT only");
                let _ = ctrl_c.await;
                tracing::info!("Received SIGINT");
            }
        }
    };

    tracing::info!("Nexus Wings is ready");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal)
        .await?;

    tracing::info!("HTTP server stopped, cleaning up...");

    // Signal heartbeat and other tasks to stop
    let _ = shutdown_tx.send(());

    // Allow in-progress work to drain (up to 10s)
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;

    tracing::info!("Nexus Wings shutdown complete");
    Ok(())
}

async fn run_configure() -> anyhow::Result<()> {
    use std::io::{self, Write};

    println!("Nexus Wings — Configuration Wizard");
    println!("===================================\n");

    let mut panel_url = String::new();
    print!("Panel URL [http://localhost:3000]: ");
    io::stdout().flush()?;
    io::stdin().read_line(&mut panel_url)?;
    let panel_url = panel_url.trim();
    let panel_url = if panel_url.is_empty() {
        "http://localhost:3000"
    } else {
        panel_url
    };

    let mut token_id = String::new();
    print!("Daemon Token ID: ");
    io::stdout().flush()?;
    io::stdin().read_line(&mut token_id)?;
    let token_id = token_id.trim();

    let mut token = String::new();
    print!("Daemon Token: ");
    io::stdout().flush()?;
    io::stdin().read_line(&mut token)?;
    let token = token.trim();

    let mut port = String::new();
    print!("API Port [8080]: ");
    io::stdout().flush()?;
    io::stdin().read_line(&mut port)?;
    let port = port.trim();
    let port: u16 = if port.is_empty() {
        8080
    } else {
        port.parse().unwrap_or(8080)
    };

    let config = config::Config {
        panel: config::PanelConfig {
            url: panel_url.to_string(),
            token_id: token_id.to_string(),
            token: token.to_string(),
        },
        api: config::ApiConfig {
            host: "0.0.0.0".to_string(),
            port,
            tls_cert: None,
            tls_key: None,
        },
        docker: config::DockerConfig {
            socket: "/var/run/docker.sock".to_string(),
        },
        storage: config::StorageConfig {
            data_dir: "/var/lib/nexus-wings/data".to_string(),
        },
        logging: config::LoggingConfig {
            level: "info".to_string(),
            file: None,
        },
    };

    let config_dir = std::path::Path::new("/etc/nexus-wings");
    std::fs::create_dir_all(config_dir)?;
    let config_path = config_dir.join("config.toml");
    let toml_str = toml::to_string_pretty(&config)?;
    std::fs::write(&config_path, &toml_str)?;

    println!("\nConfiguration written to {}", config_path.display());
    Ok(())
}

async fn run_diagnostics(config_path: &PathBuf) -> anyhow::Result<()> {
    println!("Nexus Wings — Diagnostics");
    println!("=========================\n");

    // Check config
    print!("Configuration... ");
    match config::Config::load(config_path) {
        Ok(cfg) => {
            println!("OK ({})", config_path.display());

            // Check Docker
            print!("Docker connection... ");
            match docker::DockerManager::new(&cfg.docker.socket) {
                Ok(dm) => match dm.docker_version().await {
                    Ok(version) => println!("OK (Docker {version})"),
                    Err(e) => println!("FAILED ({e})"),
                },
                Err(e) => println!("FAILED ({e})"),
            }

            // Check Panel connectivity
            print!("Panel connectivity... ");
            println!("SKIPPED (requires HTTP client)");

            // Check data directory
            print!("Data directory... ");
            let data_path = std::path::Path::new(&cfg.storage.data_dir);
            if data_path.exists() {
                println!("OK ({})", cfg.storage.data_dir);
            } else {
                println!("MISSING ({})", cfg.storage.data_dir);
            }
        }
        Err(e) => {
            println!("FAILED ({e})");
        }
    }

    Ok(())
}
