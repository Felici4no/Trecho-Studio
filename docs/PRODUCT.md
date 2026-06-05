# Documento de Produto — Trecho Studio

## 1. Problema
Criadores de conteúdo enfrentam dificuldades para recortar e formatar rapidamente vídeos longos (16:9) em cortes curtos verticais (9:16) ou quadrados (1:1) para plataformas como TikTok, Instagram Reels e YouTube Shorts. As ferramentas profissionais de edição de vídeo (Premiere, Resolve, CapCut) possuem muitas funcionalidades complexas, exigem alto consumo de hardware e costumam sobrecarregar o fluxo de quem quer apenas fazer um corte rápido.

## 2. Proposta de Valor
O **Trecho Studio** é uma ferramenta desktop local-first de corte de vídeo rápida e sem distrações. Ele foi projetado especificamente para:
- Importar um vídeo local de forma instantânea.
- Permitir a marcação rápida dos pontos de início e fim.
- Escolher o enquadramento desejado (Vertical, Quadrado, Horizontal).
- Exportar o clipe de forma eficiente utilizando o FFmpeg sob o capô.
- Funcionar de forma totalmente offline, segura e privada, sem subir arquivos para a nuvem.

## 3. Usuário Inicial
Criadores de conteúdo individuais, editores de cortes, podcasters e social media que necessitam de agilidade na produção de microconteúdo a partir de gravações longas.

## 4. Fluxo Principal do Usuário
1. **Criar ou abrir um projeto** apontando para um diretório local (workspace).
2. **Selecionar e analisar o vídeo original** (usando o `ffprobe` para obter metadados).
3. **Visualizar o vídeo** em um player nativo simples.
4. **Marcar pontos de corte** (início e fim) por meio de controles visuais ou atalhos de teclado (`I` / `O`).
5. **Configurar a exportação**:
   - Aspect Ratio (9:16, 1:1, 16:9).
   - Resolução de saída (1080x1920, 1080x1080, 1920x1080).
   - Modo de enquadramento (Preencher/Cover ou Conter/Contain).
6. **Gerar o corte** via processo Python/FFmpeg acompanhando o progresso em tempo real.
7. **Abrir a pasta ou o arquivo exportado** diretamente do app.

## 5. Escopo do MVP (Fase 1)
- Criação e carregamento de projetos baseados no arquivo `project.json` e estrutura local de pastas.
- Player de vídeo local baseado em HTML5 compatível com formatos comuns (MP4/H264).
- Atalhos de teclado essenciais para navegação no player e marcação de trecho.
- Integração por linha de comando (`Tauri` -> `Python CLI` -> `FFmpeg`).
- Barra de progresso real baseada no tempo renderizado pelo FFmpeg.
- Mecanismo real de cancelamento de processo de renderização com limpeza de arquivos temporários e parciais.
- Diagnóstico inicial de dependências do sistema (Python 3.11+, FFmpeg, ffprobe e permissões de escrita).

## 6. Fora de Escopo (MVP)
- Inteligência Artificial, legendagem ou transcrição automática (Whisper/etc.).
- Upload automático para redes sociais ou integração com APIs (YouTube, TikTok).
- Editor multitrack, adição de áudios secundários, transições ou filtros visuais.
- Autenticação de usuário, banco de dados local (SQLite/Supabase) ou chamadas de API web.
- Empacotamento sidecar do Python (o interpretador precisa estar instalado no sistema).

## 7. Critérios de Sucesso
- Conseguir gerar um corte vertical de 10 segundos a partir de um vídeo horizontal de 60 segundos com sucesso.
- O arquivo gerado deve estar com proporções corretas (centralizado/cortado ou com barras pretas) e com áudio sincronizado.
- O cancelamento deve interromper o processo FFmpeg imediatamente e excluir o arquivo inacabado do disco.
