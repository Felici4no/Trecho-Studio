use std::process::Command;
use std::path::Path;
use std::os::windows::process::CommandExt;

use crate::errors::{AppError, AppResult};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub fn open_in_explorer(path: String) -> AppResult<()> {
    let target_path = Path::new(&path);
    if !target_path.exists() {
        return Err(AppError::new(
            "PROJECT_NOT_FOUND",
            "O arquivo ou pasta selecionada não existe mais no disco.",
            &path,
        ));
    }

    let abs_path = target_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("explorer.exe");
        if target_path.is_file() {
            // Se for arquivo, abre a pasta selecionando/destacando o arquivo
            cmd.args(&["/select,", &abs_path]);
        } else {
            // Se for diretório, apenas abre a pasta
            cmd.arg(&abs_path);
        }
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Err(e) = cmd.spawn() {
            return Err(AppError::new(
                "PERMISSION_DENIED",
                "Falha ao iniciar o Explorador do Windows.",
                &e.to_string(),
            ));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Fallback simples para macOS/Linux
        let cmd_name = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
        let mut cmd = Command::new(cmd_name);
        if target_path.is_file() {
            if let Some(parent) = target_path.parent() {
                cmd.arg(parent.to_string_lossy().to_string());
            } else {
                cmd.arg(&abs_path);
            }
        } else {
            cmd.arg(&abs_path);
        }

        if let Err(e) = cmd.spawn() {
            return Err(AppError::new(
                "PERMISSION_DENIED",
                "Falha ao abrir o local do arquivo.",
                &e.to_string(),
            ));
        }
    }

    Ok(())
}
