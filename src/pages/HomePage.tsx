import React from "react";
import { useProjectStore } from "../stores/projectStore";
import { open } from "@tauri-apps/plugin-dialog";

interface HomePageProps {
  onNavigate: (page: "new-project" | "editor") => void;
  onSelectWorkspace: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectWorkspace }) => {
  const { recentProjects, workspacePath, loadProject, error } = useProjectStore();

  const handleOpenProjectDialog = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: "Trecho Project",
          extensions: ["json"]
        }]
      });

      if (selected && typeof selected === "string") {
        const loaded = await loadProject(selected);
        if (loaded) {
          onNavigate("editor");
        }
      }
    } catch (err) {
      console.error("Falha ao abrir diálogo de projeto:", err);
    }
  };

  const handleOpenRecent = async (path: string) => {
    const loaded = await loadProject(path);
    if (loaded) {
      onNavigate("editor");
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "48px",
      maxWidth: "960px",
      margin: "0 auto",
      width: "100%",
      justifyContent: "center"
    }}>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{
          fontSize: "48px",
          fontWeight: 800,
          letterSpacing: "-1.5px",
          textTransform: "uppercase",
          lineHeight: 1
        }}>
          Trecho Studio
        </h1>
        <p style={{
          fontSize: "16px",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-mono)",
          marginTop: "12px",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          Do vídeo inteiro ao trecho certo.
        </p>
      </div>

      {error && (
        <div style={{
          padding: "12px",
          background: "#fff5f5",
          border: "1px solid var(--color-danger)",
          color: "var(--color-danger)",
          marginBottom: "24px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px"
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "48px" }}>
        {/* Ações Principais */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--text-muted)",
            marginBottom: "8px"
          }}>
            Ações
          </h2>
          
          <button 
            className="btn btn-primary" 
            style={{ padding: "16px", justifyContent: "center" }}
            onClick={() => onNavigate("new-project")}
          >
            Novo Projeto
          </button>
          
          <button 
            className="btn" 
            style={{ padding: "16px", justifyContent: "center" }}
            onClick={handleOpenProjectDialog}
          >
            Abrir Projeto Existente
          </button>
        </div>

        {/* Projetos Recentes */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--text-muted)",
            marginBottom: "16px"
          }}>
            Projetos Recentes
          </h2>

          {recentProjects.length === 0 ? (
            <div style={{
              border: "1px dashed var(--border-color)",
              padding: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              fontSize: "13px"
            }}>
              Nenhum projeto aberto recentemente.
            </div>
          ) : (
            <div style={{
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border-color)"
            }}>
              {recentProjects.map((proj) => (
                <div 
                  key={proj.id}
                  onClick={() => handleOpenRecent(proj.path)}
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid var(--border-color)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "between",
                    alignItems: "center",
                    transition: "background 0.15s ease"
                  }}
                  className="recent-project-row"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{proj.name}</div>
                    <div style={{ 
                      fontSize: "11px", 
                      color: "var(--text-secondary)", 
                      fontFamily: "var(--font-mono)",
                      marginTop: "4px",
                      maxWidth: "400px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {proj.path}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: "11px", 
                    color: "var(--text-muted)",
                    textAlign: "right"
                  }}>
                    {new Date(proj.lastOpenedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barra de Workspace inferior */}
      <div style={{
        marginTop: "64px",
        padding: "12px 16px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Workspace:
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {workspacePath}
          </span>
        </div>
        <button 
          style={{ 
            background: "none", 
            border: "none", 
            textDecoration: "underline", 
            cursor: "pointer",
            fontWeight: 600,
            textTransform: "uppercase",
            fontSize: "11px"
          }}
          onClick={onSelectWorkspace}
        >
          Alterar Pasta
        </button>
      </div>
    </div>
  );
};
