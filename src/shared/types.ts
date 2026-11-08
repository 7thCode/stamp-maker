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
  // 画像生成に使う英語版(空なら expression / pose をそのまま使う)
  expressionEn: string
  poseEn: string
  // プロジェクトフォルダからの相対パス。未生成なら null
  imagePath: string | null
  status: StickerStatus
  job: JobState
  textStyle: TextStyle
}

export interface CharacterSettings {
  name: string
  keepTraits: string
  // 生成に使う英語版。空なら日本語をそのまま使う
  keepTraitsEn: string
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
  // LINEに登録するメイン画像(240×240)とトークルームタブ画像(96×74)の専用枠
  mainImage: Sticker
  tabImage: Sticker
  sales: SalesInfo
  // 専用画像が採用されていないときに、メイン画像・タブ画像の元にするスタンプのID
  mainStickerId: string | null
  generator: string
  // 申請前チェックリストの確認状況(項目ID → 確認済み)
  publishChecks: Record<string, boolean>
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
