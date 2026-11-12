import { spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import type { SdSetupState } from '../shared/api'

// Finder から起動したアプリの PATH は最小限で、Homebrew の cmake が見えないため補う
const EXTRA_PATHS = ['/opt/homebrew/bin', '/usr/local/bin']
// sd-cli のビルドに必要な道具と、無いときの入れ方
const REQUIRED_TOOLS: ReadonlyArray<{ name: string; install: string }> = [
  { name: 'git', install: 'ターミナルで xcode-select --install を実行' },
  { name: 'cmake', install: 'ターミナルで brew install cmake を実行(Homebrew が必要)' }
]
const STEP_RE = /^STEP (\d+)\/(\d+) (.+)$/
const LOG_TAIL_LINES = 8
const PROGRESS_POLL_MS = 1000
const BYTES_PER_MB = 1024 * 1024

export function setupEnv(base: NodeJS.ProcessEnv, extraPaths: readonly string[] = EXTRA_PATHS): NodeJS.ProcessEnv {
  const current = (base['PATH'] ?? '').split(delimiter).filter(Boolean)
  const merged = [...current, ...extraPaths.filter((p) => !current.includes(p))]
  return { ...base, PATH: merged.join(delimiter) }
}

function hasExecutable(name: string, env: NodeJS.ProcessEnv): boolean {
  return (env['PATH'] ?? '').split(delimiter).filter(Boolean).some((dir) => {
    try { accessSync(join(dir, name), constants.X_OK); return true } catch { return false }
  })
}

// 無い道具について、入れ方つきの説明を返す(空なら揃っている)
export function missingToolHints(env: NodeJS.ProcessEnv): string[] {
  return REQUIRED_TOOLS.filter((t) => !hasExecutable(t.name, env)).map((t) => `${t.name} が見つかりません。${t.install}`)
}

export function parseStep(line: string): { index: number; total: number; label: string } | null {
  const m = STEP_RE.exec(line.trim())
  return m ? { index: Number(m[1]), total: Number(m[2]), label: m[3] } : null
}

// 取得中の .part ファイルの合計をMBで返す(無ければ null)
async function partialDownloadMb(modelsDir: string): Promise<number | null> {
  try {
    const parts = (await readdir(modelsDir)).filter((n) => n.endsWith('.part'))
    if (parts.length === 0) return null
    const sizes = await Promise.all(parts.map(async (n) => (await stat(join(modelsDir, n))).size))
    return Math.round(sizes.reduce((a, b) => a + b, 0) / BYTES_PER_MB)
  } catch {
    return null
  }
}

export interface SdSetupOptions {
  script: string
  root: string
  env: NodeJS.ProcessEnv
  // 環境が揃っているか(sd-cli とモデルの有無)
  isReady: () => boolean
  // PATH に補う場所(省略すると Homebrew の既定の場所)
  extraPaths?: readonly string[]
}

// sd-cli とモデルが無いときに、セットアップのスクリプトを実行して用意する
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

  // 環境が無ければ実行する。実行中・用意済みなら何もしない。終了(成功・失敗)まで待つ
  async start(): Promise<void> {
    if (this.running || this.options.isReady()) {
      if (this.options.isReady()) this.set({ phase: 'ready' })
      return
    }
    const env = setupEnv(this.options.env, this.options.extraPaths)
    const hints = missingToolHints(env)
    if (hints.length > 0) {
      this.set({ phase: 'failed', error: `画像生成の準備に必要な道具が足りません。\n${hints.join('\n')}\n用意したあと「再試行」を押してください。` })
      return
    }
    this.running = true
    this.set({ phase: 'running', step: '準備を始めています' })
    try {
      await this.execute(env)
    } finally {
      this.running = false
    }
  }

  private execute(env: NodeJS.ProcessEnv): Promise<void> {
    const { script, root, isReady } = this.options
    return new Promise((resolve) => {
      const tail: string[] = []
      let step = '準備を始めています'
      let total = ''
      const publish = (detail?: string): void => this.set({ phase: 'running', step: `${total}${step}`, detail })
      const onLine = (line: string): void => {
        const text = line.trim()
        if (!text) return
        const parsed = parseStep(text)
        if (parsed) {
          step = parsed.label
          total = `(${parsed.index}/${parsed.total}) `
          publish()
          return
        }
        tail.push(text)
        if (tail.length > LOG_TAIL_LINES) tail.shift()
      }
      const poll = setInterval(() => {
        void partialDownloadMb(join(root, 'models')).then((mb) => {
          if (this.state.phase === 'running') publish(mb === null ? undefined : `${mb} MB 取得済み`)
        })
      }, PROGRESS_POLL_MS)
      const finish = (state: SdSetupState): void => {
        clearInterval(poll)
        this.set(state)
        resolve()
      }

      const child = spawn('/bin/bash', [script], { env: { ...env, STAMP_SD_ROOT: root } })
      let buffered = ''
      const feed = (chunk: Buffer): void => {
        const parts = (buffered + chunk.toString()).split(/[\r\n]+/)
        buffered = parts.pop() ?? ''
        parts.forEach(onLine)
      }
      child.stdout.on('data', feed)
      child.stderr.on('data', feed)
      child.on('error', (err) => finish({ phase: 'failed', error: `セットアップを開始できませんでした: ${err.message}` }))
      child.on('close', (code) => {
        onLine(buffered)
        if (code === 0 && isReady()) return finish({ phase: 'ready' })
        const reason = code === 0 ? '必要なファイルが揃いませんでした' : `終了コード ${code}`
        finish({ phase: 'failed', error: `セットアップに失敗しました(${reason})。\n${tail.join('\n')}` })
      })
    })
  }
}
