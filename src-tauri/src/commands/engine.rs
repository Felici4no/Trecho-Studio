use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::os::windows::process::CommandExt;

use tauri::{AppHandle, Emitter, State};

use crate::errors::{AppError, AppResult};
use crate::process::manager::ProcessManager;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub fn probe_video(input_path: String) -> AppResult<String> {
    let mut cmd = Command::new("python");
    cmd.args(&["-m", "trecho_engine.cli", "probe", "--input", &input_path]);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.spawn() {
        Ok(child) => {
            let output = child.wait_with_output().map_err(|e| {
                AppError::new(
                    "MEDIA_PROBE_FAILED",
                    "Falha ao ler resultado da análise do ffprobe.",
                    &e.to_string(),
                )
            })?;

            if output.status.success() {
                let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(stdout_str)
            } else {
                let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
                Err(AppError::new(
                    "MEDIA_PROBE_FAILED",
                    "O motor do ffprobe encerrou com erro.",
                    &stderr_str,
                ))
            }
        }
        Err(e) => Err(AppError::new(
            "PYTHON_NOT_FOUND",
            "Não foi possível iniciar o Python para análise.",
            &e.to_string(),
        )),
    }
}

#[tauri::command]
pub fn start_render(
    app_handle: AppHandle,
    manager: State<'_, Arc<ProcessManager>>,
    plan_json: String,
    job_id: String,
) -> AppResult<()> {
    // Verifica se já existe renderização em andamento
    if manager.get_active_pid().is_some() {
        return Err(AppError::new(
            "RENDER_ALREADY_RUNNING",
            "Já existe um processo de renderização ativo. Cancele-o primeiro.",
            "",
        ));
    }

    let manager_clone = Arc::clone(&manager);

    // Spawna uma tarefa assíncrona do Tauri para ler o stdout
    tauri::async_runtime::spawn(async move {
        let mut cmd = Command::new("python");
        cmd.args(&["-m", "trecho_engine.cli", "render", "--plan", &plan_json, "--job-id", &job_id]);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.spawn() {
            Ok(mut child) => {
                let pid = child.id();
                manager_clone.set_active_pid(pid);

                // Lê o stdout linha por linha e envia eventos ao React
                if let Some(stdout) = child.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line_str) = line {
                            // Envia o JSON Lines recebido para o frontend
                            let _ = app_handle.emit("render-event", line_str);
                        }
                    }
                }

                // Aguarda o término
                let _ = child.wait();
                manager_clone.clear_active_pid();
            }
            Err(e) => {
                // Emite evento de falha caso não consiga rodar o comando Python
                let err_json = serde_json::json!({
                    "type": "render.failed",
                    "jobId": job_id,
                    "error": {
                        "code": "PYTHON_NOT_FOUND",
                        "message": "Não foi possível iniciar o Python para renderização.",
                        "details": e.to_string()
                    }
                });
                let _ = app_handle.emit("render-event", err_json.to_string());
                manager_clone.clear_active_pid();
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn cancel_render(manager: State<'_, Arc<ProcessManager>>) -> AppResult<()> {
    match manager.kill_active_process() {
        Ok(_) => Ok(()),
        Err(e) => Err(AppError::new(
            "FFMPEG_FAILED",
            "Falha ao cancelar o processo de renderização.",
            &e,
        )),
    }
}
