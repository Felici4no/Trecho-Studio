# Roadmap de Evolução — Trecho Studio

Este documento estabelece a trajetória planejada para o desenvolvimento do Trecho Studio após a entrega da primeira fatia vertical estável (MVP 0.1).

---

## Versão 0.1 — Corte Simples (Fase Atual)
- [ ] Importação de vídeo e análise ffprobe local.
- [ ] Visualizador de vídeo básico com marcação de intervalo (I/O).
- [ ] Renderização offline com FFmpeg (formatos 9:16, 16:9, 1:1) com preenchimento (cover) ou barra preta (contain).
- [ ] Cancelamento confiável de processos órfãos.
- [ ] Gravação e leitura segura de JSON de projeto local.
- [ ] Tela de diagnóstico de dependências do sistema.

---

## Versão 0.2 — Transcrição e Legendas (Curto Prazo)
- **Transcrição Local**: Integração do `Whisper.cpp` ou biblioteca Python equivalente para transcrição offline.
- **Gerador de Legendas**: Geração automática de legendas de corte a partir da transcrição.
- **Estilo de Legendas**: Editor simples de tipografia, cores e posições de legendas queimadas na tela (hard subs) via filtros do FFmpeg.

---

## Versão 0.3 — Empacotamento Autônomo e Sidecar (Médio Prazo)
- **Sidecar do Python**: Configuração do Tauri sidecar para distribuir o interpretador Python embutido no instalador do app, dispensando o usuário de instalar o Python manualmente.
- **Distribuição Estática do FFmpeg**: Embutir executáveis compilados estáticos do FFmpeg/ffprobe para cada sistema operacional dentro do pacote final da aplicação.
- **Templates de Formatação**: Presets de enquadramento rápido para reaproveitar configurações de corte em lote.

---

## Versão 0.4 — Publicação Direta (Longo Prazo)
- **Integração com APIs**: Conectores OAuth locais para subida automática de vídeos exportados para o YouTube Shorts, Instagram Reels e TikTok.
- **Metadados Sociais**: Editor integrado de Títulos, Descrições e Tags baseados nos relatórios do projeto.

---

## Versão 0.5 — Detecção Automática (Inovação)
- **Detecção de Picos**: Análise de áudio automatizada para identificar picos de volume (risadas, gritos, palmas) e sugerir automaticamente intervalos interessantes de corte.
- **Crop Inteligente (Auto-Reframe)**: Uso de modelos leves locais de rastreamento facial (como MediaPipe) para redefinir o enquadramento dinâmico do crop 9:16 seguindo o palestrante na imagem.

---

## Versão 1.0 — Fluxo de Produção Completo (Estabilidade)
- Suporte a múltiplas timelines e transições básicas.
- Exportação em lote de múltiplos clipes criados de um mesmo vídeo fonte.
- Interface customizável (Modo Escuro / Claro, atalhos configuráveis).
