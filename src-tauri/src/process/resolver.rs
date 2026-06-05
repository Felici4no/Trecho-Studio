use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolvedTool {
    pub available: bool,
    pub source: String, // "configured" | "local" | "system" | "missing"
    #[serde(rename = "executablePath")]
    pub executable_path: String,
    pub version: String,
}

const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Busca a raiz do projeto em desenvolvimento subindo os diretórios a partir do executável
fn find_project_root_dev() -> Option<PathBuf> {
    if let Ok(exe_path) = env::current_exe() {
        let mut current = exe_path.parent();
        while let Some(path) = current {
            // Se encontrar package.json, src-tauri ou engine, assume que é a raiz do projeto
            if path.join("package.json").exists() || path.join("src-tauri").exists() || path.join("engine").exists() {
                return Some(path.to_path_buf());
            }
            current = path.parent();
        }
    }
    None
}

/// Procura por candidatos do FFmpeg/ffprobe dentro de uma pasta base
fn find_ffmpeg_candidate(base_dir: &Path, tool_name: &str) -> Option<PathBuf> {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
    let filename = format!("{}{}", tool_name, ext);

    // Candidato 1: ffmpeg/bin/tool.exe
    let path1 = base_dir.join("ffmpeg").join("bin").join(&filename);
    if path1.exists() {
        return Some(path1);
    }

    // Candidato 2: resources/ffmpeg/tool.exe
    let path2 = base_dir.join("resources").join("ffmpeg").join(&filename);
    if path2.exists() {
        return Some(path2);
    }

    // Candidato 3: ffmpeg/tool.exe
    let path3 = base_dir.join("ffmpeg").join(&filename);
    if path3.exists() {
        return Some(path3);
    }

    // Candidato 4: ffmpeg/*/bin/tool.exe (resolução genérica de subdiretório)
    let ffmpeg_dir = base_dir.join("ffmpeg");
    if ffmpeg_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(ffmpeg_dir) {
            for entry in entries.flatten() {
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    let sub_bin = entry.path().join("bin").join(&filename);
                    if sub_bin.exists() {
                        return Some(sub_bin);
                    }
                }
            }
        }
    }

    None
}

/// Retorna a versão de um executável rodando-o com comandos de versão
fn get_tool_version(executable_path: &Path, tool_name: &str) -> String {
    let mut cmd = Command::new(executable_path);
    if tool_name == "python" {
        cmd.args(&["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"]);
    } else {
        cmd.arg("-version");
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    if let Ok(output) = cmd.output() {
        if output.status.success() {
            let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if tool_name == "python" {
                return stdout_str;
            } else {
                // FFmpeg / ffprobe: pega a primeira linha e extrai a versão
                if let Some(first_line) = stdout_str.lines().next() {
                    // Espera "ffmpeg version 8.1.1..."
                    let parts: Vec<&str> = first_line.split_whitespace().collect();
                    if parts.len() >= 3 && parts[1] == "version" {
                        return parts[2].to_string();
                    }
                    return first_line.to_string();
                }
            }
        } else {
            // Em alguns sistemas, comandos de versão escrevem no stderr
            let stderr_str = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if let Some(first_line) = stderr_str.lines().next() {
                return first_line.to_string();
            }
        }
    }
    "Desconhecida".to_string()
}

/// Busca no PATH do sistema por um executável
fn find_in_system_path(tool_name: &str) -> Option<PathBuf> {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
    let filename = format!("{}{}", tool_name, ext);

    if let Ok(path_env) = env::var("PATH") {
        let separator = if cfg!(target_os = "windows") { ";" } else { ":" };
        for path_dir in path_env.split(separator) {
            let full_path = Path::new(path_dir).join(&filename);
            if full_path.exists() {
                return Some(full_path);
            }
        }
    }
    None
}

/// Centraliza a resolução de dependências conforme a prioridade especificada
pub fn resolve_tool(name: &str, app_handle: Option<&tauri::AppHandle>) -> ResolvedTool {
    let mut resolved_path: Option<(String, PathBuf)> = None;

    // 1. Variável de ambiente configurada pelo usuário
    let env_var_name = match name {
        "python" => "TRECHO_PYTHON_PATH",
        "ffmpeg" => "TRECHO_FFMPEG_PATH",
        "ffprobe" => "TRECHO_FFPROBE_PATH",
        _ => "",
    };
    if !env_var_name.is_empty() {
        if let Ok(env_path) = env::var(env_var_name) {
            let path = PathBuf::from(&env_path);
            if path.exists() {
                resolved_path = Some(("configured".to_string(), path));
            }
        }
    }

    // 2. resource_dir do Tauri (se fornecido)
    if resolved_path.is_none() {
        if let Some(handle) = app_handle {
            use tauri::Manager;
            if let Ok(resource_dir) = handle.path().resource_dir() {
                if name == "python" {
                    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
                    let python_local = resource_dir.join("python-embed").join(format!("python{}", ext));
                    if python_local.exists() {
                        resolved_path = Some(("local".to_string(), python_local));
                    }
                } else if let Some(cand) = find_ffmpeg_candidate(&resource_dir, name) {
                    resolved_path = Some(("local".to_string(), cand));
                }
            }
        }
    }

    // 3. Diretório do executável
    if resolved_path.is_none() {
        if let Ok(exe_path) = env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                if name == "python" {
                    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
                    let python_local = exe_dir.join("python-embed").join(format!("python{}", ext));
                    if python_local.exists() {
                        resolved_path = Some(("local".to_string(), python_local));
                    }
                } else if let Some(cand) = find_ffmpeg_candidate(exe_dir, name) {
                    resolved_path = Some(("local".to_string(), cand));
                }
            }
        }
    }

    // 4. Raiz do projeto em desenvolvimento
    if resolved_path.is_none() {
        if let Some(root_dir) = find_project_root_dev() {
            if name == "python" {
                let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
                let python_local = root_dir.join("python-embed").join(format!("python{}", ext));
                if python_local.exists() {
                    resolved_path = Some(("local".to_string(), python_local));
                }
            } else if let Some(cand) = find_ffmpeg_candidate(&root_dir, name) {
                resolved_path = Some(("local".to_string(), cand));
            }
        }
    }

    // 5. PATH do sistema
    if resolved_path.is_none() {
        if let Some(system_path) = find_in_system_path(name) {
            resolved_path = Some(("system".to_string(), system_path));
        }
    }

    // Retorna o resultado
    match resolved_path {
        Some((source, path)) => {
            // Limpa o caminho para formato absoluto absoluto e legível
            let abs_path = path.to_string_lossy().to_string();
            let version = get_tool_version(&path, name);
            ResolvedTool {
                available: true,
                source,
                executable_path: abs_path,
                version,
            }
        }
        None => ResolvedTool {
            available: false,
            source: "missing".to_string(),
            executable_path: String::new(),
            version: String::new(),
        },
    }
}
