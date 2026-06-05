mod commands {
    pub mod dependencies;
    pub mod engine;
    pub mod filesystem;
    pub mod opener;
}
mod process {
    pub mod manager;
}
mod errors;

use std::sync::Arc;
use process::manager::ProcessManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let process_manager = Arc::new(ProcessManager::new());
    let process_manager_clone = Arc::clone(&process_manager);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(process_manager)
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Ao fechar a janela, garante que o processo FFmpeg ativo não fique órfão
                let _ = process_manager_clone.kill_active_process();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::dependencies::check_system_dependencies,
            commands::engine::probe_video,
            commands::engine::start_render,
            commands::engine::cancel_render,
            commands::filesystem::load_project_json,
            commands::filesystem::save_project_json,
            commands::filesystem::copy_project_video,
            commands::filesystem::write_text_file,
            commands::opener::open_in_explorer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
