use std::process::Command;
use std::fs;
use std::path::Path;
use serde::Serialize;
use std::os::windows::process::CommandExt;

use crate::errors::AppError;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Clone)]
pub struct DependencyStatus {
    #[serde(rename = "pythonOk")]
    pub python_ok: bool,
    #[serde(rename = "pythonVersion")]
    pub python_version: String,
    #[serde(rename = "ffmpegOk")]
    pub ffmpeg_ok: bool,
    #[serde(rename = "ffprobeOk")]
    pub ffprobe_ok: bool,
    #[serde(rename = "workspaceOk")]
    pub workspace_ok: bool,
    #[serde(rename = "allOk")]
    pub all_ok: bool,
}

#[tauri::command]
pub fn check_system_dependencies(workspace_path: String) -> Result<DependencyStatus, AppError> {
    let mut status = DependencyStatus {
        python_ok: false,
        python_version: String::new(),
        ffmpeg_ok: false,
        ffprobe_ok: false,
        workspace_ok: false,
        all_ok: false,
    };

    // 1. Verifica Python 3.11+
    // Executa comando para obter a versão de forma estruturada: major.minor
    let mut python_cmd = Command::new("python");
    python_cmd.args(&["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"]);
    #[cfg(target_os = "windows")]
    python_cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(output) = python_cmd.output() {
        if output.status.success() {
            let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            status.python_version = version_str.clone();
            
            let parts: Vec<&str> = version_str.split('.').collect();
            if parts.len() >= 2 {
                if let (Ok(major), Ok(minor)) = (parts[0].parse::<i32>(), parts[1].parse::<i32>()) {
                    if major == 3 && minor >= 11 {
                        status.python_ok = true;
                    }
                }
            }
        }
    }

    // 2. Verifica FFmpeg
    let mut ffmpeg_cmd = Command::new("ffmpeg");
    ffmpeg_cmd.arg("-version");
    #[cfg(target_os = "windows")]
    ffmpeg_cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(output) = ffmpeg_cmd.output() {
        if output.status.success() {
            status.ffmpeg_ok = true;
        }
    }

    // 3. Verifica ffprobe
    let mut ffprobe_cmd = Command::new("ffprobe");
    ffprobe_cmd.arg("-version");
    #[cfg(target_os = "windows")]
    ffprobe_cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(output) = ffprobe_cmd.output() {
        if output.status.success() {
            status.ffprobe_ok = true;
        }
    }

    // 4. Verifica escrita no workspace
    if !workspace_path.is_empty() {
        let path = Path::new(&workspace_path);
        if path.exists() {
            // Tenta criar um arquivo temporário de teste
            let test_file = path.join(".trecho_write_test");
            if fs::write(&test_file, "test").is_ok() {
                status.workspace_ok = true;
                let _ = fs::remove_file(test_file);
            }
        } else {
            // Se o diretório não existe, tenta criar para ver se há permissão
            if fs::create_dir_all(path).is_ok() {
                status.workspace_ok = true;
                // Deixa criado como raiz do workspace
            }
        }
    } else {
        // Se vazio, consideramos provisoriamente ok para o diagnóstico global
        status.workspace_ok = true;
    }

    status.all_ok = status.python_ok && status.ffmpeg_ok && status.ffprobe_ok && status.workspace_ok;

    Ok(status)
}
