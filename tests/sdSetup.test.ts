import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SdSetupState } from '../src/shared/api'
import type { FetchFn, ModelSpec } from '../src/main/sdModels'
import { SdSetup, formatMb } from '../src/main/sdSetup'
import { startFixture, type Fixture } from './helpers/httpFixture'

const realFetch: FetchFn = (url, init) => fetch(url, init)

let dir: string
let modelDir: string
let binPath: string
let server: Fixture
let models: ModelSpec[]

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sdsetup-'))
  modelDir = join(dir, 'models')
  binPath = join(dir, 'bin-sd-cli')
  writeFileSync(binPath, '')
  server = await startFixture({ '/a': Buffer.alloc(100_000, 1), '/b': Buffer.alloc(80_000, 2) })
  models = [
    { file: 'a.gguf', label: 'モデルA', url: `${server.baseUrl}/a` },
    { file: 'b.gguf', label: 'モデルB', url: `${server.baseUrl}/b` }
  ]
})
afterEach(async () => {
  await server.close()
  rmSync(dir, { recursive: true, force: true })
})

const make = (extra: Partial<ConstructorParameters<typeof SdSetup>[0]> = {}, fetchFn: FetchFn = realFetch) =>
  new SdSetup({
    models,
    modelDir,
    binPath,
    isReady: () => existsSync(binPath) && models.every((m) => existsSync(join(modelDir, m.file))),
    fetchFn,
    requiredFreeBytes: 1,
    ...extra
  })

describe('formatMb', () => {
  it('MB に丸め、3桁区切りにする', () => {
    expect(formatMb(4_300_629_440)).toBe('4,101 MB')
  })
})

describe('SdSetup', () => {
  it('最初から揃っていれば通信しない', async () => {
    mkdirSync(modelDir, { recursive: true })
    for (const m of models) writeFileSync(join(modelDir, m.file), 'x')
    const s = make()
    expect(s.getState().phase).toBe('ready')
    await s.start()
    expect(server.ranges).toHaveLength(0)
  })

  it('モデルを順に取得して ready になる。手順と進み具合が流れる', async () => {
    const s = make()
    const seen: SdSetupState[] = []
    s.subscribe((st) => seen.push(st))
    await s.start()
    expect(s.getState()).toEqual({ phase: 'ready' })
    expect(seen.some((st) => st.step === '(1/2) モデルAを取得しています' && st.progress !== undefined && st.detail?.includes('MB'))).toBe(true)
    expect(seen.some((st) => st.step === '(2/2) モデルBを取得しています')).toBe(true)
  })

  it('取得済みのモデルは取り直さない', async () => {
    mkdirSync(modelDir, { recursive: true })
    writeFileSync(join(modelDir, 'a.gguf'), 'x')
    const s = make()
    await s.start()
    expect(s.getState().phase).toBe('ready')
    expect(server.ranges).toHaveLength(1)
  })

  it('sd-cli が無ければ、通信せず理由を示す', async () => {
    rmSync(binPath)
    const s = make()
    await s.start()
    expect(s.getState().phase).toBe('failed')
    expect(s.getState().error).toContain('sd-cli')
    expect(server.ranges).toHaveLength(0)
  })

  it('空きが足りなければ、通信せず理由を示す', async () => {
    const s = make({ requiredFreeBytes: Number.MAX_SAFE_INTEGER })
    await s.start()
    expect(s.getState().phase).toBe('failed')
    expect(s.getState().error).toContain('空きが足りません')
    expect(server.ranges).toHaveLength(0)
  })

  it('失敗したら理由と再試行の案内を出し、再試行で続きから取得して ready になる', async () => {
    server.behavior = 'serverError'
    const s = make()
    await s.start()
    expect(s.getState().phase).toBe('failed')
    expect(s.getState().error).toContain('HTTP 500')
    expect(s.getState().error).toContain('再試行')
    server.behavior = 'normal'
    await s.start()
    expect(s.getState().phase).toBe('ready')
  })

  it('途中で切れたあとの再試行は、続きから(Range 付きで)取得する', async () => {
    server.behavior = 'truncate'
    const s = make()
    await s.start()
    expect(s.getState().phase).toBe('failed')
    server.behavior = 'normal'
    await s.start()
    expect(s.getState().phase).toBe('ready')
    expect(server.ranges.some((r) => r?.startsWith('bytes='))).toBe(true)
  })

  it('実行中の再実行は無視する', async () => {
    const s = make()
    const first = s.start()
    await s.start()
    await first
    expect(s.getState().phase).toBe('ready')
    expect(server.ranges).toHaveLength(2)
  })
})
