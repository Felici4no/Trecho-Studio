# Script para gerar vídeo de teste sintético usando FFmpeg
# Uso: .\generate-test-video.ps1 [caminho_de_saida]

param (
    [string]$OutputPath = "test_video.mp4"
)

# Verifica se o FFmpeg está instalado
where.exe ffmpeg > $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "FFmpeg não foi encontrado no PATH do sistema. Por favor, instale o FFmpeg antes de executar este script."
    exit 1
}

Write-Host "Gerando vídeo sintético em: $OutputPath..."

# Comando FFmpeg para criar vídeo de 5 segundos, 320x240, 30fps, com áudio de 440Hz
ffmpeg -y `
  -f lavfi -i "testsrc=size=320x240:rate=30:duration=5" `
  -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=5" `
  -c:v libx264 -pix_fmt yuv420p `
  -c:a aac -b:a 128k `
  -shortest `
  $OutputPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Vídeo sintético gerado com sucesso!"
} else {
    Write-Error "Falha ao gerar o vídeo usando FFmpeg."
}
