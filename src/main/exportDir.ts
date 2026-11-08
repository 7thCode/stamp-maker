import { join } from 'node:path'

const UNSAFE_CHARS = /[\\/:*?"<>|\x00-\x1f]/g
const MAX_NAME_LENGTH = 40
const DEFAULT_NAME = 'stamps'

// 書き出しフォルダ名: <プロジェクト名>-<日時>。ファイル名に使えない文字は除く
export function exportFolderName(projectName: string, now: Date): string {
  const safe = projectName.replace(UNSAFE_CHARS, '').trim().slice(0, MAX_NAME_LENGTH) || DEFAULT_NAME
  const stamp = now.toISOString().replace(/[:.]/g, '-')
  return `${safe}-${stamp}`
}

// 書き出し先: ダウンロードフォルダ直下
export function exportDirPath(downloadsDir: string, projectName: string, now: Date): string {
  return join(downloadsDir, exportFolderName(projectName, now))
}
