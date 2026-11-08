import { describe, expect, it } from 'vitest'
import { newProject } from '../src/shared/project'
import { CREATORS_MARKET_URL, PUBLISH_CHECKLIST, pendingChecks } from '../src/shared/publish'

describe('申請前チェックリスト', () => {
  it('項目IDが重複しない', () => {
    const ids = PUBLISH_CHECKLIST.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('未確認なら全項目が未確認になる(旧データの undefined も含む)', () => {
    expect(pendingChecks({})).toHaveLength(PUBLISH_CHECKLIST.length)
    expect(pendingChecks(undefined)).toHaveLength(PUBLISH_CHECKLIST.length)
  })

  it('確認済みの項目は未確認から外れる', () => {
    const first = PUBLISH_CHECKLIST[0].id
    const pending = pendingChecks({ [first]: true })
    expect(pending.map((i) => i.id)).not.toContain(first)
    expect(pending).toHaveLength(PUBLISH_CHECKLIST.length - 1)
  })

  it('すべて確認済みなら空になる', () => {
    const all = Object.fromEntries(PUBLISH_CHECKLIST.map((i) => [i.id, true]))
    expect(pendingChecks(all)).toEqual([])
  })

  it('false は未確認として扱う', () => {
    const first = PUBLISH_CHECKLIST[0].id
    expect(pendingChecks({ [first]: false })).toHaveLength(PUBLISH_CHECKLIST.length)
  })

  it('新規プロジェクトは空のチェック状況で始まる', () => {
    expect(newProject('id', 'n', 'now', () => 'x').publishChecks).toEqual({})
  })

  it('全項目に分類・ラベル・ヒントがある', () => {
    for (const item of PUBLISH_CHECKLIST) {
      expect(item.group.trim()).not.toBe('')
      expect(item.label.trim()).not.toBe('')
      expect(item.hint.trim()).not.toBe('')
    }
  })

  it('保存済みの確認状況を保つため、従来の項目IDが残っている', () => {
    const ids = PUBLISH_CHECKLIST.map((i) => i.id)
    for (const legacy of ['reference-rights', 'no-lookalike', 'content-ok', 'model-terms', 'ai-disclosure', 'visual-check', 'read-guidelines']) {
      expect(ids).toContain(legacy)
    }
  })

  it('同じ分類の項目は連続して並ぶ(画面の見出しが重複しない)', () => {
    const seen: string[] = []
    for (const item of PUBLISH_CHECKLIST) {
      if (seen[seen.length - 1] !== item.group) {
        expect(seen).not.toContain(item.group)
        seen.push(item.group)
      }
    }
  })

  it('審査ガイドラインの主な基準を扱う項目がある', () => {
    const ids = PUBLISH_CHECKLIST.map((i) => i.id)
    for (const id of ['no-real-person', 'not-duplicate', 'no-personal-info', 'no-ads', 'readability', 'main-tab-match', 'text-check']) {
      expect(ids).toContain(id)
    }
  })

  it('開く先は https の固定URL', () => {
    expect(CREATORS_MARKET_URL.startsWith('https://')).toBe(true)
  })
})
