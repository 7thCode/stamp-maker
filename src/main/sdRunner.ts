import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

// stable-diffusion.cpp(Metal)の環境。sd-cli とモデルは別の場所に置ける。
export const DEFAULT_SD_ROOT = join(homedir(), 'Library/Application Support/stampMaker/sdcpp')
export const SD_MODEL_NAMES = {
  diffusion: 'flux-2-klein-4b-Q8_0.gguf',
  llm: 'Qwen3-4B-Q8_0.gguf',
  vae: 'flux2-vae.safetensors'
} as const

// パッケージ版に同梱した sdcpp(開発時は存在しない)
function bundledRoot(): string | undefined {
  const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  if (!resources) return undefined
  const root = join(resources, 'sdcpp')
  return existsSync(join(root, 'bin/sd-cli')) ? root : undefined
}

// sd-cli とモデルの置き場所を決める。
// - STAMP_SD_ROOT があれば、その下の bin/ と models/
// - sd-cli を同梱した配布版は、sd-cli を同梱の bin/ から使う。モデルは、同梱していればそこから、無ければ利用者の領域へ初回起動時にダウンロードする
// - どちらでもなければ(開発時)、既定の場所の bin/ と models/
function resolveRoots(): { bin: string; models: string } {
  const env = process.env['STAMP_SD_ROOT']
  if (env) return { bin: join(env, 'bin'), models: join(env, 'models') }
  const bundled = bundledRoot()
  if (!bundled) return { bin: join(DEFAULT_SD_ROOT, 'bin'), models: join(DEFAULT_SD_ROOT, 'models') }
  const hasBundledModels = existsSync(join(bundled, 'models', SD_MODEL_NAMES.diffusion))
  return { bin: join(bundled, 'bin'), models: hasBundledModels ? join(bundled, 'models') : join(DEFAULT_SD_ROOT, 'models') }
}

const ROOTS = resolveRoots()
export const SD_STEPS = 4
export const SD_SIZE = 512
const SD_CFG_SCALE = '1.0'
const TIMEOUT_MS = 10 * 60 * 1000
const MAX_BUFFER = 64 * 1024 * 1024

export const SD_BIN = join(ROOTS.bin, 'sd-cli')
export const SD_MODEL_DIR = ROOTS.models
// 検証済みの構成(FLUX.2 klein 4B Q8_0 + Qwen3 4B Q8_0)
export const SD_MODEL_FILES = {
  diffusion: join(SD_MODEL_DIR, SD_MODEL_NAMES.diffusion),
  llm: join(SD_MODEL_DIR, SD_MODEL_NAMES.llm),
  vae: join(SD_MODEL_DIR, SD_MODEL_NAMES.vae)
} as const

export interface SdRequest {
  prompt: string
  seed: number
  output: string
  // 指定した場合は参考画像からの編集になる
  referenceImages?: readonly string[]
}

// 実行に必要なファイルのうち、無いものを返す(空なら使用可能)
export function missingSdFiles(): string[] {
  return [SD_BIN, ...Object.values(SD_MODEL_FILES)].filter((p) => !existsSync(p))
}

// sd-cliの引数を組み立てる(参考画像があれば -r を画像ごとに付ける)
export function buildSdArgs(req: SdRequest): string[] {
  const refs = (req.referenceImages ?? []).flatMap((p) => ['-r', p])
  return [
    '--diffusion-model', SD_MODEL_FILES.diffusion,
    '--vae', SD_MODEL_FILES.vae,
    '--llm', SD_MODEL_FILES.llm,
    ...refs,
    '-p', req.prompt,
    '--cfg-scale', SD_CFG_SCALE,
    '--sampling-method', 'euler',
    '--steps', String(SD_STEPS),
    '-W', String(SD_SIZE), '-H', String(SD_SIZE),
    '-s', String(req.seed),
    '-o', req.output
  ]
}

// sd-cliで1枚生成する。環境が無い場合は利用者向けのエラーにする。
export async function runSd(req: SdRequest): Promise<void> {
  if (missingSdFiles().length > 0) {
    throw new Error(`画像生成の環境がまだ用意できていません(${SD_MODEL_DIR})。画面上部に出ている準備が終わってから、もう一度お試しください。失敗している場合は「再試行」を押してください`)
  }
  await run(SD_BIN, buildSdArgs(req), { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER })
}
