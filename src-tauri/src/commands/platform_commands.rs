use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct PlatformInfo {
    #[serde(rename = "appVersion")]
    app_version: String,
    #[serde(rename = "osPlatform")]
    os_platform: String,
}

#[tauri::command]
pub async fn get_platform_info(app: tauri::AppHandle) -> Result<PlatformInfo, String> {
    let app_version = app.package_info().version.to_string();
    let os_platform = tauri_plugin_os::platform().to_string();
    Ok(PlatformInfo {
        app_version,
        os_platform,
    })
}

#[tauri::command]
pub async fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}
