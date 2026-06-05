use std::fs;
use std::path::Path;
use serde_json::Value;

use crate::errors::{AppError, AppResult};

#[tauri::command]
pub fn load_project_json(path: String) -> AppResult<String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(AppError::new(
            "PROJECT_NOT_FOUND",
            "O arquivo de projeto não foi encontrado.",
            &path,
        ));
    }

    match fs::read_to_string(file_path) {
        Ok(content) => {
            // Valida o JSON lido
            if serde_json::from_str::<Value>(&content).is_err() {
                return Err(AppError::new(
                    "PROJECT_FILE_CORRUPTED",
                    "O arquivo do projeto está corrompido e não é um JSON válido.",
                    &path,
                ));
            }
            Ok(content)
        }
        Err(e) => Err(AppError::new(
            "PERMISSION_DENIED",
            "Não foi possível ler o arquivo do projeto.",
            &e.to_string(),
        )),
    }
}

#[tauri::command]
pub fn save_project_json(path: String, content: String) -> AppResult<()> {
    let file_path = Path::new(&path);

    // 1. Validação sintática do JSON
    if serde_json::from_str::<Value>(&content).is_err() {
        return Err(AppError::new(
            "PROJECT_INVALID",
            "Os dados fornecidos para salvar o projeto são inválidos.",
            "Falha ao interpretar dados como JSON estruturado.",
        ));
    }

    // Garante que a pasta de destino exista
    if let Some(parent) = file_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(AppError::new(
                "OUTPUT_DIRECTORY_UNAVAILABLE",
                "Não foi possível criar o diretório do projeto.",
                &e.to_string(),
            ));
        }
    }

    // 2. Definir caminhos temporário e de backup
    let tmp_path = format!("{}.tmp", path);
    let backup_path = format!("{}.backup", path);

    let tmp_path_obj = Path::new(&tmp_path);
    let backup_path_obj = Path::new(&backup_path);

    // 3. Escrever primeiro no arquivo temporário
    if let Err(e) = fs::write(tmp_path_obj, &content) {
        return Err(AppError::new(
            "PERMISSION_DENIED",
            "Não foi possível gravar o arquivo temporário do projeto.",
            &e.to_string(),
        ));
    }

    // 4. Se o projeto original existir, faz backup dele
    if file_path.exists() {
        if let Err(e) = fs::copy(file_path, backup_path_obj) {
            // Deleta o temp e retorna erro
            let _ = fs::remove_file(tmp_path_obj);
            return Err(AppError::new(
                "PERMISSION_DENIED",
                "Falha ao criar o arquivo de backup do projeto anterior.",
                &e.to_string(),
            ));
        }
    }

    // 5. Substitui o arquivo original renomeando o temporário
    // No Windows, rename falha se o destino já existir, então removemos antes se houver
    if file_path.exists() {
        if let Err(e) = fs::remove_file(file_path) {
            let _ = fs::remove_file(tmp_path_obj);
            return Err(AppError::new(
                "PERMISSION_DENIED",
                "Falha ao substituir o arquivo do projeto original.",
                &e.to_string(),
            ));
        }
    }

    if let Err(e) = fs::rename(tmp_path_obj, file_path) {
        return Err(AppError::new(
            "PERMISSION_DENIED",
            "Falha ao finalizar gravação atômica do projeto.",
            &e.to_string(),
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn copy_project_video(source_path: String, dest_path: String) -> AppResult<()> {
    let src = Path::new(&source_path);
    let dest = Path::new(&dest_path);

    if !src.exists() {
        return Err(AppError::new(
            "SOURCE_MEDIA_NOT_FOUND",
            "O arquivo de vídeo de origem não foi encontrado para cópia.",
            &source_path,
        ));
    }

    if let Some(parent) = dest.parent() {
        let _ = fs::create_dir_all(parent);
    }

    match fs::copy(src, dest) {
        Ok(_) => Ok(()),
        Err(e) => Err(AppError::new(
            "PERMISSION_DENIED",
            "Falha ao copiar o vídeo original para a pasta do projeto.",
            &e.to_string(),
        )),
    }
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> AppResult<()> {
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(file_path, content).map_err(|e| {
        AppError::new(
            "PERMISSION_DENIED",
            "Não foi possível criar o arquivo de texto.",
            &e.to_string(),
        )
    })
}

