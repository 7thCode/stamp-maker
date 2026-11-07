import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { getGenerator } from '../src/main/generators'

const MFLUX_BIN = '/Volumes/stampmaker/venv/bin/mflux-generate-flux2-edit'
const REFERENCE = '/Users/oda/Desktop/IMG_4815.PNG'
const ready = existsSync(MFLUX_BIN) && existsSync(REFERENCE)
const GENERATE_TIMEOUT_MS = 180_000

// 実機のmflux環境と参考画像がある場合のみ実行する統合テスト
describe.skipIf(!ready)('flux2-klein-4b-local(統合)', () => {
  it('参考画像から文字なし・背景透過のPNGを生成する', async () => {
    const out = await getGenerator('flux2-klein-4b-local').generate({
      referenceImages: [readFileSync(REFERENCE)],
      characterTraits: 'a solid black silhouette body, two round white eyes on stalks, eight black curly tentacles',
      expression: 'crying with tears',
      pose: ''
    })
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(512)
    expect(data[3]).toBe(0) // 角(背景)が透明
    const opaque = Array.from({ length: info.width * info.height }, (_, i) => data[i * 4 + 3]).filter((a) => a > 128).length
    expect(opaque).toBeGreaterThan(1000) // キャラクターが残っている
  }, GENERATE_TIMEOUT_MS)
})
