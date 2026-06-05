import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Project, Clip } from "../types/project";
import { useProjectStore } from "./projectStore";

interface RenderState {
  status: "idle" | "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  error: string | null;
  activeJobId: string | null;
  outputPath: string | null;
  unlistenFn: (() => void) | null;

  startRender: (project: Project, clip: Clip, workspacePath: string) => Promise<void>;
  cancelRender: () => Promise<void>;
  resetRender: () => void;
}

export const useRenderStore = create<RenderState>((set, get) => ({
  status: "idle",
  progress: 0,
  error: null,
  activeJobId: null,
  outputPath: null,
  unlistenFn: null,

  startRender: async (project, clip, workspacePath) => {
    // Evita renders paralelos
    if (get().status === "running") return;

    set({
      status: "queued",
      progress: 0,
      error: null,
      activeJobId: clip.id,
      outputPath: null
    });

    try {
      // 1. Monta o plano de renderização
      const projectDir = `${workspacePath}/projects/${project.id}`;
      const inputPathAbs = project.source.path.startsWith("source/") 
        ? `${projectDir}/${project.source.path}` 
        : project.source.path;

      // Nome do output
      const outputFilename = `${clip.name.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      const outputPathAbs = `${projectDir}/renders/${outputFilename}`;

      const renderPlan = {
        inputPath: inputPathAbs,
        outputPath: outputPathAbs,
        startMs: clip.startMs,
        endMs: clip.endMs,
        width: clip.resolution.width,
        height: clip.resolution.height,
        aspectRatio: clip.aspectRatio,
        cropMode: clip.cropMode,
        videoCodec: "libx264",
        audioCodec: "aac"
      };

      // 2. Registra o listener do evento nativo Tauri ANTES de iniciar o processo
      const unlisten = await listen<string>("render-event", (event) => {
        try {
          const payload = JSON.parse(event.payload);
          
          if (payload.jobId !== clip.id) return;

          switch (payload.type) {
            case "render.started":
              set({ status: "running", progress: 0 });
              useProjectStore.getState().updateClipRender(clip.id, "running");
              break;
            case "render.progress":
              set({ progress: payload.progress });
              break;
            case "render.completed":
              set({ status: "completed", progress: 100, outputPath: payload.outputPath });
              useProjectStore.getState().updateClipRender(clip.id, "completed", payload.outputPath);
              get().unlistenFn?.();
              break;
            case "render.failed":
              const isCancelled = payload.error?.code === "RENDER_CANCELLED";
              set({ 
                status: isCancelled ? "cancelled" : "failed", 
                error: payload.error?.message || "Renderização falhou" 
              });
              useProjectStore.getState().updateClipRender(clip.id, isCancelled ? "cancelled" : "failed");
              get().unlistenFn?.();
              break;
          }
        } catch (e) {
          console.error("Erro ao processar evento de render:", e);
        }
      });

      set({ unlistenFn: unlisten });

      // 3. Dispara o processo em Rust (que roda em thread separada)
      await invoke("start_render", {
        planJson: JSON.stringify(renderPlan),
        jobId: clip.id
      });

    } catch (err: any) {
      set({ 
        status: "failed", 
        error: err.message || "Não foi possível iniciar o render." 
      });
      useProjectStore.getState().updateClipRender(clip.id, "failed");
      get().unlistenFn?.();
    }
  },

  cancelRender: async () => {
    try {
      // Chama comando Rust para matar o PID ativo
      await invoke("cancel_render");
      // O evento render.failed com RENDER_CANCELLED deve ser emitido pelo motor,
      // mas garantimos a alteração caso o processo já tenha morrido.
      set({ status: "cancelled" });
    } catch (err) {
      console.error("Erro ao cancelar render:", err);
    }
  },

  resetRender: () => {
    get().unlistenFn?.();
    set({
      status: "idle",
      progress: 0,
      error: null,
      activeJobId: null,
      outputPath: null,
      unlistenFn: null
    });
  }
}));
