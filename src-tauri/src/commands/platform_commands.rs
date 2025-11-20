use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct PlatformInfo {
    #[serde(rename = "appVersion")]
    app_version: String,
    #[serde(rename = "os")]
    os: String,
    #[serde(rename = "osVersion")]
    os_version: String,
    #[serde(rename = "arch")]
    arch: String,
}

/// Returns platform information including app version, OS, OS version, and architecture.
///
/// # Returns
///
/// A `PlatformInfo` struct containing:
/// - `appVersion`: The application version from Cargo.toml
/// - `os`: The operating system platform (e.g., "windows", "macos", "linux")
/// - `osVersion`: The OS version string
/// - `arch`: The system architecture (e.g., "x86_64", "aarch64")
///
/// # Errors
///
/// Returns an error string if platform information cannot be retrieved.
#[tauri::command]
pub async fn get_platform_info(app: tauri::AppHandle) -> Result<PlatformInfo, String> {
    let app_version = app.package_info().version.to_string();
    let os = tauri_plugin_os::platform().to_string();
    
    // Get OS version - version() returns a Version enum, convert to string
    let os_version = tauri_plugin_os::version().to_string();
    
    // Get architecture using std::env
    let arch = std::env::consts::ARCH.to_string();
    
    Ok(PlatformInfo {
        app_version,
        os,
        os_version,
        arch,
    })
}

#[tauri::command]
pub async fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}
