// プロジェクトデータの型定義

export type StickerStatus = 'unchecked' | 'adopted' | 'needsFix'
export type JobState = 'idle' | 'running' | 'success' | 'failed' | 'cancelled'

export interface TextStyle {
  fontFamily: string
  fontSize: number
  color: string
  strokeColor: string
  strokeWidth: number
  // 画像内の相対位置 (0〜1)。文字ブロックの中心位置
  x: number
  y: number
}

export interface Sticker {
  id: string
  text: string
  expression: string
  pose: string
  // プロジェクトフォルダからの相対パス。未生成なら null
  imagePath: string | null
  status: StickerStatus
  job: JobState
  textStyle: TextStyle
}

export interface CharacterSettings {
  name: string
  keepTraits: string
  notes: string
}

export interface SalesInfo {
  title: string
  description: string
  creatorName: string
  copyright: string
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  referenceImages: string[]
  character: CharacterSettings
  stickerCount: number
  stickers: Sticker[]
  sales: SalesInfo
  // メイン画像・タブ画像に使うスタンプのID
  mainStickerId: string | null
  generator: string
}

export interface ProjectSummary {
  id: string
  name: string
  updatedAt: string
}

export type IssueLevel = 'error' | 'warning'

export interface ValidationIssue {
  level: IssueLevel
  // 対象 (スタンプID / 'main' / 'tab' / 'zip' / 'sales' / 'set')
  target: string
  message: string
}
