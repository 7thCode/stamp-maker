// 表情・ポーズの日本語を、画像生成プロンプト向けの英語へ翻訳する(ローカルのOllamaを使用)。
// 素材は外部送信しない。モデルの読み込みが重いため、まとめて1回の操作で翻訳する。
const OLLAMA_URL = process.env['STAMP_OLLAMA_URL'] ?? 'http://localhost:11434'
const MODEL_FROM_ENV = process.env['STAMP_TRANSLATE_MODEL']
const OLLAMA_MODEL = MODEL_FROM_ENV ?? 'gpt-oss:20b'
const MODEL_FAMILY = 'gpt-oss'
// 初回のモデル読み込みに数分かかることがある
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const TAGS_TIMEOUT_MS = 5000
const KEEP_ALIVE_DURING_BATCH = '5m'
const NON_ASCII = /[^\x00-\x7f]/

export type FetchLike = (url: string, init: { method: string; body?: string; signal: AbortSignal }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
}>

export function needsTranslation(text: string): boolean {
  return NON_ASCII.test(text)
}

export function buildTranslationRequest(text: string, keepAlive: string | number, model: string = OLLAMA_MODEL): Record<string, unknown> {
  return {
    model,
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

// 入っているモデルから翻訳に使うものを選ぶ。既定の gpt-oss:20b が無くても、同じ gpt-oss 系があればそれを使う
export function pickModel(installed: readonly string[], preferred: string): string | null {
  if (installed.includes(preferred)) return preferred
  return installed.find((name) => name === MODEL_FAMILY || name.startsWith(`${MODEL_FAMILY}:`)) ?? null
}

// 入っているモデル名を取得する。取得できなければ null(その場合は既定のモデルで試す)
async function listInstalledModels(fetchFn: FetchLike): Promise<string[] | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TAGS_TIMEOUT_MS)
  try {
    const res = await fetchFn(`${OLLAMA_URL}/api/tags`, { method: 'GET', signal: ctrl.signal })
    if (!res.ok) return null
    const models = ((await res.json()) as { models?: Array<{ name?: unknown }> } | null)?.models
    if (!Array.isArray(models)) return null
    return models.map((m) => m.name).filter((n): n is string => typeof n === 'string')
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function resolveModel(fetchFn: FetchLike): Promise<string> {
  if (MODEL_FROM_ENV) return MODEL_FROM_ENV
  const installed = await listInstalledModels(fetchFn)
  if (!installed) return OLLAMA_MODEL
  const model = pickModel(installed, OLLAMA_MODEL)
  if (model) return model
  const list = installed.length ? installed.join('、') : '(なし)'
  throw new Error(`Ollamaに ${MODEL_FAMILY} 系のモデルが見つかりません。入っているモデル: ${list}。ollama pull ${OLLAMA_MODEL} で取得してください`)
}

// Ollamaのエラー応答から原因を取り出す。404のときだけモデル未取得とみなし、それ以外は返された内容をそのまま示す
async function describeHttpError(res: { status: number; json(): Promise<unknown> }, model: string): Promise<string> {
  const body = await res.json().catch(() => null)
  const detail = (body as { error?: unknown } | null)?.error
  const reason = typeof detail === 'string' && detail ? `: ${detail}` : ''
  if (res.status === 404) return `Ollamaにモデル ${model} が見つかりません(404)${reason}`
  return `Ollamaがエラーを返しました(${res.status})${reason}`
}

// 日本語を含む項目だけ翻訳し、結果を同じ並びで返す(英語のみ・空は素通し)
export async function translateAll(texts: readonly string[], fetchFn: FetchLike): Promise<string[]> {
  const targets = texts.map((t, i) => (needsTranslation(t) ? i : -1)).filter((i) => i >= 0)
  const out = [...texts]
  if (targets.length === 0) return out
  const model = await resolveModel(fetchFn)
  for (const [n, index] of targets.entries()) {
    // 最後の1件でモデルを解放し、続く画像生成とメモリを取り合わないようにする
    const keepAlive = n === targets.length - 1 ? 0 : KEEP_ALIVE_DURING_BATCH
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetchFn(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify(buildTranslationRequest(texts[index], keepAlive, model)),
        signal: ctrl.signal
      })
      if (!res.ok) throw new Error(await describeHttpError(res, model))
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
