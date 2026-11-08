import { describe, expect, it } from 'vitest'
import { exportDirPath, exportFolderName } from '../src/main/exportDir'

const NOW = new Date('2026-11-08T01:02:03.456Z')

describe('exportFolderName', () => {
  it('プロジェクト名と日時から作る', () => {
    expect(exportFolderName('たこ', NOW)).toBe('たこ-2026-11-08T01-02-03-456Z')
  })
  it('ファイル名に使えない文字を除く', () => {
    expect(exportFolderName('a/b:c*?', NOW).startsWith('abc-')).toBe(true)
  })
  it('空の名前は既定名になる', () => {
    expect(exportFolderName('  / ', NOW).startsWith('stamps-')).toBe(true)
  })
  it('長い名前は切り詰める', () => {
    expect(exportFolderName('あ'.repeat(100), NOW).startsWith('あ'.repeat(40) + '-')).toBe(true)
  })
})

describe('exportDirPath', () => {
  it('ダウンロードフォルダ直下になる', () => {
    expect(exportDirPath('/Users/x/Downloads', 'p', NOW)).toBe('/Users/x/Downloads/p-2026-11-08T01-02-03-456Z')
  })
})
