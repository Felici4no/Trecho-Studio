import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { Project, Clip, MediaMetadata, RecentProject, WorkspaceSettings } from "../types/project";

interface ProjectState {
  activeProject: Project | null;
  workspacePath: string;
  recentProjects: RecentProject[];
  isSystemOk: boolean;
  isLoading: boolean;
  error: string | null;

  setWorkspacePath: (path: string) => void;
  loadWorkspace: (path: string) => Promise<void>;
  createProject: (name: string, videoPath: string, copyVideo: boolean) => Promise<Project | null>;
  loadProject: (projectJsonPath: string) => Promise<Project | null>;
  closeProject: () => void;
  saveActiveProject: (project: Project) => Promise<void>;
  addClipToProject: (clip: Clip) => Promise<void>;
  updateClipRender: (clipId: string, status: any, outputPath?: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  activeProject: null,
  workspacePath: "",
  recentProjects: [],
  isSystemOk: false,
  isLoading: false,
  error: null,

  setWorkspacePath: (path) => set({ workspacePath: path }),

  loadWorkspace: async (path) => {
    set({ isLoading: true, error: null });
    try {
      const settingsPath = `${path}/settings.json`;
      let settings: WorkspaceSettings = { workspacePath: path, recentProjects: [] };
      
      try {
        // Tenta ler o arquivo de configurações
        const contentStr = await invoke<string>("load_project_json", { path: settingsPath });
        settings = JSON.parse(contentStr);
      } catch (err: any) {
        // Se falhar (arquivo não existe), cria um padrão
        if (err.code === "PROJECT_NOT_FOUND" || err.message?.includes("not found")) {
          await invoke("save_project_json", {
            path: settingsPath,
            content: JSON.stringify(settings, null, 2)
          });
        } else {
          console.error("Erro ao carregar settings:", err);
        }
      }

      set({
        workspacePath: path,
        recentProjects: settings.recentProjects || [],
        isLoading: false
      });
    } catch (err: any) {
      set({ error: `Falha ao inicializar o workspace: ${err.message || err}`, isLoading: false });
    }
  },

  createProject: async (name, videoPath, copyVideo) => {
    set({ isLoading: true, error: null });
    const { workspacePath, recentProjects } = get();
    
    try {
      // 1. Gera UUID e caminhos
      const uuid = crypto.randomUUID();
      const projectDir = `${workspacePath}/projects/${uuid}`;
      const projectJsonPath = `${projectDir}/project.json`;
      const videoFilename = videoPath.split(/[/\\]/).pop() || "original.mp4";
      
      // Define o caminho final da mídia
      const finalVideoPath = copyVideo 
        ? `${projectDir}/source/${videoFilename}` 
        : videoPath;

      // 2. Se a opção for copiar o vídeo
      if (copyVideo) {
        await invoke("copy_project_video", {
          sourcePath: videoPath,
          destPath: finalVideoPath
        });
      }

      // 3. Executa ffprobe no vídeo
      const probeResultStr = await invoke<string>("probe_video", { inputPath: finalVideoPath });
      const probeData = JSON.parse(probeResultStr);
      
      if (!probeData.success) {
        throw new Error(probeData.error?.message || "ffprobe falhou na análise do vídeo");
      }

      const meta: MediaMetadata = {
        originalName: videoFilename,
        path: copyVideo ? `source/${videoFilename}` : videoPath, // se referenciado, guarda caminho absoluto
        durationMs: probeData.data.durationMs,
        width: probeData.data.width,
        height: probeData.data.height,
        frameRate: probeData.data.frameRate,
        videoCodec: probeData.data.videoCodec,
        audioCodec: probeData.data.audioCodec
      };

      // 4. Cria objeto do projeto
      const timestamp = new Date().toISOString();
      const newProject: Project = {
        schemaVersion: 1,
        id: uuid,
        name: name,
        createdAt: timestamp,
        updatedAt: timestamp,
        source: meta,
        clips: []
      };

      // 5. Salva o project.json
      await invoke("save_project_json", {
        path: projectJsonPath,
        content: JSON.stringify(newProject, null, 2)
      });

      // 6. Cria o README.md legível por humanos
      const readmePath = `${projectDir}/README.md`;
      const readmeContent = `# ${name}\n\n## Vídeo original\n\n- Arquivo: ${videoFilename}\n- Duração: ${(meta.durationMs/1000).toFixed(1)}s\n- Resolução: ${meta.width}x${meta.height}\n\n## Cortes\n\n*(Nenhum corte gerado ainda)*\n`;
      await invoke("write_text_file", { path: readmePath, content: readmeContent });
      
      // 7. Atualiza lista de recentes no settings.json do workspace
      const updatedRecents = [
        {
          id: uuid,
          name: name,
          path: projectJsonPath,
          lastOpenedAt: timestamp
        },
        ...recentProjects.filter(p => p.path !== projectJsonPath)
      ].slice(0, 10);

      await invoke("save_project_json", {
        path: `${workspacePath}/settings.json`,
        content: JSON.stringify({ workspacePath, recentProjects: updatedRecents }, null, 2)
      });

      // 8. Atualiza store
      set({
        activeProject: newProject,
        recentProjects: updatedRecents,
        isLoading: false
      });

      return newProject;
    } catch (err: any) {
      set({ error: `Falha ao criar o projeto: ${err.message || err}`, isLoading: false });
      return null;
    }
  },

  loadProject: async (projectJsonPath) => {
    set({ isLoading: true, error: null });
    const { workspacePath, recentProjects } = get();

    try {
      const contentStr = await invoke<string>("load_project_json", { path: projectJsonPath });
      const project: Project = JSON.parse(contentStr);

      if (project.schemaVersion !== 1 || !project.id || !project.source) {
        throw new Error("O arquivo project.json está em formato inválido.");
      }

      // Atualiza recentProjects
      const timestamp = new Date().toISOString();
      const updatedRecents = [
        {
          id: project.id,
          name: project.name,
          path: projectJsonPath,
          lastOpenedAt: timestamp
        },
        ...recentProjects.filter(p => p.path !== projectJsonPath)
      ].slice(0, 10);

      if (workspacePath) {
        await invoke("save_project_json", {
          path: `${workspacePath}/settings.json`,
          content: JSON.stringify({ workspacePath, recentProjects: updatedRecents }, null, 2)
        });
      }

      set({
        activeProject: project,
        recentProjects: updatedRecents,
        isLoading: false
      });

      return project;
    } catch (err: any) {
      set({ error: `Falha ao carregar o projeto: ${err.message || err}`, isLoading: false });
      return null;
    }
  },

  closeProject: () => set({ activeProject: null, error: null }),

  saveActiveProject: async (project) => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      const projectJsonPath = `${workspacePath}/projects/${project.id}/project.json`;
      await invoke("save_project_json", {
        path: projectJsonPath,
        content: JSON.stringify(project, null, 2)
      });
      set({ activeProject: project });
    } catch (err: any) {
      console.error("Erro ao salvar o projeto:", err);
    }
  },

  addClipToProject: async (clip) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      clips: [...activeProject.clips.filter(c => c.id !== clip.id), clip],
      updatedAt: new Date().toISOString()
    };

    await get().saveActiveProject(updatedProject);
  },

  updateClipRender: async (clipId, status, outputPath) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedClips = activeProject.clips.map(c => {
      if (c.id === clipId) {
        return {
          ...c,
          render: {
            status,
            outputPath: outputPath || c.render?.outputPath,
            renderedAt: status === "completed" ? new Date().toISOString() : c.render?.renderedAt,
            error: status === "failed" ? "A renderização falhou" : undefined
          }
        };
      }
      return c;
    });

    const updatedProject = {
      ...activeProject,
      clips: updatedClips,
      updatedAt: new Date().toISOString()
    };

    await get().saveActiveProject(updatedProject);
  }
}));
