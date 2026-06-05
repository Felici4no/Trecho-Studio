import React, { useState } from "react";

interface ToolStatus {
  available: boolean;
  source: string; // "configured" | "local" | "system" | "missing"
  executablePath: string;
  version: string;
}

interface DiagnosticPageProps {
  status: {
    python: ToolStatus;
    ffmpeg: ToolStatus;
    ffprobe: ToolStatus;
    workspaceOk: boolean;
    allOk: boolean;
  } | null;
  onRetry: () => void;
  workspacePath: string;
  onSelectWorkspace: () => void;
}

export const DiagnosticPage: React.FC<DiagnosticPageProps> = ({
  status,
  onRetry,
  workspacePath,
  onSelectWorkspace,
}) => {
  const [showTechDetails, setShowTechDetails] = useState(false);

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "configured":
        return "Configurado";
      case "local":
        return "Local (repositório)";
      case "system":
        return "Sistema (PATH)";
      case "missing":
      default:
        return "Ausente";
    }
  };

  const isWorkspaceConfigured = !!workspacePath;
  const workspaceStatusText = !isWorkspaceConfigured
    ? "Ainda não configurado"
    : status?.workspaceOk
    ? "Acessível"
    : "Sem Acesso de Escrita";

  const workspaceBadgeClass = !isWorkspaceConfigured
    ? "neutral"
    : status?.workspaceOk
    ? "ok"
    : "fail";

  // O diagnóstico está liberado se todas as dependências estão disponíveis e o workspace está acessível
  const pythonOk = status?.python?.available ?? false;
  const ffmpegOk = status?.ffmpeg?.available ?? false;
  const ffprobeOk = status?.ffprobe?.available ?? false;
  const workspaceOk = status?.workspaceOk ?? false;

  return (
    <div className="diagnostic-container">
      <div className="diagnostic-card">
        <h1 className="diagnostic-title">Trecho Studio</h1>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
          Para processar e cortar seus vídeos de forma local e offline, a aplicação precisa de algumas ferramentas externas instaladas.
        </p>

        <div className="diagnostic-list">
          {/* Item Python */}
          <div className={`diagnostic-item ${pythonOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>Python (v3.11+)</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {pythonOk 
                  ? `Versão: ${status?.python?.version} • Fonte: ${getSourceLabel(status?.python?.source || "")}` 
                  : "Não detectado ou versão inferior a 3.11"}
              </div>
            </div>
            <span className={`status-badge ${pythonOk ? "ok" : "fail"}`}>
              {pythonOk ? "Disponível" : "Ausente"}
            </span>
          </div>

          {/* Item FFmpeg */}
          <div className={`diagnostic-item ${ffmpegOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>FFmpeg</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {ffmpegOk 
                  ? `Versão: ${status?.ffmpeg?.version} • Fonte: ${getSourceLabel(status?.ffmpeg?.source || "")}` 
                  : "Não encontrado no sistema"}
              </div>
            </div>
            <span className={`status-badge ${ffmpegOk ? "ok" : "fail"}`}>
              {ffmpegOk ? "Disponível" : "Ausente"}
            </span>
          </div>

          {/* Item ffprobe */}
          <div className={`diagnostic-item ${ffprobeOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>ffprobe</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {ffprobeOk 
                  ? `Versão: ${status?.ffprobe?.version} • Fonte: ${getSourceLabel(status?.ffprobe?.source || "")}` 
                  : "Não encontrado no sistema"}
              </div>
            </div>
            <span className={`status-badge ${ffprobeOk ? "ok" : "fail"}`}>
              {ffprobeOk ? "Disponível" : "Ausente"}
            </span>
          </div>

          {/* Item Workspace */}
          <div className={`diagnostic-item ${workspaceBadgeClass}`}>
            <div>
              <div style={{ fontWeight: 600 }}>Diretório do Workspace</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
                {workspacePath ? workspacePath : "Nenhum diretório selecionado para salvar seus projetos"}
              </div>
            </div>
            <span className={`status-badge ${workspaceBadgeClass}`}>
              {workspaceStatusText}
            </span>
          </div>
        </div>

        {/* Como resolver se houver erros de dependências reais */}
        {(!pythonOk || !ffmpegOk || !ffprobeOk || (isWorkspaceConfigured && !workspaceOk)) && (
          <div style={{ padding: "12px", background: "#fef8f0", borderLeft: "4px solid var(--color-warning)", fontSize: "12px", color: "var(--text-primary)", marginTop: "16px" }}>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Instruções de Resolução:</div>
            <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
              {!pythonOk && <li>Instale o Python 3.11+ e marque a caixa "Add python.exe to PATH" ou configure a dependência portátil local.</li>}
              {(!ffmpegOk || !ffprobeOk) && <li>Adicione o FFmpeg ao PATH ou copie os executáveis na pasta 'ffmpeg' na raiz do projeto.</li>}
              {isWorkspaceConfigured && !workspaceOk && <li>Escolha um diretório onde o aplicativo tenha permissão de gravação.</li>}
            </ul>
          </div>
        )}

        {/* Detalhes técnicos recolhíveis */}
        <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
          <button 
            type="button" 
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--text-secondary)", 
              fontSize: "12px", 
              cursor: "pointer", 
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "inherit"
            }} 
            onClick={() => setShowTechDetails(!showTechDetails)}
          >
            {showTechDetails ? "▼ Ocultar Detalhes Técnicos" : "► Exibir Detalhes Técnicos"}
          </button>
          
          {showTechDetails && (
            <div style={{ 
              marginTop: "8px", 
              background: "var(--bg-secondary)", 
              padding: "10px", 
              borderRadius: "4px", 
              fontSize: "11px", 
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              <div><strong>Python Path:</strong> {status?.python?.executablePath || "Não disponível"}</div>
              <div><strong>FFmpeg Path:</strong> {status?.ffmpeg?.executablePath || "Não disponível"}</div>
              <div><strong>ffprobe Path:</strong> {status?.ffprobe?.executablePath || "Não disponível"}</div>
              <div><strong>Workspace Path:</strong> {workspacePath || "Ainda não definido"}</div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button className="btn" style={{ flex: 1 }} onClick={onSelectWorkspace}>
            Escolher Pasta Workspace
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onRetry}>
            Verificar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};
