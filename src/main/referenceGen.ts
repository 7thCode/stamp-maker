import { randomInt } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KLEIN_MODEL, KLEIN_SIZE, KLEIN_STEPS, runMflux } from './mfluxRunner'

const SEED_RANGE = 1_000_000

// 「sticker」と書くと白い縁取りが付くため使わない(検証結果)
export function buildReferencePrompt(description: string): string {
  return `${description.trim()}. Single character, facing front, centered, simple flat 2D illustration, ` +
    'solid pure white background, no text, no shadow.'
}

// 説明文から参考画像の候補を1枚生成する(PNG)
export async function generateReferenceCandidate(description: string): Promise<Buffer> {
  if (!description.trim()) throw new Error('キャラクターの説明を入力してください')
  const dir = await mkdtemp(join(tmpdir(), 'stamp-ref-'))
  try {
    const out = join(dir, 'out.png')
    await runMflux('mflux-generate-flux2', [
      '--model', KLEIN_MODEL,
      '--prompt', buildReferencePrompt(description),
      '--steps', String(KLEIN_STEPS),
      '--seed', String(randomInt(SEED_RANGE)),
      '--width', String(KLEIN_SIZE), '--height', String(KLEIN_SIZE),
      '--output', out
    ])
    return await readFile(out)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
