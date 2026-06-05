import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "./stores/projectStore";
import { HomePage } from "./pages/HomePage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { EditorPage } from "./pages/EditorPage";
import { DiagnosticPage } from "./pages/DiagnosticPage";

type Page = "home" | "new-project" | "editor";

interface WorkspaceValidationResult {
  success: boolean;
  errorMessage: string | null;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const { workspacePath, setWorkspacePath, loadWorkspace } = useProjectStore();
  const [depStatus, setDepStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Executa checagem de dependências
  const checkDependencies = async (path: string) => {
    setIsChecking(true);
    try {
      const status = await invoke("check_system_dependencies", { workspacePath: path });
      setDepStatus(status);
    } catch (err) {
      console.error("Falha ao checar dependências nativas:", err);
    } finally {
      setIsChecking(false);
    }
  };

  // Carrega workspace salvo no localStorage ao montar
  useEffect(() => {
    const savedPath = localStorage.getItem("trecho_workspace_path");
    if (savedPath) {
      setWorkspacePath(savedPath);
      loadWorkspace(savedPath);
      checkDependencies(savedPath);
    } else {
      setIsChecking(false);
    }
  }, []);

  const handleSelectWorkspace = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true
      });

      if (selected && typeof selected === "string") {
        // Valida a gravação do workspace no Rust antes de aceitar
        const validation = await invoke<WorkspaceValidationResult>("validate_workspace", { path: selected });
        
        if (validation.success) {
          localStorage.setItem("trecho_workspace_path", selected);
          setWorkspacePath(selected);
          await loadWorkspace(selected);
          await checkDependencies(selected);
        } else {
          alert(`Pasta selecionada inválida:\n${validation.errorMessage || "Erro desconhecido ao validar a pasta."}`);
        }
      }
    } catch (err: any) {
      console.error("Erro ao selecionar workspace:", err);
      alert(`Erro ao selecionar a pasta: ${err.message || err}`);
    }
  };

  // Se estiver carregando dependências, mostra tela de carregamento
  if (isChecking) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        gap: "16px",
        fontFamily: "var(--font-mono)"
      }}>
        <div style={{ fontSize: "14px", fontWeight: "bold" }}>Verificando ambiente do sistema...</div>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Verificando Python, FFmpeg e ffprobe</div>
      </div>
    );
  }

  // A aplicação está pronta apenas se todas as dependências estão OK e o workspace está validado
  const isSystemReady = 
    depStatus?.python?.available && 
    depStatus?.ffmpeg?.available && 
    depStatus?.ffprobe?.available && 
    !!workspacePath && 
    depStatus?.workspaceOk;

  if (!isSystemReady) {
    return (
      <DiagnosticPage
        status={depStatus}
        workspacePath={workspacePath}
        onSelectWorkspace={handleSelectWorkspace}
        onRetry={() => checkDependencies(workspacePath)}
      />
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {currentPage === "home" && (
        <HomePage 
          onNavigate={setCurrentPage} 
          onSelectWorkspace={handleSelectWorkspace}
        />
      )}
      {currentPage === "new-project" && (
        <NewProjectPage onNavigate={setCurrentPage} />
      )}
      {currentPage === "editor" && (
        <EditorPage onNavigate={setCurrentPage} />
      )}
    </div>
  );
}

export default App;
