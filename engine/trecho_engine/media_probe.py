import os
import json
import subprocess
import shutil
from typing import Dict, Any

from trecho_engine.errors import (
    FFPROBE_NOT_FOUND,
    MEDIA_PROBE_FAILED,
    SOURCE_MEDIA_NOT_FOUND,
    TrechoEngineError,
)

def find_ffprobe() -> str:
    """Verifica se o ffprobe está no PATH ou em algum diretório comum."""
    path = shutil.which("ffprobe")
    if path:
        return path
    raise TrechoEngineError(
        code=FFPROBE_NOT_FOUND,
        message="O ffprobe não foi encontrado no PATH do sistema.",
        details="Instale o FFmpeg e adicione a pasta bin ao PATH das Variáveis de Ambiente."
    )

def run_probe(input_path: str) -> Dict[str, Any]:
    """Executa ffprobe no arquivo fornecido e retorna metadados estruturados."""
    if not os.path.exists(input_path):
        raise TrechoEngineError(
            code=SOURCE_MEDIA_NOT_FOUND,
            message="O arquivo de vídeo original não foi encontrado.",
            details=f"Caminho procurado: {input_path}"
        )

    ffprobe_path = find_ffprobe()

    command = [
        ffprobe_path,
        "-v", "error",
        "-show_format",
        "-show_streams",
        "-of", "json",
        input_path
    ]

    try:
        # Executa no Windows ocultando a janela do console (opcional, mas bom para Tauri)
        startupinfo = None
        if os.name == 'nt':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE

        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            startupinfo=startupinfo,
            check=True
        )
        
        probe_data = json.loads(process.stdout)
        return parse_probe_result(probe_data)

    except subprocess.CalledProcessError as e:
        raise TrechoEngineError(
            code=MEDIA_PROBE_FAILED,
            message="Não foi possível analisar o vídeo.",
            details=e.stderr or str(e)
        )
    except json.JSONDecodeError as e:
        raise TrechoEngineError(
            code=MEDIA_PROBE_FAILED,
            message="O ffprobe retornou uma saída JSON inválida.",
            details=str(e)
        )
    except Exception as e:
        raise TrechoEngineError(
            code=MEDIA_PROBE_FAILED,
            message="Erro inesperado ao executar o ffprobe.",
            details=str(e)
        )

def parse_probe_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """Interpreta a estrutura retornada pelo ffprobe."""
    streams = data.get("streams", [])
    format_info = data.get("format", {})

    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if not video_stream:
        raise TrechoEngineError(
            code=MEDIA_PROBE_FAILED,
            message="O arquivo fornecido não contém nenhuma trilha de vídeo válida.",
            details=""
        )

    # Duração
    duration_sec = 0.0
    if "duration" in format_info:
        try:
            duration_sec = float(format_info["duration"])
        except ValueError:
            pass
    elif "duration" in video_stream:
        try:
            duration_sec = float(video_stream["duration"])
        except ValueError:
            pass
            
    duration_ms = int(duration_sec * 1000)

    # Resolução
    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))

    # Framerate
    frame_rate = 30.0
    avg_frame_rate = video_stream.get("avg_frame_rate", "30/1")
    if avg_frame_rate and avg_frame_rate != "0/0":
        try:
            if "/" in avg_frame_rate:
                num, den = avg_frame_rate.split("/")
                if float(den) > 0:
                    frame_rate = float(num) / float(den)
            else:
                frame_rate = float(avg_frame_rate)
        except (ValueError, ZeroDivisionError):
            pass

    video_codec = video_stream.get("codec_name", "")
    audio_codec = audio_stream.get("codec_name", "") if audio_stream else None

    # Limita o frame_rate para 2 casas decimais
    frame_rate = round(frame_rate, 2)

    return {
        "durationMs": duration_ms,
        "width": width,
        "height": height,
        "frameRate": frame_rate,
        "videoCodec": video_codec,
        "audioCodec": audio_codec
    }
