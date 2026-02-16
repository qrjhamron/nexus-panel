use bollard::container::{
    Config as ContainerConfig, CreateContainerOptions, LogOutput, LogsOptions,
    RemoveContainerOptions, StartContainerOptions, WaitContainerOptions,
};
use bollard::models::HostConfig;
use futures_util::StreamExt;

use crate::docker::{DockerManager, ServerConfig};
use crate::error::WingsError;

pub async fn run_install(
    docker: &DockerManager,
    server_config: &ServerConfig,
    script: &str,
    install_image: &str,
    panel_url: Option<&str>,
    panel_auth: Option<&str>,
) -> Result<Vec<String>, WingsError> {
    let container_name = format!("nexus-install-{}", server_config.uuid);

    let host_config = HostConfig {
        binds: Some(vec![format!("{}:/server", server_config.volume_path)]),
        ..Default::default()
    };

    let container_config = ContainerConfig {
        image: Some(install_image.to_string()),
        cmd: Some(vec![
            "/bin/sh".to_string(),
            "-c".to_string(),
            script.to_string(),
        ]),
        host_config: Some(host_config),
        working_dir: Some("/server".to_string()),
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        ..Default::default()
    };

    // Access the inner Docker client via a helper
    let client = docker.client();

    // Clean up any leftover container
    let _ = client
        .remove_container(
            &container_name,
            Some(RemoveContainerOptions {
                force: true,
                ..Default::default()
            }),
        )
        .await;

    client
        .create_container(
            Some(CreateContainerOptions {
                name: container_name.as_str(),
                platform: None,
            }),
            container_config,
        )
        .await
        .map_err(WingsError::Docker)?;

    client
        .start_container(
            &container_name,
            None::<StartContainerOptions<String>>,
        )
        .await
        .map_err(WingsError::Docker)?;

    // Collect logs
    let mut output_lines = Vec::new();
    let mut log_stream = client.logs::<String>(
        &container_name,
        Some(LogsOptions {
            follow: true,
            stdout: true,
            stderr: true,
            ..Default::default()
        }),
    );

    while let Some(result) = log_stream.next().await {
        match result {
            Ok(LogOutput::StdOut { message }) | Ok(LogOutput::StdErr { message }) => {
                let line = String::from_utf8_lossy(&message).to_string();
                output_lines.push(line);
            }
            _ => {}
        }
    }

    // Wait for container to finish
    let mut wait_stream =
        client.wait_container::<String>(&container_name, Some(WaitContainerOptions::default()));

    if let Some(result) = wait_stream.next().await {
        let wait_result = result.map_err(WingsError::Docker)?;
        if wait_result.status_code != 0 {
            // Notify Panel of install failure
            if let (Some(url), Some(auth)) = (panel_url, panel_auth) {
                let callback_url = format!(
                    "{}/api/v1/servers/{}/install-status",
                    url.trim_end_matches('/'),
                    server_config.uuid
                );
                let client = reqwest::Client::new();
                let last_lines: Vec<String> = output_lines.iter().rev().take(50).rev().cloned().collect();
                let status_body = serde_json::json!({
                    "status": "failed",
                    "message": last_lines.join("\n")
                });
                let _ = client
                    .post(&callback_url)
                    .header("Authorization", format!("Bearer {auth}"))
                    .json(&status_body)
                    .send()
                    .await;
            }

            let _ = client
                .remove_container(
                    &container_name,
                    Some(RemoveContainerOptions {
                        force: true,
                        ..Default::default()
                    }),
                )
                .await;
            return Err(WingsError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!(
                    "Install script exited with code {}",
                    wait_result.status_code
                ),
            )));
        }
    }

    // Notify Panel of install success
    if let (Some(url), Some(auth)) = (panel_url, panel_auth) {
        let callback_url = format!(
            "{}/api/v1/servers/{}/install-status",
            url.trim_end_matches('/'),
            server_config.uuid
        );
        let http_client = reqwest::Client::new();
        let status_body = serde_json::json!({
            "status": "success"
        });
        if let Err(e) = http_client
            .post(&callback_url)
            .header("Authorization", format!("Bearer {auth}"))
            .json(&status_body)
            .send()
            .await
        {
            tracing::warn!("Failed to notify Panel of install success: {e}");
        }
    }

    // Clean up
    let _ = client
        .remove_container(
            &container_name,
            Some(RemoveContainerOptions {
                force: true,
                ..Default::default()
            }),
        )
        .await;

    Ok(output_lines)
}
