import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

// stable-diffusion.cpp(Metal)の環境。実行ファイルとモデルを同じ場所に置く。
export const DEFAULT_SD_ROOT = join(homedir(), 'Library/Application Support/stampMaker/sdcpp')

// パッケージ版は同梱のsdcppを使う(開発時は存在しないので既定の場所になる)
function bundledRoot(): string | undefined {
  const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  if (!resources) return undefined
  const root = join(resources, 'sdcpp')
  return existsSync(join(root, 'bin/sd-cli')) ? root : undefined
}

export const SD_ROOT = process.env['STAMP_SD_ROOT'] ?? bundledRoot() ?? DEFAULT_SD_ROOT
export const SD_STEPS = 4
export const SD_SIZE = 512
const SD_CFG_SCALE = '1.0'
const TIMEOUT_MS = 10 * 60 * 1000
const MAX_BUFFER = 64 * 1024 * 1024

export const SD_BIN = join(SD_ROOT, 'bin/sd-cli')
const MODEL_DIR = join(SD_ROOT, 'models')
// 検証済みの構成(FLUX.2 klein 4B Q8_0 + Qwen3 4B Q8_0)
export const SD_MODEL_FILES = {
  diffusion: join(MODEL_DIR, 'flux-2-klein-4b-Q8_0.gguf'),
  llm: join(MODEL_DIR, 'Qwen3-4B-Q8_0.gguf'),
  vae: join(MODEL_DIR, 'flux2-vae.safetensors')
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
    throw new Error(`画像生成の環境が見つかりません(${SD_ROOT})。scripts/setup-sdcpp.sh でセットアップしてください`)
  }
  await run(SD_BIN, buildSdArgs(req), { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER })
}
