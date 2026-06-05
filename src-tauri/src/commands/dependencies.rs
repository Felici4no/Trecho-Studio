use std::fs;
use std::path::Path;
use serde::Serialize;

use crate::errors::AppError;
use crate::process::resolver::{resolve_tool, ResolvedTool};

#[derive(Debug, Serialize, Clone)]
pub struct DependencyStatus {
    pub python: ResolvedTool,
    pub ffmpeg: ResolvedTool,
    pub ffprobe: ResolvedTool,
    #[serde(rename = "workspaceOk")]
    pub workspace_ok: bool,
    #[serde(rename = "allOk")]
    pub all_ok: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct WorkspaceValidationResult {
    pub success: bool,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
}

#[tauri::command]
pub fn check_system_dependencies(
    app_handle: tauri::AppHandle,
    workspace_path: String,
) -> Result<DependencyStatus, AppError> {
    let python = resolve_tool("python", Some(&app_handle));
    let ffmpeg = resolve_tool("ffmpeg", Some(&app_handle));
    let ffprobe = resolve_tool("ffprobe", Some(&app_handle));

    let mut workspace_ok = false;
    if !workspace_path.is_empty() {
        let path = Path::new(&workspace_path);
        if path.exists() {
            let test_file = path.join(".trecho_write_test");
            if fs::write(&test_file, "test").is_ok() {
                workspace_ok = true;
                let _ = fs::remove_file(test_file);
            }
        }
    }

    let all_ok = python.available && ffmpeg.available && ffprobe.available && workspace_ok;

    Ok(DependencyStatus {
        python,
        ffmpeg,
        ffprobe,
        workspace_ok,
        all_ok,
    })
}

#[tauri::command]
pub fn validate_workspace(path: String) -> Result<WorkspaceValidationResult, AppError> {
    if path.is_empty() {
        return Ok(WorkspaceValidationResult {
            success: false,
            error_message: Some("O caminho do workspace não pode ser vazio.".to_string()),
        });
    }

    let folder_path = Path::new(&path);

    // Tenta criar o diretório caso não exista
    if !folder_path.exists() {
        if let Err(e) = fs::create_dir_all(folder_path) {
            return Ok(WorkspaceValidationResult {
                success: false,
                error_message: Some(format!("Não foi possível criar o diretório do workspace: {}", e)),
            });
        }
    }

    // Tenta criar o arquivo temporário
    let test_file = folder_path.join(".trecho_write_test");
    if let Err(e) = fs::write(&test_file, "workspace_test") {
        return Ok(WorkspaceValidationResult {
            success: false,
            error_message: Some(format!(
                "Sem permissão de escrita no diretório selecionado. Detalhes: {}",
                e
            )),
        });
    }

    // Tenta ler o arquivo
    match fs::read_to_string(&test_file) {
        Ok(content) => {
            if content != "workspace_test" {
                let _ = fs::remove_file(&test_file);
                return Ok(WorkspaceValidationResult {
                    success: false,
                    error_message: Some("Erro na validação de integridade dos arquivos.".to_string()),
                });
            }
        }
        Err(e) => {
            let _ = fs::remove_file(&test_file);
            return Ok(WorkspaceValidationResult {
                success: false,
                error_message: Some(format!("Erro ao ler o arquivo temporário de teste: {}", e)),
            });
        }
    }

    // Tenta remover o arquivo
    if let Err(e) = fs::remove_file(&test_file) {
        return Ok(WorkspaceValidationResult {
            success: false,
            error_message: Some(format!("Não foi possível limpar o arquivo temporário de teste: {}", e)),
        });
    }

    Ok(WorkspaceValidationResult {
        success: true,
        error_message: None,
    })
}
