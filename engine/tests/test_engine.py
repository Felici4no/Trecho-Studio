import os
import pytest
from unittest.mock import patch, MagicMock

from trecho_engine.errors import (
    FFMPEG_NOT_FOUND,
    INVALID_CLIP_RANGE,
    OUTPUT_FILE_ALREADY_EXISTS,
    SOURCE_MEDIA_NOT_FOUND,
    TrechoEngineError,
)
from trecho_engine.render_plan import RenderPlan
from trecho_engine.ffmpeg_builder import FFmpegCommandBuilder
from trecho_engine.progress_parser import FFmpegProgressParser
from trecho_engine.media_probe import parse_probe_result
from trecho_engine.render_service import RenderService

# Fixture para um plano de renderização básico válido
@pytest.fixture
def valid_plan(tmp_path):
    input_file = tmp_path / "original.mp4"
    input_file.write_text("dummy video content")
    output_file = tmp_path / "clip.mp4"
    return RenderPlan(
        input_path=str(input_file),
        output_path=str(output_file),
        start_ms=5000,
        end_ms=15000,
        width=1080,
        height=1920,
        aspect_ratio="9:16",
        crop_mode="cover"
    )

def test_render_plan_validation(valid_plan):
    # Plano válido não deve levantar exceções
    valid_plan.validate(duration_ms=20000)

    # 1. Início negativo
    plan = RenderPlan(**{**valid_plan.__dict__, "start_ms": -1000})
    with pytest.raises(TrechoEngineError) as exc_info:
        plan.validate()
    assert exc_info.value.code == INVALID_CLIP_RANGE

    # 2. Fim menor ou igual ao início
    plan = RenderPlan(**{**valid_plan.__dict__, "end_ms": 4000})
    with pytest.raises(TrechoEngineError) as exc_info:
        plan.validate()
    assert exc_info.value.code == INVALID_CLIP_RANGE

    # 3. Fim excede a duração significativamente
    with pytest.raises(TrechoEngineError) as exc_info:
        valid_plan.validate(duration_ms=10000)
    assert exc_info.value.code == INVALID_CLIP_RANGE

    # 4. Saída sobrescreve a entrada
    plan = RenderPlan(**{**valid_plan.__dict__, "output_path": valid_plan.input_path})
    with pytest.raises(TrechoEngineError) as exc_info:
        plan.validate()
    assert exc_info.value.code == OUTPUT_FILE_ALREADY_EXISTS

    # 5. Entrada não existe
    plan = RenderPlan(**{**valid_plan.__dict__, "input_path": "caminho_inexistente.mp4"})
    with pytest.raises(TrechoEngineError) as exc_info:
        plan.validate()
    assert exc_info.value.code == SOURCE_MEDIA_NOT_FOUND

@patch("shutil.which")
def test_ffmpeg_command_builder_cover(mock_which, valid_plan):
    mock_which.return_value = "/usr/bin/ffmpeg"
    
    cmd = FFmpegCommandBuilder.build(valid_plan)
    
    assert cmd[0] == "/usr/bin/ffmpeg"
    assert "-ss" in cmd
    # Verifica o index de -ss + 1 para o valor do tempo
    ss_idx = cmd.index("-ss")
    assert cmd[ss_idx + 1] == "5.000"
    
    t_idx = cmd.index("-t")
    assert cmd[t_idx + 1] == "10.000" # 15000 - 5000 = 10000ms = 10s
    
    vf_idx = cmd.index("-vf")
    assert "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" in cmd[vf_idx + 1]

@patch("shutil.which")
def test_ffmpeg_command_builder_contain(mock_which, valid_plan):
    mock_which.return_value = "/usr/bin/ffmpeg"
    
    plan_contain = RenderPlan(**{**valid_plan.__dict__, "crop_mode": "contain"})
    cmd = FFmpegCommandBuilder.build(plan_contain)
    
    vf_idx = cmd.index("-vf")
    assert "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" in cmd[vf_idx + 1]

@patch("shutil.which")
def test_ffmpeg_not_found(mock_which, valid_plan):
    mock_which.return_value = None
    with pytest.raises(TrechoEngineError) as exc_info:
        FFmpegCommandBuilder.build(valid_plan)
    assert exc_info.value.code == FFMPEG_NOT_FOUND

def test_progress_parser():
    # Testa out_time_us (microsegundos)
    # 5.000.000 us = 5.000 ms = 50%
    parser_us = FFmpegProgressParser(10000)
    prog_us = parser_us.parse_line("out_time_us=5000000")
    assert prog_us == 50.0
    
    # Testa out_time_ms
    # out_time_ms com valor alto (e.g. 7.500.000) -> 7.5s = 75%
    parser_ms = FFmpegProgressParser(10000)
    prog_ms = parser_ms.parse_line("out_time_ms=7500000")
    assert prog_ms == 75.0

    # Testa out_time (HH:MM:SS.xxxxxx)
    # 00:00:09.000000 -> 9.0s = 90%
    parser_time = FFmpegProgressParser(10000)
    prog_time = parser_time.parse_line("out_time=00:00:09.000000")
    assert prog_time == 90.0

def test_media_probe_parser():
    mock_ffprobe_data = {
        "streams": [
            {
                "codec_type": "video",
                "width": 1920,
                "height": 1080,
                "avg_frame_rate": "30/1",
                "codec_name": "h264",
                "duration": "60.000000"
            },
            {
                "codec_type": "audio",
                "codec_name": "aac"
            }
        ],
        "format": {
            "duration": "60.000000"
        }
    }
    
    result = parse_probe_result(mock_ffprobe_data)
    assert result["durationMs"] == 60000
    assert result["width"] == 1920
    assert result["height"] == 1080
    assert result["frameRate"] == 30.0
    assert result["videoCodec"] == "h264"
    assert result["audioCodec"] == "aac"

def test_render_service_cleanup_on_cancel(valid_plan):
    service = RenderService(valid_plan)
    
    # Cria arquivo fictício de saída
    os.makedirs(os.path.dirname(valid_plan.output_path), exist_ok=True)
    with open(valid_plan.output_path, "w") as f:
        f.write("partial file")
        
    assert os.path.exists(valid_plan.output_path)
    
    # Executa a limpeza
    service._cleanup_output()
    assert not os.path.exists(valid_plan.output_path)
