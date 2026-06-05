import React from "react";

interface DiagnosticPageProps {
  status: {
    pythonOk: boolean;
    pythonVersion: string;
    ffmpegOk: boolean;
    ffprobeOk: boolean;
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
  return (
    <div className="diagnostic-container">
      <div className="diagnostic-card">
        <h1 className="diagnostic-title">Trecho Studio</h1>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Para processar e cortar seus vídeos de forma local e offline, a aplicação precisa de algumas ferramentas externas instaladas e disponíveis no PATH do seu sistema.
        </p>

        <div className="diagnostic-list">
          <div className={`diagnostic-item ${status?.pythonOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>Python (v3.11+)</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {status?.pythonOk 
                  ? `Detectado: versão ${status.pythonVersion}` 
                  : "Não detectado ou versão inferior a 3.11"}
              </div>
            </div>
            <span className={`status-badge ${status?.pythonOk ? "ok" : "fail"}`}>
              {status?.pythonOk ? "Disponível" : "Ausente"}
            </span>
          </div>

          <div className={`diagnostic-item ${status?.ffmpegOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>FFmpeg</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {status?.ffmpegOk 
                  ? "Detectado com sucesso no PATH" 
                  : "Não encontrado no PATH do sistema"}
              </div>
            </div>
            <span className={`status-badge ${status?.ffmpegOk ? "ok" : "fail"}`}>
              {status?.ffmpegOk ? "Disponível" : "Ausente"}
            </span>
          </div>

          <div className={`diagnostic-item ${status?.ffprobeOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>ffprobe</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {status?.ffprobeOk 
                  ? "Detectado com sucesso no PATH" 
                  : "Não encontrado no PATH do sistema"}
              </div>
            </div>
            <span className={`status-badge ${status?.ffprobeOk ? "ok" : "fail"}`}>
              {status?.ffprobeOk ? "Disponível" : "Ausente"}
            </span>
          </div>

          <div className={`diagnostic-item ${status?.workspaceOk ? "ok" : "fail"}`}>
            <div>
              <div style={{ fontWeight: 600 }}>Diretório do Workspace</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
                {workspacePath ? workspacePath : "Nenhum diretório selecionado"}
              </div>
            </div>
            <span className={`status-badge ${status?.workspaceOk ? "ok" : "fail"}`}>
              {status?.workspaceOk ? "Acessível" : "Sem Acesso"}
            </span>
          </div>
        </div>

        {!status?.allOk && (
          <div style={{ padding: "12px", background: "#fef8f0", borderLeft: "4px solid var(--color-warning)", fontSize: "12px", color: "var(--text-primary)" }}>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Como resolver:</div>
            <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {!status?.pythonOk && <li>Instale o Python 3.11+ e marque a caixa "Add python.exe to PATH".</li>}
              {(!status?.ffmpegOk || !status?.ffprobeOk) && <li>Baixe o FFmpeg, extraia-o e adicione a pasta bin ao PATH.</li>}
              {!status?.workspaceOk && <li>Escolha um diretório onde o aplicativo tenha permissão de escrita.</li>}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <button className="btn" style={{ flex: 1 }} onClick={onSelectWorkspace}>
            Selecionar Pasta Workspace
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onRetry}>
            Verificar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};
