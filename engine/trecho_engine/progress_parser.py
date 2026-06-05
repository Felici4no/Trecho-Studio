import re
from typing import Optional, Dict

class FFmpegProgressParser:
    def __init__(self, clip_duration_ms: int):
        self.clip_duration_ms = max(1, clip_duration_ms) # Evita divisão por zero
        self.current_stats: Dict[str, str] = {}

    def parse_line(self, line: str) -> Optional[float]:
        """
        Recebe uma linha do output do FFmpeg e atualiza o progresso.
        Retorna o percentual de progresso (0 a 100) se detectado, ou None.
        """
        line = line.strip()
        if not line or "=" not in line:
            return None

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        self.current_stats[key] = value

        # Só calculamos o progresso quando o FFmpeg sinaliza um ciclo ou término
        if key in ("progress", "out_time_ms", "out_time_us", "out_time"):
            processed_ms = self._get_processed_ms()
            if processed_ms is not None:
                progress = (processed_ms / self.clip_duration_ms) * 100.0
                return max(0.0, min(100.0, progress))

        return None

    def _get_processed_ms(self) -> Optional[float]:
        """Calcula o tempo processado em milissegundos usando múltiplos fallbacks."""
        # Fallback 1: out_time_us (microsegundos, o mais estável e presente nas versões recentes)
        if "out_time_us" in self.current_stats:
            try:
                return float(self.current_stats["out_time_us"]) / 1000.0
            except ValueError:
                pass

        # Fallback 2: out_time_ms (pode ser milissegundos ou microsegundos dependendo da versão do FFmpeg)
        if "out_time_ms" in self.current_stats:
            try:
                val = float(self.current_stats["out_time_ms"])
                # Se for maior que 10 milhões para um clipe curto, é microsegundos
                # Vamos assumir que se for absurdamente alto em comparação com a duração, convertemos
                # Mas para evitar heurísticas complexas, vamos checar out_time ou tratar como microsegundos se for > 1000x a duração
                if val > self.clip_duration_ms * 10:
                    return val / 1000.0
                return val
            except ValueError:
                pass

        # Fallback 3: out_time (formato HH:MM:SS.xxxxxx)
        if "out_time" in self.current_stats:
            out_time_str = self.current_stats["out_time"]
            try:
                # regex para HH:MM:SS.xxx
                match = re.match(r"(\d+):(\d+):(\d+)(?:\.(\d+))?", out_time_str)
                if match:
                    hours = int(match.group(1))
                    minutes = int(match.group(2))
                    seconds = int(match.group(3))
                    frac = match.group(4)
                    
                    ms = (hours * 3600 + minutes * 60 + seconds) * 1000
                    if frac:
                        # Pega os primeiros 3 dígitos da fração para representar milissegundos
                        frac_str = (frac + "000")[:3]
                        ms += int(frac_str)
                    return float(ms)
            except Exception:
                pass

        return None
