# Especificação de Arquivos — Trecho Studio

Este documento especifica a estrutura física do workspace local, os esquemas JSON de persistência e a política de gerenciamento de mídias e arquivos temporários.

## 1. Estrutura do Workspace Local
O workspace do Trecho Studio (`TrechoStudioWorkspace`) armazena as configurações globais e as pastas autocontidas de cada projeto criado pelo usuário.

```text
TrechoStudioWorkspace/
├── settings.json
└── projects/
    └── {project-uuid}/
        ├── project.json
        ├── project.json.backup
        ├── README.md
        ├── source/
        │   └── {original-video.mp4}
        ├── renders/
        │   └── {corte-01.mp4}
        ├── thumbnails/
        ├── temp/
        └── logs/
```

## 2. Especificação do `settings.json`
Localizado na raiz da pasta do workspace, rastreia os caminhos dos projetos editados recentemente.

```json
{
  "workspacePath": "C:\\Caminho\\Para\\TrechoStudioWorkspace",
  "recentProjects": [
    {
      "id": "e6a4b7d1-0f4a-4e26-8c5e-8be2dfa938c4",
      "name": "Meu Primeiro Corte",
      "path": "C:\\Caminho\\Para\\TrechoStudioWorkspace\\projects\\e6a4b7d1-0f4a-4e26-8c5e-8be2dfa938c4",
      "lastOpenedAt": "2026-06-05T18:00:00Z"
    }
  ]
}
```

## 3. Especificação do `project.json`
Fica na raiz da pasta de cada projeto. É a **fonte única de verdade** sobre o projeto.

```json
{
  "schemaVersion": 1,
  "id": "project-uuid",
  "name": "Nome do projeto",
  "createdAt": "2026-06-05T18:00:00Z",
  "updatedAt": "2026-06-05T18:00:00Z",
  "source": {
    "originalName": "video.mp4",
    "path": "source/video.mp4",
    "durationMs": 60000,
    "width": 1920,
    "height": 1080,
    "frameRate": 30,
    "videoCodec": "h264",
    "audioCodec": "aac"
  },
  "clips": [
    {
      "id": "clip-uuid",
      "name": "Corte 01 - Vertical",
      "startMs": 15000,
      "endMs": 45000,
      "aspectRatio": "9:16",
      "resolution": {
        "width": 1080,
        "height": 1920
      },
      "cropMode": "cover",
      "createdAt": "2026-06-05T18:30:00Z",
      "render": {
        "status": "completed",
        "outputPath": "renders/corte-01-vertical.mp4",
        "renderedAt": "2026-06-05T18:35:00Z"
      }
    }
  ]
}
```

## 4. Política de Salvamento Seguro (Gravação Atômica)
Para prevenir arquivos JSON corrompidos em caso de falhas ou fechamentos inesperados do app:
1. Os dados novos são serializados e escritos em `project.json.tmp`.
2. O arquivo temporário é validado (verificação sintática se é um JSON válido).
3. Se o arquivo `project.json` atual existir, ele é copiado para `project.json.backup`.
4. O `project.json.tmp` é renomeado/sobrescreve o `project.json` principal.
5. Se tudo correr bem, o arquivo temporário é removido.

## 5. Política de Arquivos Temporários
- Pasta `temp/` do projeto: Usada para arquivos de passagem do FFmpeg ou parciais de vídeo.
- Ao iniciar uma nova renderização, a pasta `temp/` do projeto associado é limpa.
- Em caso de cancelamento pelo usuário ou falha do FFmpeg, os arquivos incompletos da renderização em andamento (localizados na pasta temporária ou na pasta `renders/`) são imediatamente deletados do disco.
