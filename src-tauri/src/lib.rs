use tauri::{Emitter, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                println!("Closing");
                let _ = window.emit("app-close-requested", ());
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_android_fs::init())
        .plugin(tauri_plugin_blec::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
