import { existsSync } from 'node:fs'
import { mkdir, statfs } from 'node:fs/promises'
import { join } from 'node:path'
import type { SdSetupState } from '../shared/api'
import { downloadFile, type FetchFn, type ModelSpec } from './sdModels'

// モデル3つの合計は約8.5GB。余裕を見て、これだけ空きが無ければ始めない
export const REQUIRED_FREE_BYTES = 10 * 1024 ** 3
const PROGRESS_INTERVAL_MS = 500
const BYTES_PER_MB = 1024 * 1024

export interface SdSetupOptions {
  models: readonly ModelSpec[]
  modelDir: string
  // 同梱の sd-cli の場所
  binPath: string
  // 環境が揃っているか(sd-cli とモデルの有無)
  isReady: () => boolean
  fetchFn: FetchFn
  requiredFreeBytes?: number
}

export function formatMb(bytes: number): string {
  return `${Math.round(bytes / BYTES_PER_MB).toLocaleString('en-US')} MB`
}

// 画像生成のモデルが無いときに、ダウンロードして用意する(sd-cli は配布物に同梱)
export class SdSetup {
  private state: SdSetupState
  private running = false
  private readonly listeners = new Set<(s: SdSetupState) => void>()

  constructor(private readonly options: SdSetupOptions) {
    // 起動直後に start() が呼ばれる前提で、足りないときは「確認中」から始める
    this.state = options.isReady() ? { phase: 'ready' } : { phase: 'running', step: '画像生成の環境を確認しています' }
  }

  getState(): SdSetupState {
    return this.state
  }

  subscribe(listener: (s: SdSetupState) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private set(state: SdSetupState): void {
    this.state = state
    for (const l of this.listeners) l(state)
  }

  // 環境が無ければダウンロードする。実行中・用意済みなら何もしない。終了(成功・失敗)まで待つ
  async start(): Promise<void> {
    if (this.running) return
    if (this.options.isReady()) {
      this.set({ phase: 'ready' })
      return
    }
    if (!existsSync(this.options.binPath)) {
      this.set({ phase: 'failed', error: `画像生成エンジン(sd-cli)が見つかりません(${this.options.binPath})。開発版は scripts/setup-sdcpp.sh を実行してください。配布版なら、アプリを入れ直してください。` })
      return
    }
    this.running = true
    try {
      await this.download()
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      this.set({ phase: 'failed', error: `${reason}\n通信を確認して「再試行」を押してください。続きから再開します。` })
    } finally {
      this.running = false
    }
  }

  private async hasFreeSpace(): Promise<boolean> {
    const { modelDir, requiredFreeBytes = REQUIRED_FREE_BYTES } = this.options
    await mkdir(modelDir, { recursive: true })
    const fs = await statfs(modelDir)
    return fs.bavail * fs.bsize >= requiredFreeBytes
  }

  private async download(): Promise<void> {
    const { models, modelDir, isReady, fetchFn } = this.options
    this.set({ phase: 'running', step: '準備を始めています' })
    if (!(await this.hasFreeSpace())) {
      this.set({ phase: 'failed', error: `ディスクの空きが足りません。モデルの取得に約${Math.round((this.options.requiredFreeBytes ?? REQUIRED_FREE_BYTES) / 1024 ** 3)}GB 必要です。空きを作って「再試行」を押してください。` })
      return
    }
    const pending = models.filter((m) => !existsSync(join(modelDir, m.file)))
    for (const [i, spec] of pending.entries()) {
      const step = `(${i + 1}/${pending.length}) ${spec.label}を取得しています`
      this.set({ phase: 'running', step })
      let last = 0
      await downloadFile(spec.url, join(modelDir, spec.file), fetchFn, (done, total) => {
        const now = Date.now()
        if (now - last < PROGRESS_INTERVAL_MS) return
        last = now
        if (this.state.phase !== 'running') return
        this.set(total
          ? { phase: 'running', step, detail: `${formatMb(done)} / ${formatMb(total)}`, progress: done / total }
          : { phase: 'running', step, detail: `${formatMb(done)} 取得済み` })
      })
    }
    if (!isReady()) {
      this.set({ phase: 'failed', error: '必要なファイルが揃いませんでした。' })
      return
    }
    this.set({ phase: 'ready' })
  }
}
