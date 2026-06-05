import os
import shutil
from typing import List
from trecho_engine.render_plan import RenderPlan
from trecho_engine.errors import FFMPEG_NOT_FOUND, TrechoEngineError

class FFmpegCommandBuilder:
    @staticmethod
    def find_ffmpeg() -> str:
        """Verifica se o ffmpeg está configurado ou no PATH do sistema."""
        # 1. Prioriza caminho configurado explicitamente no ambiente (passado pelo Rust)
        env_path = os.environ.get("TRECHO_FFMPEG_PATH")
        if env_path and os.path.exists(env_path):
            return env_path

        # 2. PATH do sistema
        path = shutil.which("ffmpeg")
        if path:
            return path

        raise TrechoEngineError(
            code=FFMPEG_NOT_FOUND,
            message="O ffmpeg não foi encontrado no PATH do sistema.",
            details="Por favor, instale o FFmpeg e adicione a pasta bin ao PATH."
        )

    @staticmethod
    def build(plan: RenderPlan) -> List[str]:
        """Gera os argumentos do FFmpeg a partir de um RenderPlan."""
        ffmpeg_path = FFmpegCommandBuilder.find_ffmpeg()

        start_seconds = f"{plan.start_ms / 1000.0:.3f}"
        duration_seconds = f"{(plan.end_ms - plan.start_ms) / 1000.0:.3f}"

        # Montagem do filtro de vídeo
        w, h = plan.width, plan.height
        if plan.crop_mode == "cover":
            # Scale e crop central
            video_filter = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
        else:
            # Scale e pad (barras pretas)
            video_filter = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black"

        # Comando em formato de lista (sem shell=True)
        command = [
            ffmpeg_path,
            "-y",                                    # Sobrescrever saída se já existir
            "-ss", start_seconds,                    # Início do corte
            "-i", plan.input_path,                   # Input file
            "-t", duration_seconds,                  # Duração do corte
            "-vf", video_filter,                     # Filtros de vídeo
            "-c:v", plan.video_codec,                # Codec de vídeo (libx264)
            "-preset", "medium",                     # Preset de compressão
            "-crf", "20",                            # Fator de qualidade constante
            "-c:a", plan.audio_codec,                # Codec de áudio (aac)
            "-b:a", "192k",                          # Bitrate de áudio
            "-movflags", "+faststart",               # Permite play rápido na web/electron
            "-progress", "pipe:1",                   # Emite progresso no stdout
            "-nostats",                              # Desabilita o stats tradicional no stderr
            plan.output_path                         # Caminho do output
        ]

        return command
