import os
from dataclasses import dataclass
from typing import Literal
from trecho_engine.errors import INVALID_CLIP_RANGE, OUTPUT_DIRECTORY_UNAVAILABLE, OUTPUT_FILE_ALREADY_EXISTS, SOURCE_MEDIA_NOT_FOUND, TrechoEngineError

@dataclass(frozen=True)
class RenderPlan:
    input_path: str
    output_path: str
    start_ms: int
    end_ms: int
    width: int
    height: int
    aspect_ratio: Literal["9:16", "1:1", "16:9"]
    crop_mode: Literal["cover", "contain"]
    video_codec: str = "libx264"
    audio_codec: str = "aac"

    def validate(self, duration_ms: int = None) -> None:
        """Valida se o plano de renderização é viável."""
        # 1. Arquivo de entrada existe
        if not os.path.exists(self.input_path):
            raise TrechoEngineError(
                code=SOURCE_MEDIA_NOT_FOUND,
                message="Arquivo de vídeo original não encontrado.",
                details=f"Caminho: {self.input_path}"
            )

        # 2. Início não é negativo
        if self.start_ms < 0:
            raise TrechoEngineError(
                code=INVALID_CLIP_RANGE,
                message="O tempo de início do clipe não pode ser negativo.",
                details=f"Início: {self.start_ms}ms"
            )

        # 3. Fim é maior que início
        if self.end_ms <= self.start_ms:
            raise TrechoEngineError(
                code=INVALID_CLIP_RANGE,
                message="O tempo de fim do clipe deve ser estritamente maior que o tempo de início.",
                details=f"Início: {self.start_ms}ms, Fim: {self.end_ms}ms"
            )

        # 4. Fim não ultrapassa significativamente a duração
        if duration_ms is not None:
            # Tolerância de 500ms para pequenas discrepâncias de container
            if self.end_ms > duration_ms + 500:
                raise TrechoEngineError(
                    code=INVALID_CLIP_RANGE,
                    message="O tempo de fim do clipe excede a duração do vídeo original.",
                    details=f"Fim: {self.end_ms}ms, Duração: {duration_ms}ms"
                )

        # 5. Saída não sobrescreve a entrada
        if os.path.abspath(self.input_path) == os.path.abspath(self.output_path):
            raise TrechoEngineError(
                code=OUTPUT_FILE_ALREADY_EXISTS,
                message="O arquivo de saída não pode ser igual ao arquivo de entrada.",
                details=f"Caminho: {self.input_path}"
            )

        # 6. Largura e altura são positivas
        if self.width <= 0 or self.height <= 0:
            raise TrechoEngineError(
                code=INVALID_CLIP_RANGE,
                message="As dimensões de saída do vídeo devem ser maiores que zero.",
                details=f"Largura: {self.width}, Altura: {self.height}"
            )

        # 7. Diretório de saída pode ser criado
        output_dir = os.path.dirname(os.path.abspath(self.output_path))
        if output_dir:
            try:
                os.makedirs(output_dir, exist_ok=True)
            except Exception as e:
                raise TrechoEngineError(
                    code=OUTPUT_DIRECTORY_UNAVAILABLE,
                    message="Não foi possível criar o diretório de destino.",
                    details=str(e)
                )

    @classmethod
    def from_dict(cls, data: dict) -> "RenderPlan":
        """Cria um plano de renderização a partir de um dicionário (ex: vindo de JSON)."""
        return cls(
            input_path=data["inputPath"],
            output_path=data["outputPath"],
            start_ms=int(data["startMs"]),
            end_ms=int(data["endMs"]),
            width=int(data["width"]),
            height=int(data["height"]),
            aspect_ratio=data["aspectRatio"],
            crop_mode=data["cropMode"],
            video_codec=data.get("videoCodec", "libx264"),
            audio_codec=data.get("audioCodec", "aac"),
        )
