import React, { useRef, useState, useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useRenderStore } from "../stores/renderStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { Play, Pause, FolderOpen, ArrowLeft, Scissors, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { AspectRatio } from "../types/project";

interface EditorPageProps {
  onNavigate: (page: "home") => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({ onNavigate }) => {
  const { activeProject, workspacePath, closeProject } = useProjectStore();
  const { status: renderStatus, progress: renderProgress, error: renderError, outputPath: renderOutputPath, startRender, cancelRender, resetRender } = useRenderStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // em segundos
  const [duration, setDuration] = useState(0); // em segundos

  // Estados do clipe atual sendo configurado
  const [clipName, setClipName] = useState("Corte 01");
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [cropMode, setCropMode] = useState<"cover" | "contain">("cover");

  // Caminho absoluto do vídeo
  const getAbsoluteVideoPath = () => {
    if (!activeProject) return "";
    if (activeProject.source.path.startsWith("source/")) {
      return `${workspacePath}/projects/${activeProject.id}/${activeProject.source.path}`;
    }
    return activeProject.source.path;
  };

  const videoSrc = activeProject ? convertFileSrc(getAbsoluteVideoPath()) : "";

  // Inicializa limites de corte ao carregar o vídeo
  useEffect(() => {
    if (activeProject) {
      setDuration(activeProject.source.durationMs / 1000);
      setEndMs(activeProject.source.durationMs);
      
      // Reseta render store
      resetRender();
    }
  }, [activeProject]);

  // Sincroniza reprodução com estado do player
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => console.error(e));
    }
  };

  // Monitora progresso do player
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (endMs === 0 || endMs === activeProject?.source.durationMs) {
        setEndMs(Math.round(videoRef.current.duration * 1000));
      }
    }
  };

  // Funções de seek e marcação
  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, seconds));
    }
  };

  const markStart = () => {
    const timeMs = Math.round(currentTime * 1000);
    if (timeMs < endMs) {
      setStartMs(timeMs);
    }
  };

  const markEnd = () => {
    const timeMs = Math.round(currentTime * 1000);
    if (timeMs > startMs) {
      setEndMs(timeMs);
    }
  };

  // Formatação de tempo humana (MM:SS.ms)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  };

  const formatMs = (ms: number) => formatTime(ms / 1000);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o foco estiver em inputs de texto
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "i":
          markStart();
          break;
        case "o":
          markEnd();
          break;
        case "arrowleft":
          seekTo(currentTime - 1);
          break;
        case "arrowright":
          seekTo(currentTime + 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, duration, startMs, endMs, isPlaying]);

  // Envia clipe para renderizar
  const handleExport = () => {
    if (!activeProject) return;

    let resWidth = 1080;
    let resHeight = 1920;

    if (aspectRatio === "1:1") {
      resWidth = 1080;
      resHeight = 1080;
    } else if (aspectRatio === "16:9") {
      resWidth = 1920;
      resHeight = 1080;
    }

    const clip = {
      id: crypto.randomUUID(),
      name: clipName || "Corte Sem Nome",
      startMs,
      endMs,
      aspectRatio,
      resolution: { width: resWidth, height: resHeight },
      cropMode,
      createdAt: new Date().toISOString()
    };

    // Salva na Zustand (que escreve no JSON)
    useProjectStore.getState().addClipToProject(clip);

    // Inicia a renderização
    startRender(activeProject, clip, workspacePath);
  };

  const handleOpenFolder = () => {
    if (activeProject) {
      const projectDir = `${workspacePath}/projects/${activeProject.id}/renders`;
      invoke("open_in_explorer", { path: projectDir });
    }
  };

  const handleOpenExportedFile = () => {
    if (renderOutputPath) {
      invoke("open_in_explorer", { path: renderOutputPath });
    }
  };

  const handleOpenProjectFolder = () => {
    if (activeProject) {
      const projectDir = `${workspacePath}/projects/${activeProject.id}`;
      invoke("open_in_explorer", { path: projectDir });
    }
  };

  const handleClose = () => {
    closeProject();
    onNavigate("home");
  };

  if (!activeProject) return null;

  return (
    <div className="app-container" style={{ userSelect: "none" }}>
      {/* Cabeçalho */}
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button className="btn" onClick={handleClose} style={{ padding: "6px 12px" }}>
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              PROJETO ATIVO
            </span>
            <h2 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase" }}>
              {activeProject.name}
            </h2>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn" onClick={handleOpenProjectFolder}>
            <FolderOpen size={14} /> Pasta do Projeto
          </button>
        </div>
      </header>

      {/* Corpo do Editor */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Lado Esquerdo: Player de Vídeo e Timeline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-color)", background: "#111111", padding: "16px", justifyContent: "space-between" }}>
          
          {/* Player centralizado */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <video
              ref={videoRef}
              src={videoSrc}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                margin: "0 auto",
                display: "block",
                border: "1px solid #222"
              }}
            />
          </div>

          {/* Timeline e Controles */}
          <div style={{ background: "var(--bg-primary)", padding: "16px", marginTop: "16px", border: "1px solid var(--border-color)" }}>
            
            {/* Barra da timeline */}
            <div style={{ position: "relative", height: "32px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", display: "flex", alignItems: "center" }}>
              {/* Indicador do clipe cortado */}
              {duration > 0 && (
                <div style={{
                  position: "absolute",
                  left: `${(startMs / 1000 / duration) * 100}%`,
                  width: `${((endMs - startMs) / 1000 / duration) * 100}%`,
                  height: "100%",
                  backgroundColor: "rgba(0,0,0,0.1)",
                  borderLeft: "2px solid var(--border-dark)",
                  borderRight: "2px solid var(--border-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pointerEvents: "none"
                }} />
              )}
              
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                  margin: 0,
                  opacity: 0.8,
                  accentColor: "var(--accent-color)"
                }}
              />
            </div>

            {/* Tempos da Timeline */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              <span>{formatTime(currentTime)}</span>
              <span>Duração do Corte: {formatMs(endMs - startMs)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Controles do Player */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn" onClick={togglePlay} style={{ width: "40px", height: "40px", padding: 0, justifyContent: "center" }}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn" onClick={markStart} title="Atalho: I">
                  [I] Início: {formatMs(startMs)}
                </button>
                <button className="btn" onClick={markEnd} title="Atalho: O">
                  [O] Fim: {formatMs(endMs)}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Configurações de Exportação */}
        <div style={{ width: "340px", display: "flex", flexDirection: "column", background: "var(--bg-primary)", padding: "24px", overflowY: "auto" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", marginBottom: "20px", borderBottom: "2px solid var(--border-dark)", paddingBottom: "8px" }}>
            Configuração do Corte
          </h2>

          {/* Nome do Corte */}
          <div className="form-group">
            <label className="form-label">Nome do Arquivo</label>
            <input
              type="text"
              className="form-control"
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              placeholder="ex: Corte 01"
              disabled={renderStatus === "running" || renderStatus === "queued"}
            />
          </div>

          {/* Formato / Aspect Ratio */}
          <div className="form-group">
            <label className="form-label">Formato</label>
            <select
              className="form-control"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              disabled={renderStatus === "running" || renderStatus === "queued"}
            >
              <option value="9:16">Vertical (9:16) — 1080 × 1920</option>
              <option value="1:1">Quadrado (1:1) — 1080 × 1080</option>
              <option value="16:9">Horizontal (16:9) — 1920 × 1080</option>
            </select>
          </div>

          {/* Enquadramento */}
          <div className="form-group">
            <label className="form-label">Modo de Enquadramento</label>
            <select
              className="form-control"
              value={cropMode}
              onChange={(e) => setCropMode(e.target.value as "cover" | "contain")}
              disabled={renderStatus === "running" || renderStatus === "queued"}
            >
              <option value="cover">Preencher e cortar (Zoom central)</option>
              <option value="contain">Conter (Barras pretas laterais)</option>
            </select>
          </div>

          {/* Visualização de Resumo do Corte */}
          <div style={{
            background: "var(--bg-secondary)",
            padding: "16px",
            fontSize: "12px",
            margin: "16px 0",
            border: "1px solid var(--border-color)",
            fontFamily: "var(--font-mono)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div><strong>Intervalo:</strong> {formatMs(startMs)} - {formatMs(endMs)}</div>
            <div><strong>Duração:</strong> {formatMs(endMs - startMs)}</div>
            <div><strong>Resolução:</strong> {aspectRatio === "9:16" ? "1080x1920" : aspectRatio === "1:1" ? "1080x1080" : "1920x1080"}</div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
            onClick={handleExport}
            disabled={renderStatus === "running" || renderStatus === "queued"}
          >
            <Scissors size={14} /> Gerar Trecho
          </button>
        </div>
      </div>

      {/* Rodapé: Barra de Renderização e Progresso */}
      {renderStatus !== "idle" && (
        <div style={{
          borderTop: "2px solid var(--border-dark)",
          padding: "16px 24px",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          gap: "24px"
        }}>
          {/* Status Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "180px" }}>
            {renderStatus === "running" && <RefreshCw size={16} className="spin" style={{ animation: "spin 2s linear infinite" }} />}
            {renderStatus === "completed" && <CheckCircle size={16} style={{ color: "var(--color-success)" }} />}
            {renderStatus === "failed" && <XCircle size={16} style={{ color: "var(--color-danger)" }} />}
            {renderStatus === "cancelled" && <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} />}
            
            <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "12px" }}>
              {renderStatus === "queued" && "Na fila..."}
              {renderStatus === "running" && `Renderizando: ${renderProgress.toFixed(1)}%`}
              {renderStatus === "completed" && "Concluído!"}
              {renderStatus === "failed" && `Falha: ${renderError || 'Erro desconhecido'}`}
              {renderStatus === "cancelled" && "Cancelado"}
            </span>
          </div>

          {/* Barra de Progresso */}
          <div style={{ flex: 1, height: "12px", border: "1px solid var(--border-dark)", background: "var(--bg-secondary)", position: "relative" }}>
            <div style={{
              width: `${renderProgress}%`,
              height: "100%",
              backgroundColor: "var(--accent-color)",
              transition: "width 0.1s linear"
            }} />
          </div>

          {/* Botões de Ação de Render */}
          <div style={{ display: "flex", gap: "8px" }}>
            {renderStatus === "running" && (
              <button className="btn btn-danger" onClick={cancelRender}>
                Cancelar
              </button>
            )}
            {renderStatus === "completed" && (
              <>
                <button className="btn" onClick={handleOpenExportedFile}>
                  Abrir Arquivo
                </button>
                <button className="btn" onClick={handleOpenFolder}>
                  Abrir Pasta
                </button>
              </>
            )}
            {(renderStatus === "completed" || renderStatus === "failed" || renderStatus === "cancelled") && (
              <button className="btn" onClick={resetRender}>
                Fechar Status
              </button>
            )}
          </div>
        </div>
      )}

      {/* Adiciona regra CSS de rotação para o ícone de render */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
