# Trecho Studio

**Do vídeo inteiro ao trecho certo.**

O Trecho Studio é uma aplicação desktop local-first para criadores de conteúdo recortarem vídeos longos em formatos curtos (especialmente vertical 9:16), operando de forma 100% offline, sem nuvem, sem IA e sem banco de dados.

## Requisitos de Sistema e Dependências (Windows)

Para executar o projeto em modo de desenvolvimento ou compilar a aplicação, certifique-se de que os seguintes pré-requisitos estão instalados no seu computador.

> [!NOTE]
> **Runtimes Temporários de Desenvolvimento**: Os diretórios locais `python-embed/` e `ffmpeg/` inseridos no repositório destinam-se exclusivamente como runtimes isolados e temporários para facilitar o desenvolvimento e testes locais. Eles não representam a estratégia definitiva de distribuição do Trecho Studio. O empacotamento oficial de produção utilizará o mecanismo de **Sidecar do Tauri** para embarcar o interpretador Python e binários estáticos do FFmpeg.

### 1. Rust & Cargo
O Tauri 2 necessita da linguagem Rust para compilar e rodar o backend nativo.
- Acesse o site oficial: [Instalar Rust](https://www.rust-lang.org/tools/install)
- Baixe e execute o instalador `rustup-init.exe`.
- Certifique-se de selecionar a instalação padrão e reiniciar o seu terminal.
- Valide rodando no terminal: `cargo --version` e `rustc --version`

### 2. Python (v3.11 ou superior)
O motor de processamento (`engine`) é executado em Python.
- Baixe o instalador do site oficial: [Python Downloads](https://www.python.org/downloads/)
- **IMPORTANTE**: Ao instalar, marque a caixa **"Add python.exe to PATH"**.
- Valide no terminal: `python --version`

### 3. FFmpeg & ffprobe
O processamento de vídeo é feito via FFmpeg.
- Baixe a compilação estável mais recente do FFmpeg para Windows (ex: de [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)).
- Extraia os arquivos e coloque a pasta `bin` (que contém `ffmpeg.exe` e `ffprobe.exe`) nas **Variáveis de Ambiente do Sistema** (no `PATH`).
- Valide no terminal: `ffmpeg -version` e `ffprobe -version`

---

## Estrutura do Repositório

```text
Trecho-Studio/
├── src/                      # Frontend React (HTML5 Player, Timeline, Workspace)
├── src-tauri/                # Backend nativo Rust (Tauri 2, comandos, controle de processo)
├── engine/                   # Motor Python (FFmpeg CLI builder, progress parser, ffprobe)
├── docs/                     # Documentação conceitual e técnica
├── scripts/                  # Utilitários de desenvolvimento
└── task.md                   # Controle interno de tarefas do agente
```

---

## Como Executar

### 1. Clonar o projeto
```bash
git clone https://github.com/Felici4no/Trecho-Studio.git
cd Trecho-Studio
```

### 2. Instalar as dependências do Frontend
```bash
npm install
```

### 3. Configurar e testar o Motor Python
Navegue para a pasta `engine`, crie e ative um ambiente virtual (opcional) e instale as dependências:
```bash
cd engine
python -m venv .venv
.venv\Scripts\activate
pip install -e .
```
Para rodar os testes unitários do Python:
```bash
pytest
```

### 4. Executar em modo Desenvolvimento
A partir da raiz do repositório:
```bash
npm run tauri dev
```

---

## Como Gerar Build de Produção

Para compilar o executável final otimizado (.exe):
```bash
npm run tauri build
```
O instalador gerado ficará em `src-tauri/target/release/bundle/`.

---

## Problemas Conhecidos e Limitações
- **Suporte a Formatos**: O player HTML5 nativo suporta nativamente formatos padrão da web (ex: H.264/AAC no contêiner MP4). Outros formatos proprietários podem não ser reproduzidos na interface, embora o motor FFmpeg ainda consiga recortá-los.
- **Sidecar do Python**: Nesta fase, o Python deve estar pré-instalado na máquina do usuário. O empacotamento completo do Python como sidecar do instalador Tauri será implementado em versões futuras.
