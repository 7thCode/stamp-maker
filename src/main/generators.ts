import { randomInt, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildKleinPrompt } from './fluxPrompt'
import { removeBackground } from './imagePipeline'
import { runSd } from './sdRunner'

const SEED_RANGE = 1_000_000

// 参考画像が複数ある場合は、生成のたびにランダムで1枚だけ使う
export function pickRandomReference<T>(images: readonly T[], random: (max: number) => number = randomInt): T[] {
  if (images.length === 0) return []
  return [images[random(images.length)]]
}

// 画像生成バックエンドの差し替え口。
// ローカル(M4)/クラウドの方式は先行検証後に確定するため、ここにプロバイダを追加する。
export interface GenerateRequest {
  referenceImages: Buffer[]
  characterTraits: string
  expression: string
  pose: string
}

export interface ImageGenerator {
  id: string
  label: string
  // 文字なしのキャラクター画像(PNG/JPEG)を返す
  generate(req: GenerateRequest): Promise<Buffer>
}

// 動作確認用: 先頭の参考画像をそのまま返す。表情・ポーズは変わらない。
const passthrough: ImageGenerator = {
  id: 'passthrough',
  label: '参考画像をそのまま使用(表情・ポーズは変化しません)',
  async generate(req) {
    const first = req.referenceImages[0]
    if (!first) throw new Error('参考画像が取り込まれていません')
    return first
  }
}

// stable-diffusion.cpp(Metal)で FLUX.2 klein 4B をローカル実行する。素材は外部送信しない。
// 検証: M4相当で約27秒/枚、ピークメモリ約10GB。
const kleinLocal: ImageGenerator = {
  id: 'flux2-klein-4b-local',
  label: 'FLUX.2 klein 4B(ローカル・stable-diffusion.cpp)',
  async generate(req) {
    if (req.referenceImages.length === 0) throw new Error('参考画像が取り込まれていません')

    const dir = await mkdtemp(join(tmpdir(), 'stamp-gen-'))
    try {
      const refPaths = await Promise.all(
        req.referenceImages.map(async (buf, i) => {
          const p = join(dir, `ref${i}-${randomUUID()}.png`)
          await writeFile(p, buf)
          return p
        })
      )
      const out = join(dir, 'out.png')
      await runSd({
        prompt: buildKleinPrompt({
          keepTraits: req.characterTraits, expression: req.expression, pose: req.pose
        }),
        seed: randomInt(SEED_RANGE),
        output: out,
        referenceImages: refPaths
      })
      // 白一色の背景を透過にして返す
      return await removeBackground(await readFile(out))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
}

const registry = new Map<string, ImageGenerator>([
  [kleinLocal.id, kleinLocal],
  [passthrough.id, passthrough]
])

export function listGenerators(): Array<{ id: string; label: string }> {
  return [...registry.values()].map(({ id, label }) => ({ id, label }))
}

export function getGenerator(id: string): ImageGenerator {
  const g = registry.get(id)
  if (!g) throw new Error(`未知の生成方式です: ${id}`)
  return g
}
