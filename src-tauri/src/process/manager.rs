use std::process::Command;
use std::sync::Mutex;
use std::os::windows::process::CommandExt;

// Flag para ocultação de console no Windows
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct ProcessManager {
    active_pid: Mutex<Option<u32>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            active_pid: Mutex::new(None),
        }
    }

    pub fn set_active_pid(&self, pid: u32) {
        let mut active = self.active_pid.lock().unwrap();
        *active = Some(pid);
    }

    pub fn clear_active_pid(&self) {
        let mut active = self.active_pid.lock().unwrap();
        *active = None;
    }

    pub fn get_active_pid(&self) -> Option<u32> {
        let active = self.active_pid.lock().unwrap();
        *active
    }

    pub fn kill_active_process(&self) -> Result<(), String> {
        let pid_to_kill = {
            let active = self.active_pid.lock().unwrap();
            *active
        };

        if let Some(pid) = pid_to_kill {
            #[cfg(target_os = "windows")]
            {
                // No Windows, usa-se taskkill /F /T /PID para encerrar o processo e seus descendentes (FFmpeg)
                let mut cmd = Command::new("taskkill");
                cmd.args(&["/F", "/T", "/PID", &pid.to_string()]);
                cmd.creation_flags(CREATE_NO_WINDOW);

                match cmd.output() {
                    Ok(output) => {
                        if output.status.success() {
                            let mut active = self.active_pid.lock().unwrap();
                            *active = None;
                            Ok(())
                        } else {
                            Err(String::from_utf8_lossy(&output.stderr).to_string())
                        }
                    }
                    Err(e) => Err(e.to_string()),
                }
            }

            #[cfg(not(target_os = "windows"))]
            {
                // Em sistemas Unix, mata por sinal de morte do processo principal
                // Em produção real, poderíamos matar o grupo de processos, mas para o MVP
                // isso funciona como fallback simples
                let mut cmd = Command::new("kill");
                cmd.args(&["-9", &pid.to_string()]);
                match cmd.output() {
                    Ok(output) => {
                        if output.status.success() {
                            let mut active = self.active_pid.lock().unwrap();
                            *active = None;
                            Ok(())
                        } else {
                            Err(String::from_utf8_lossy(&output.stderr).to_string())
                        }
                    }
                    Err(e) => Err(e.to_string()),
                }
            }
        } else {
            Ok(())
        }
    }
}
