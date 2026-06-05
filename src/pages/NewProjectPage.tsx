import React, { useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { open } from "@tauri-apps/plugin-dialog";

interface NewProjectPageProps {
  onNavigate: (page: "home" | "editor") => void;
}

export const NewProjectPage: React.FC<NewProjectPageProps> = ({ onNavigate }) => {
  const { createProject, workspacePath, isLoading, error } = useProjectStore();
  const [projectName, setProjectName] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [copyVideo, setCopyVideo] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSelectVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: "Video Files",
          extensions: ["mp4", "mkv", "mov", "avi"]
        }]
      });

      if (selected && typeof selected === "string") {
        setVideoPath(selected);
        // Preenche o nome do projeto automaticamente se estiver vazio
        if (!projectName) {
          const filename = selected.split(/[/\\]/).pop() || "";
          const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
          setProjectName(nameWithoutExt);
        }
      }
    } catch (err) {
      console.error("Falha ao selecionar o vídeo:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!projectName.trim()) {
      setLocalError("O nome do projeto é obrigatório.");
      return;
    }
    if (!videoPath) {
      setLocalError("A seleção do vídeo original é obrigatória.");
      return;
    }

    const project = await createProject(projectName.trim(), videoPath, copyVideo);
    if (project) {
      onNavigate("editor");
    }
  };

  return (
    <div style={{
      maxWidth: "520px",
      margin: "0 auto",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "24px"
    }}>
      <div className="panel">
        <div className="panel-header">
          <h1 style={{ fontSize: "20px", fontWeight: 800, textTransform: "uppercase" }}>Novo Projeto</h1>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Configure o seu novo workspace de corte de vídeo.
          </p>
        </div>

        {(error || localError) && (
          <div style={{
            padding: "12px",
            background: "#fff5f5",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
            marginBottom: "20px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)"
          }}>
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nome do Projeto */}
          <div className="form-group">
            <label className="form-label">Nome do Projeto</label>
            <input
              type="text"
              className="form-control"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="ex: Meu Corte Incrível"
              disabled={isLoading}
            />
          </div>

          {/* Vídeo Original */}
          <div className="form-group">
            <label className="form-label">Vídeo Original</label>
            <div className="form-control-file-wrapper">
              <input
                type="text"
                className="form-control"
                value={videoPath}
                readOnly
                placeholder="Selecione um arquivo de vídeo..."
                disabled={isLoading}
              />
              <button 
                type="button" 
                className="btn" 
                onClick={handleSelectVideo}
                disabled={isLoading}
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Pasta Workspace (Apenas Leitura) */}
          <div className="form-group">
            <label className="form-label">Pasta do Workspace</label>
            <input
              type="text"
              className="form-control"
              value={workspacePath}
              readOnly
              style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            />
          </div>

          {/* Estratégia de Arquivo */}
          <div className="form-group" style={{ margin: "24px 0" }}>
            <label className="form-label" style={{ marginBottom: "12px" }}>Estratégia de Vídeo</label>
            
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              fontSize: "13px", 
              cursor: "pointer",
              marginBottom: "10px" 
            }}>
              <input
                type="radio"
                name="copyOption"
                checked={copyVideo}
                onChange={() => setCopyVideo(true)}
                disabled={isLoading}
                style={{ accentColor: "var(--accent-color)" }}
              />
              <div>
                <strong>Copiar o vídeo para o projeto (Recomendado)</strong>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Mantém uma cópia de segurança na pasta do projeto.
                </div>
              </div>
            </label>

            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              fontSize: "13px", 
              cursor: "pointer" 
            }}>
              <input
                type="radio"
                name="copyOption"
                checked={!copyVideo}
                onChange={() => setCopyVideo(false)}
                disabled={isLoading}
                style={{ accentColor: "var(--accent-color)" }}
              />
              <div>
                <strong>Referenciar o arquivo original</strong>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Evita duplicar espaço em disco (não move nem altera o original).
                </div>
              </div>
            </label>
          </div>

          {/* Ações */}
          <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginTop: "20px" }}>
            <button 
              type="button" 
              className="btn" 
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => onNavigate("home")}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, justifyContent: "center" }}
              disabled={isLoading}
            >
              {isLoading ? "Analisando..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
