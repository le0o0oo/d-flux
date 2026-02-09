use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    time::{Duration, Instant},
};
use tauri::Emitter;

#[derive(Debug, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct ScanConfig {
    baud_rate: u32,
    timeout_ms: u64,
    parallelism: usize,
}

impl Default for ScanConfig {
    fn default() -> Self {
        Self {
            baud_rate: 9600,
            timeout_ms: 400,
            parallelism: 4,
        }
    }
}

#[derive(Debug, Serialize, Clone)]
struct ScanProgress {
    port: String,
    status: String,
}

#[derive(Debug, Serialize)]
pub struct DeviceInfo {
    port: String,
    id: String,
    name: Option<String>,
    org: Option<String>,
    fw: Option<String>,
    raw: HashMap<String, String>,
}

fn emit_progress(app: &tauri::AppHandle, port: &str, status: &str) {
    let _ = app.emit(
        "hc05-scan-progress",
        ScanProgress {
            port: port.to_string(),
            status: status.to_string(),
        },
    );
}

fn parse_whois(input: &str) -> HashMap<String, String> {
    input
        .split(';')
        .filter_map(|part| {
            let mut it = part.splitn(2, '=');
            let key = it.next()?.trim();
            if key.is_empty() {
                return None;
            }
            let value = it.next().unwrap_or("").trim();
            Some((key.to_string(), value.to_string()))
        })
        .collect()
}

fn scan_port(app: &tauri::AppHandle, port_name: &str, config: &ScanConfig) -> Option<DeviceInfo> {
    emit_progress(app, port_name, "scanning");

    let mut port = match serialport::new(port_name, config.baud_rate)
        .timeout(Duration::from_millis(50))
        .open()
    {
        Ok(port) => port,
        Err(_) => {
            emit_progress(app, port_name, "error");
            return None;
        }
    };

    if port.write_all(b"WHOIS\n").is_err() {
        emit_progress(app, port_name, "error");
        return None;
    }

    let deadline = Instant::now() + Duration::from_millis(config.timeout_ms);
    let mut buffer: Vec<u8> = Vec::new();
    let mut temp = [0u8; 256];

    while Instant::now() < deadline {
        match port.read(&mut temp) {
            Ok(read) => {
                if read > 0 {
                    buffer.extend_from_slice(&temp[..read]);
                }
            }
            Err(ref err) if err.kind() == std::io::ErrorKind::TimedOut => {}
            Err(_) => {
                emit_progress(app, port_name, "error");
                return None;
            }
        }
    }

    let response = String::from_utf8_lossy(&buffer).trim().to_string();
    if !response.starts_with("WHOIS") {
        emit_progress(app, port_name, "timeout");
        return None;
    }

    let stripped = response
        .strip_prefix("WHOIS")
        .unwrap_or(&response)
        .trim_start();
    let parsed = parse_whois(stripped);
    let id = match parsed.get("ID") {
        Some(id) => id.to_string(),
        None => {
            emit_progress(app, port_name, "error");
            return None;
        }
    };

    let device = DeviceInfo {
        port: port_name.to_string(),
        id,
        name: parsed.get("NAME").cloned(),
        org: parsed.get("ORG").cloned(),
        fw: parsed.get("FW").cloned(),
        raw: parsed,
    };

    emit_progress(app, port_name, "found");
    Some(device)
}

#[tauri::command]
pub async fn detect_hc05(
    app: tauri::AppHandle,
    config: ScanConfig,
) -> Result<Vec<DeviceInfo>, String> {
    let ports = serialport::available_ports().map_err(|err| err.to_string())?;

    let candidates: Vec<String> = ports
        .into_iter()
        .filter(|info| matches!(info.port_type, serialport::SerialPortType::Unknown))
        .map(|info| info.port_name)
        .collect();

    let parallelism = config.parallelism.max(1);
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(parallelism));

    let mut handles = Vec::with_capacity(candidates.len());
    for port in candidates {
        let app = app.clone();
        let config = config.clone();
        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|err| err.to_string())?;

        let handle = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            scan_port(&app, &port, &config)
        });

        handles.push(handle);
    }

    let mut results = Vec::new();
    for handle in handles {
        if let Ok(Some(device)) = handle.await {
            results.push(device);
        }
    }

    Ok(results)
}
