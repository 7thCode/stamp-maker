import type { Project, ProjectSummary, ValidationIssue } from './types'

export interface ExportRequest {
  projectId: string
  stickers: Array<{ id: string; png: ArrayBuffer }>
  main: ArrayBuffer
  tab: ArrayBuffer
}

export interface ExportResponse {
  issues: ValidationIssue[]
  outputDir: string | null
}

export interface StampApi {
  listProjects(): Promise<ProjectSummary[]>
  createProject(name: string): Promise<Project>
  loadProject(id: string): Promise<Project>
  saveProject(project: Project): Promise<Project>
  deleteProject(id: string): Promise<boolean>
  importReferences(id: string): Promise<Project | null>
  removeReference(id: string, rel: string): Promise<Project | null>
  readImage(id: string, rel: string): Promise<string>
  listGenerators(): Promise<Array<{ id: string; label: string }>>
  generateSticker(id: string, stickerId: string): Promise<Project>
  importStickerImage(id: string, stickerId: string): Promise<Project | null>
  removeBackground(id: string, stickerId: string): Promise<Project>
  translatePrompts(id: string): Promise<Project>
  translateText(text: string): Promise<string>
  generateReferenceCandidate(id: string, description: string): Promise<string>
  adoptReferenceCandidate(id: string, candidateRel: string): Promise<Project>
  exportSet(req: ExportRequest): Promise<ExportResponse>
}
