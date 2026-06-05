export type AspectRatio = "9:16" | "1:1" | "16:9";

export interface MediaMetadata {
  originalName: string;
  path: string;
  durationMs: number;
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string;
  audioCodec?: string;
}

export interface Clip {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
  aspectRatio: AspectRatio;
  resolution: {
    width: number;
    height: number;
  };
  cropMode: "cover" | "contain";
  createdAt: string;
  render?: RenderResult;
}

export interface RenderResult {
  status: "idle" | "queued" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  outputPath?: string;
  renderedAt?: string;
  error?: string;
}

export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: MediaMetadata;
  clips: Clip[];
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
}

export interface WorkspaceSettings {
  workspacePath: string;
  recentProjects: RecentProject[];
}
