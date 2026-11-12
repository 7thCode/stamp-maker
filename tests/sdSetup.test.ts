import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SdSetupState } from '../src/shared/api'
import { SdSetup, missingToolHints, parseStep, setupEnv } from '../src/main/sdSetup'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sdsetup-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

function writeScript(body: string): string {
  const path = join(dir, 'setup.sh')
  writeFileSync(path, `#!/bin/bash\nset -euo pipefail\n${body}\n`)
  chmodSync(path, 0o755)
  return path
}

// 指定した道具だけが見える PATH(中身は空の実行ファイル)。touch などの基本コマンドは /usr/bin:/bin から使う
function toolsDir(names: string[]): string {
  const bin = join(dir, 'bin')
  mkdirSync(bin, { recursive: true })
  for (const n of names) { writeFileSync(join(bin, n), '#!/bin/sh\n'); chmodSync(join(bin, n), 0o755) }
  return `${bin}:/usr/bin:/bin`
}

describe('setupEnv', () => {
  it('Homebrew の場所を PATH の後ろに足し、重複させない', () => {
    const path = setupEnv({ PATH: '/usr/bin:/opt/homebrew/bin' })['PATH']
    expect(path).toBe('/usr/bin:/opt/homebrew/bin:/usr/local/bin')
  })
  it('PATH が無くても動く', () => {
    expect(setupEnv({})['PATH']).toContain('/opt/homebrew/bin')
  })
})

describe('missingToolHints', () => {
  it('無い道具だけ、入れ方つきで返す', () => {
    const hints = missingToolHints({ PATH: toolsDir(['git']) })
    expect(hints).toHaveLength(1)
    expect(hints[0]).toContain('cmake')
    expect(hints[0]).toContain('brew install cmake')
  })
  it('揃っていれば空', () => {
    expect(missingToolHints({ PATH: toolsDir(['git', 'cmake']) })).toEqual([])
  })
})

describe('parseStep', () => {
  it('STEP 行から手順の番号と説明を取り出す', () => {
    expect(parseStep('STEP 2/4 画像生成モデルを取得しています')).toEqual({ index: 2, total: 4, label: '画像生成モデルを取得しています' })
  })
  it('それ以外の行は null', () => {
    expect(parseStep('cloning...')).toBeNull()
  })
})

describe('SdSetup', () => {
  const make = (script: string, ready: () => boolean, env: NodeJS.ProcessEnv) =>
    // 実機の Homebrew にある cmake を拾わないよう、補う場所は空にする
    new SdSetup({ script, root: join(dir, 'root'), env, isReady: ready, extraPaths: [] })

  it('最初から揃っていれば実行せず ready', async () => {
    const marker = join(dir, 'ran')
    const s = make(writeScript(`touch "${marker}"`), () => true, { PATH: toolsDir(['git', 'cmake']) })
    expect(s.getState().phase).toBe('ready')
    await s.start()
    expect(existsSync(marker)).toBe(false)
  })

  it('スクリプトが成功し、環境が揃えば ready になる。手順の表示が流れる', async () => {
    const flag = join(dir, 'done')
    const script = writeScript(`echo "STEP 1/2 ビルド"\necho "STEP 2/2 取得"\ntouch "${flag}"`)
    const s = make(script, () => existsSync(flag), { PATH: toolsDir(['git', 'cmake']) })
    const seen: SdSetupState[] = []
    s.subscribe((st) => seen.push(st))
    await s.start()
    expect(s.getState()).toEqual({ phase: 'ready' })
    expect(seen.some((st) => st.step === '(1/2) ビルド')).toBe(true)
    expect(seen.some((st) => st.step === '(2/2) 取得')).toBe(true)
  })

  it('スクリプトが失敗したら failed にし、直前の出力を理由に含める', async () => {
    const s = make(writeScript('echo "ダウンロードに失敗"\nexit 7'), () => false, { PATH: toolsDir(['git', 'cmake']) })
    await s.start()
    const st = s.getState()
    expect(st.phase).toBe('failed')
    expect(st.error).toContain('終了コード 7')
    expect(st.error).toContain('ダウンロードに失敗')
  })

  it('終了コード0でも環境が揃わなければ failed', async () => {
    const s = make(writeScript('true'), () => false, { PATH: toolsDir(['git', 'cmake']) })
    await s.start()
    expect(s.getState().phase).toBe('failed')
    expect(s.getState().error).toContain('揃いませんでした')
  })

  it('道具が足りなければスクリプトを走らせず、入れ方を示す', async () => {
    const marker = join(dir, 'ran')
    const s = make(writeScript(`touch "${marker}"`), () => false, { PATH: toolsDir(['git']) })
    await s.start()
    expect(existsSync(marker)).toBe(false)
    expect(s.getState().phase).toBe('failed')
    expect(s.getState().error).toContain('brew install cmake')
  })

  it('実行中の再実行は無視し、失敗後は再試行できる', async () => {
    const counter = join(dir, 'count')
    const flag = join(dir, 'done')
    const script = writeScript(`echo x >> "${counter}"\nsleep 0.3\n[ -f "${dir}/allow" ] && touch "${flag}" || exit 1`)
    const s = make(script, () => existsSync(flag), { PATH: toolsDir(['git', 'cmake']) })
    const first = s.start()
    await s.start() // 実行中なので何もしない
    await first
    expect(s.getState().phase).toBe('failed')
    writeFileSync(join(dir, 'allow'), '')
    await s.start()
    expect(s.getState().phase).toBe('ready')
  })

  it('環境変数 STAMP_SD_ROOT でスクリプトに配置先を渡す', async () => {
    const root = join(dir, 'root')
    const script = writeScript(`mkdir -p "$STAMP_SD_ROOT" && touch "$STAMP_SD_ROOT/ok"`)
    const s = make(script, () => existsSync(join(root, 'ok')), { PATH: toolsDir(['git', 'cmake']) })
    await s.start()
    expect(s.getState().phase).toBe('ready')
  })
})
