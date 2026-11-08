// 表情・ポーズの日本語を、画像生成プロンプト向けの英語へ翻訳する(ローカルのOllamaを使用)。
// 素材は外部送信しない。モデルの読み込みが重いため、まとめて1回の操作で翻訳する。
const OLLAMA_URL = process.env['STAMP_OLLAMA_URL'] ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env['STAMP_TRANSLATE_MODEL'] ?? 'gpt-oss:20b'
// 初回のモデル読み込みに数分かかることがある
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const KEEP_ALIVE_DURING_BATCH = '5m'
const NON_ASCII = /[^\x00-\x7f]/

export type FetchLike = (url: string, init: { method: string; body: string; signal: AbortSignal }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
}>

export function needsTranslation(text: string): boolean {
  return NON_ASCII.test(text)
}

export function buildTranslationRequest(text: string, keepAlive: string | number): Record<string, unknown> {
  return {
    model: OLLAMA_MODEL,
    stream: false,
    keep_alive: keepAlive,
    options: { temperature: 0 },
    prompt:
      'Translate this Japanese description of a cartoon character facial expression or pose into a short English phrase ' +
      'suitable for an image generation prompt. Output only the English phrase, nothing else.\n\n' + text
  }
}

export function parseTranslation(body: unknown): string {
  const response = (body as { response?: unknown } | null)?.response
  if (typeof response !== 'string' || !response.trim()) throw new Error('翻訳結果が空でした')
  return response.trim().replace(/^["「]|["」]$/g, '')
}

// Ollamaのエラー応答から原因を取り出す。404のときだけモデル未取得とみなし、それ以外は返された内容をそのまま示す
async function describeHttpError(res: { status: number; json(): Promise<unknown> }): Promise<string> {
  const body = await res.json().catch(() => null)
  const detail = (body as { error?: unknown } | null)?.error
  const reason = typeof detail === 'string' && detail ? `: ${detail}` : ''
  if (res.status === 404) return `Ollamaにモデル ${OLLAMA_MODEL} が見つかりません(404)${reason}`
  return `Ollamaがエラーを返しました(${res.status})${reason}`
}

// 日本語を含む項目だけ翻訳し、結果を同じ並びで返す(英語のみ・空は素通し)
export async function translateAll(texts: readonly string[], fetchFn: FetchLike): Promise<string[]> {
  const targets = texts.map((t, i) => (needsTranslation(t) ? i : -1)).filter((i) => i >= 0)
  const out = [...texts]
  for (const [n, index] of targets.entries()) {
    // 最後の1件でモデルを解放し、続く画像生成とメモリを取り合わないようにする
    const keepAlive = n === targets.length - 1 ? 0 : KEEP_ALIVE_DURING_BATCH
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetchFn(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify(buildTranslationRequest(texts[index], keepAlive)),
        signal: ctrl.signal
      })
      if (!res.ok) throw new Error(await describeHttpError(res))
      out[index] = parseTranslation(await res.json())
    } catch (err) {
      if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
        throw new Error('Ollamaに接続できません。起動しているか確認してください')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
  return out
}
