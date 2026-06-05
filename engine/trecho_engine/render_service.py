import os
import sys
import json
import subprocess
import signal
from typing import Optional

from trecho_engine.errors import FFMPEG_FAILED, RENDER_CANCELLED, TrechoEngineError
from trecho_engine.render_plan import RenderPlan
from trecho_engine.ffmpeg_builder import FFmpegCommandBuilder
from trecho_engine.progress_parser import FFmpegProgressParser

class RenderService:
    def __init__(self, plan: RenderPlan, job_id: str = "default"):
        self.plan = plan
        self.job_id = job_id
        self.process: Optional[subprocess.Popen] = None
        self._interrupted = False

    def execute(self) -> None:
        """Executa o plano de renderização, reportando progresso via stdout."""
        try:
            # 1. Validação do plano
            # Precisamos obter a duração para validar se o fim não excede.
            # Como a validação da duração é opcional, validamos sem ela primeiro
            # e a CLI pode passar se tiver feito o probe antes.
            self.plan.validate()

            # 2. Constrói o comando FFmpeg
            command = FFmpegCommandBuilder.build(self.plan)

            # Remove arquivos parciais/incompletos anteriores se existirem no output
            self._cleanup_output()

            # Emite evento de início
            self._emit_event("render.started", {"jobId": self.job_id})

            # Calcula a duração do clipe em ms
            clip_duration_ms = self.plan.end_ms - self.plan.start_ms
            progress_parser = FFmpegProgressParser(clip_duration_ms)

            # 3. Inicia o subprocesso do FFmpeg
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                startupinfo=startupinfo
            )

            # Configura handlers de sinais para cancelamento limpo
            self._setup_signal_handlers()

            # Monitora o stdout do FFmpeg para ler o progresso (-progress pipe:1 envia para o stdout)
            last_progress = 0.0
            while True:
                if self.process.poll() is not None:
                    break
                
                line = self.process.stdout.readline()
                if not line:
                    continue
                
                progress = progress_parser.parse_line(line)
                if progress is not None:
                    # Evita disparar eventos de progresso redundantes ou decrescentes
                    if progress > last_progress:
                        last_progress = progress
                        self._emit_event("render.progress", {
                            "jobId": self.job_id,
                            "progress": round(progress, 1)
                        })

            # Aguarda o término do processo e pega os códigos
            stdout_rem, stderr_content = self.process.communicate()
            return_code = self.process.returncode

            if self._interrupted or return_code == -signal.SIGTERM or (return_code == 1 and RestorationExitCodeWindows()):
                # Nota: no Windows, matar o processo às vezes retorna exitcode 1 ou -1
                self._handle_cancellation()
            elif return_code != 0:
                # Ocorreu algum erro no FFmpeg
                # Vamos tentar ler as últimas linhas do stderr para dar detalhes úteis
                error_details = stderr_content.strip().split("\n")[-3:]
                error_msg = " ".join(error_details)
                raise TrechoEngineError(
                    code=FFMPEG_FAILED,
                    message="A renderização do vídeo falhou no FFmpeg.",
                    details=error_msg
                )
            else:
                # Sucesso
                self._emit_event("render.completed", {
                    "jobId": self.job_id,
                    "outputPath": self.plan.output_path
                })

        except TrechoEngineError as e:
            self._cleanup_output()
            self._emit_event("render.failed", {
                "jobId": self.job_id,
                "error": e.to_json()
            })
        except Exception as e:
            self._cleanup_output()
            self._emit_event("render.failed", {
                "jobId": self.job_id,
                "error": {
                    "code": FFMPEG_FAILED,
                    "message": "Erro inesperado durante a execução da renderização.",
                    "details": str(e)
                }
            })

    def _cleanup_output(self) -> None:
        """Apaga o arquivo de saída incompleto."""
        if os.path.exists(self.plan.output_path):
            try:
                os.remove(self.plan.output_path)
            except Exception:
                pass

    def _setup_signal_handlers(self) -> None:
        """Registra handlers de sinal para interromper o FFmpeg caso o Python receba sinal de morte."""
        def handle_signal(sig, frame):
            self._interrupted = True
            if self.process:
                self.process.terminate()
            self._cleanup_output()
            self._emit_event("render.failed", {
                "jobId": self.job_id,
                "error": {
                    "code": RENDER_CANCELLED,
                    "message": "A renderização foi cancelada pelo usuário."
                }
            })
            sys.exit(0)

        # Trata SIGINT (Ctrl+C) e SIGTERM
        try:
            signal.signal(signal.SIGINT, handle_signal)
            signal.signal(signal.SIGTERM, handle_signal)
        except ValueError:
            # Pode falhar se não estiver na thread principal (ex: em testes)
            pass

    def _handle_cancellation(self) -> None:
        """Limpa arquivos e emite evento de cancelamento."""
        self._cleanup_output()
        self._emit_event("render.failed", {
            "jobId": self.job_id,
            "error": {
                "code": RENDER_CANCELLED,
                "message": "A renderização foi cancelada."
            }
        })

    def _emit_event(self, event_type: str, data: dict) -> None:
        """Emite um JSON de evento de forma segura em uma linha no stdout."""
        event = {"type": event_type}
        event.update(data)
        print(json.dumps(event), flush=True)

def RestorationExitCodeWindows() -> bool:
    # No Windows, processos abortados costumam retornar códigos específicos
    # como 15 (SIGTERM simulado), 1, ou 255.
    return os.name == 'nt'
