import { createWriteStream } from 'node:fs'
import { rename, rm, stat } from 'node:fs/promises'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { SD_MODEL_NAMES } from './sdRunner'

// 画像生成に使うモデル(初回起動時にダウンロードする)。sd-cli は配布物に同梱する
export interface ModelSpec {
  file: string
  label: string
  url: string
}

const HF = 'https://huggingface.co'
export const MODEL_SPECS: readonly ModelSpec[] = [
  { file: SD_MODEL_NAMES.diffusion, label: '画像生成モデル(約4GB)', url: `${HF}/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q8_0.gguf` },
  { file: SD_MODEL_NAMES.llm, label: 'テキストエンコーダ(約4GB)', url: `${HF}/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q8_0.gguf` },
  { file: SD_MODEL_NAMES.vae, label: 'VAE(約0.2GB)', url: `${HF}/black-forest-labs/FLUX.2-klein-4B/resolve/main/vae/diffusion_pytorch_model.safetensors` }
]

// 通信が止まったとみなすまでの無通信の時間
const IDLE_TIMEOUT_MS = 60 * 1000

export type FetchFn = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<Response>

async function sizeOf(path: string): Promise<number> {
  try { return (await stat(path)).size } catch { return 0 }
}

// 全体の大きさ。206 は Content-Range の末尾、200 は Content-Length。分からなければ null
function totalSize(res: Response): number | null {
  const range = /\/(\d+)$/.exec(res.headers.get('content-range') ?? '')
  if (res.status === 206 && range) return Number(range[1])
  const length = Number(res.headers.get('content-length'))
  return res.status === 200 && length > 0 ? length : null
}

// url を dest へダウンロードする。取得中は dest.part に書き、前回の続きがあれば再開する。
// 完了したら大きさを確かめてから dest へ改名するので、途中で切れたファイルを完成品とは扱わない。
export async function downloadFile(
  url: string,
  dest: string,
  fetchFn: FetchFn,
  onProgress: (done: number, total: number | null) => void
): Promise<void> {
  const part = `${dest}.part`
  let offset = await sizeOf(part)
  const ctrl = new AbortController()
  let idle: ReturnType<typeof setTimeout> | undefined
  const touch = (): void => {
    clearTimeout(idle)
    idle = setTimeout(() => ctrl.abort(), IDLE_TIMEOUT_MS)
  }
  touch()
  try {
    const headers: Record<string, string> = offset > 0 ? { Range: `bytes=${offset}-` } : {}
    const res = await fetchFn(url, { headers, signal: ctrl.signal })
    // 続きの位置が範囲外なら、前回の中途半端なファイルを捨てて最初から取り直す
    if (res.status === 416) {
      await rm(part, { force: true })
      clearTimeout(idle)
      return downloadFile(url, dest, fetchFn, onProgress)
    }
    if (!res.ok || !res.body) throw new Error(`ダウンロードに失敗しました(HTTP ${res.status})`)
    // サーバーが Range を無視した(200)ときは、最初から書き直す
    if (res.status === 200) offset = 0
    const total = totalSize(res)
    let done = offset
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        done += chunk.length
        touch()
        onProgress(done, total)
        cb(null, chunk)
      }
    })
    await pipeline(Readable.fromWeb(res.body as never), counter, createWriteStream(part, { flags: offset > 0 ? 'a' : 'w' }), { signal: ctrl.signal })
    const size = await sizeOf(part)
    if (total !== null && size !== total) {
      throw new Error(`ダウンロードが途中で切れました(${size} / ${total} バイト)`)
    }
    await rename(part, dest)
  } finally {
    clearTimeout(idle)
  }
}
