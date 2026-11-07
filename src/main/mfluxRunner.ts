import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

// mflux(MLX)の環境。モデルも同じ場所(HF_HOME)に置く。
export const DEFAULT_MFLUX_ROOT = join(homedir(), 'Library/Application Support/stampMaker/mflux')
export const MFLUX_ROOT = process.env['STAMP_MFLUX_ROOT'] ?? DEFAULT_MFLUX_ROOT
export const KLEIN_MODEL = 'flux2-klein-4b'
export const KLEIN_STEPS = 4
export const KLEIN_SIZE = 512
const TIMEOUT_MS = 10 * 60 * 1000
const MAX_BUFFER = 64 * 1024 * 1024

// mfluxのコマンドを実行する。環境が無い場合は利用者向けのエラーにする。
export async function runMflux(command: string, args: readonly string[]): Promise<void> {
  const bin = join(MFLUX_ROOT, 'venv/bin', command)
  if (!existsSync(bin)) {
    throw new Error(`mfluxが見つかりません(${MFLUX_ROOT})。mflux環境のセットアップを確認してください`)
  }
  try {
    await run(bin, [...args], {
      env: { ...process.env, HF_HOME: join(MFLUX_ROOT, 'hf') },
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER
    })
  } catch (err) {
    const output = String((err as { stdout?: string; stderr?: string }).stdout ?? '') +
      String((err as { stderr?: string }).stderr ?? '')
    if (/Battery below/i.test(output)) {
      throw new Error('バッテリー残量が少ないため生成できません。電源に接続してください')
    }
    throw err
  }
}
