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

// 画像生成の環境(sd-cli とモデル)の用意の状況。足りなければ、アプリが起動時に自動で用意する
export interface SdSetupState {
  phase: 'ready' | 'running' | 'failed'
  // 実行中の手順(例: 「画像生成モデルを取得しています」)
  step?: string
  // 手順の補足(取得済みの容量など)
  detail?: string
  // 手順の進み具合(0〜1)。分からないときは無し
  progress?: number
  // 失敗の理由
  error?: string
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
  openCreatorsMarket(): Promise<void>
  exportSet(req: ExportRequest): Promise<ExportResponse>
  getSdSetup(): Promise<SdSetupState>
  retrySdSetup(): Promise<void>
  // 状況の変化を受け取る。戻り値で解除する
  onSdSetup(listener: (state: SdSetupState) => void): () => void
}
