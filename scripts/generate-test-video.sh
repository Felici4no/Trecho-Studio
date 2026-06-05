#!/usr/bin/env bash
# Script para gerar vídeo de teste sintético usando FFmpeg
# Uso: ./generate-test-video.sh [caminho_de_saida]

OUTPUT_PATH=${1:-"test_video.mp4"}

# Verifica se o FFmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "Erro: FFmpeg não foi encontrado no PATH. Instale-o antes de executar."
    exit 1
fi

echo "Gerando vídeo sintético em: ${OUTPUT_PATH}..."

# Comando FFmpeg para criar vídeo de 5 segundos, 320x240, 30fps, com áudio de 440Hz
ffmpeg -y \
  -f lavfi -i "testsrc=size=320x240:rate=30:duration=5" \
  -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=5" \
  -c:v libx264 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -shortest \
  "${OUTPUT_PATH}"

if [ $? -eq 0 ]; then
    echo "Vídeo sintético gerado com sucesso!"
else
    echo "Erro: Falha ao gerar o vídeo usando FFmpeg."
    exit 1
fi
