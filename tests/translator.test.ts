import { describe, expect, it } from 'vitest'
import { needsTranslation, parseTranslation, translateAll, type FetchLike } from '../src/main/translator'

function fakeFetch(map: Record<string, string>, calls: Array<Record<string, unknown>> = []): FetchLike {
  return async (_url, init) => {
    const req = JSON.parse(init.body) as { prompt: string; keep_alive: unknown }
    calls.push(req as Record<string, unknown>)
    const src = req.prompt.split('\n\n').pop() as string
    return { ok: true, status: 200, json: async () => ({ response: map[src] ?? '?' }) }
  }
}

describe('needsTranslation', () => {
  it('日本語を含むときだけ true', () => {
    expect(needsTranslation('泣いている')).toBe(true)
    expect(needsTranslation('crying')).toBe(false)
    expect(needsTranslation('')).toBe(false)
  })
})

describe('parseTranslation', () => {
  it('前後の空白と引用符を除く', () => {
    expect(parseTranslation({ response: ' "crying" \n' })).toBe('crying')
  })
  it('空の結果はエラー', () => {
    expect(() => parseTranslation({ response: '  ' })).toThrow()
    expect(() => parseTranslation(null)).toThrow()
  })
})

describe('translateAll', () => {
  it('日本語だけ翻訳し、英語と空は素通しで並びを保つ', async () => {
    const out = await translateAll(['泣いている', 'smiling', '', '怒っている'], fakeFetch({ '泣いている': 'crying', '怒っている': 'angry' }))
    expect(out).toEqual(['crying', 'smiling', '', 'angry'])
  })
  it('最後の1件だけモデルを解放(keep_alive=0)する', async () => {
    const calls: Array<Record<string, unknown>> = []
    await translateAll(['あ', 'い'], fakeFetch({ 'あ': 'a', 'い': 'b' }, calls))
    expect(calls.map((c) => c['keep_alive'])).toEqual(['5m', 0])
  })
  it('翻訳対象がなければ通信しない', async () => {
    const calls: Array<Record<string, unknown>> = []
    await translateAll(['smile', ''], fakeFetch({}, calls))
    expect(calls).toHaveLength(0)
  })
  it('接続失敗は日本語のエラーにする', async () => {
    const failing: FetchLike = async () => { throw new TypeError('fetch failed') }
    await expect(translateAll(['あ'], failing)).rejects.toThrow('Ollamaに接続できません')
  })
  it('404はモデル未取得として知らせる', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 404, json: async () => ({ error: 'model not found' }) })
    await expect(translateAll(['あ'], bad)).rejects.toThrow('見つかりません(404): model not found')
  })
  it('404以外はOllamaの返した原因をそのまま示し、モデル未取得とは言わない', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 500, json: async () => ({ error: 'model requires more system memory' }) })
    const err = await translateAll(['あ'], bad).catch((e: Error) => e)
    expect((err as Error).message).toContain('500')
    expect((err as Error).message).toContain('model requires more system memory')
    expect((err as Error).message).not.toContain('見つかりません')
  })
  it('エラー本文がJSONでなくても状態コードを示す', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad json') } })
    await expect(translateAll(['あ'], bad)).rejects.toThrow('502')
  })
})
