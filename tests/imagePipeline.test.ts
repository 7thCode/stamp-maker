import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { finalizeImage, inspectImage, opaqueBounds, removeBackground } from '../src/main/imagePipeline'
import { validateImage } from '../src/shared/validate'

async function solid(w: number, h: number, color: { r: number; g: number; b: number; alpha: number }) {
  return sharp({ create: { width: w, height: h, channels: 4, background: color } }).png().toBuffer()
}

describe('finalizeImage', () => {
  it('大きい画像を370x320以内・偶数・72dpiのPNGにする', async () => {
    const out = await finalizeImage(await solid(1000, 900, { r: 255, g: 0, b: 0, alpha: 1 }), 'sticker')
    const info = await inspectImage(out)
    expect(info.width).toBeLessThanOrEqual(370)
    expect(info.height).toBeLessThanOrEqual(320)
    expect(validateImage('s', info, 'sticker')).toEqual([])
  })
  it('奇数サイズの小さな画像も偶数化する', async () => {
    const info = await inspectImage(await finalizeImage(await solid(101, 51, { r: 0, g: 0, b: 0, alpha: 1 }), 'sticker'))
    expect(info.width % 2).toBe(0)
    expect(info.height % 2).toBe(0)
  })
  it('メイン/タブ画像は固定寸法', async () => {
    const src = await solid(370, 320, { r: 0, g: 0, b: 255, alpha: 1 })
    const main = await inspectImage(await finalizeImage(src, 'main'))
    const tab = await inspectImage(await finalizeImage(src, 'tab'))
    expect([main.width, main.height]).toEqual([240, 240])
    expect([tab.width, tab.height]).toEqual([96, 74])
    expect(validateImage('main', main, 'main')).toEqual([])
    expect(validateImage('tab', tab, 'tab')).toEqual([])
  })
})

describe('removeBackground', () => {
  it('外周から連結した単色背景だけを透明にし、内部の同色は保持する', async () => {
    // 白背景(20x20)の中央に赤い枠(中は白)
    const w = 20
    const raw = Buffer.alloc(w * w * 4, 255)
    const set = (x: number, y: number, r: number, g: number, b: number) => {
      const i = (y * w + x) * 4
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = 255
    }
    for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) {
      const edge = x === 5 || x === 14 || y === 5 || y === 14
      if (edge) set(x, y, 255, 0, 0)
    }
    const png = await sharp(raw, { raw: { width: w, height: w, channels: 4 } }).png().toBuffer()
    const out = await removeBackground(png)
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    expect(data[3]).toBe(0) // 角は透明
    expect(data[(10 * w + 10) * 4 + 3]).toBe(255) // 枠の内側の白は残る
    expect(data[(5 * w + 5) * 4 + 3]).toBe(255) // 枠は残る
  })
})

describe('opaqueBounds', () => {
  it('不透明部分の外接矩形を返す', async () => {
    const png = await solid(10, 10, { r: 0, g: 0, b: 0, alpha: 0 })
    expect(await opaqueBounds(png)).toBeNull()
    const opaque = await solid(10, 10, { r: 0, g: 0, b: 0, alpha: 1 })
    expect(await opaqueBounds(opaque)).toEqual({ left: 0, top: 0, right: 10, bottom: 10 })
  })
})

describe('finalizeImage(メイン画像・タブ画像)', () => {
  // 透明な余白の中央に、不透明な赤い四角がある画像
  async function subjectInMargin(): Promise<Buffer> {
    const subject = await solid(200, 200, { r: 255, g: 0, b: 0, alpha: 1 })
    return sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: subject, left: 156, top: 156 }]).png().toBuffer()
  }

  it('メイン画像は240x240になり、規格の検証を通る', async () => {
    const out = await finalizeImage(await subjectInMargin(), 'main')
    const info = await inspectImage(out)
    expect([info.width, info.height]).toEqual([240, 240])
    expect(validateImage('main', info, 'main')).toEqual([])
  })
  it('タブ画像は96x74になり、規格の検証を通る', async () => {
    const out = await finalizeImage(await subjectInMargin(), 'tab')
    const info = await inspectImage(out)
    expect([info.width, info.height]).toEqual([96, 74])
    expect(validateImage('tab', info, 'tab')).toEqual([])
  })
  it('透明な余白を詰めて、被写体を枠いっぱいに(外枠の余白は約4px)収める', async () => {
    const out = await finalizeImage(await subjectInMargin(), 'main')
    const b = await opaqueBounds(out)
    expect(b).not.toBeNull()
    expect(b?.left).toBeGreaterThanOrEqual(3)
    expect(b?.left).toBeLessThanOrEqual(5)
    expect(b?.right).toBeGreaterThanOrEqual(235)
    expect(b?.top).toBeLessThanOrEqual(5)
  })
  it('縦横比の違う枠(タブ)では、被写体を歪めず中央に収める', async () => {
    const b = await opaqueBounds(await finalizeImage(await subjectInMargin(), 'tab'))
    expect(b).not.toBeNull()
    const w = (b?.right ?? 0) - (b?.left ?? 0)
    const h = (b?.bottom ?? 0) - (b?.top ?? 0)
    expect(Math.abs(w - h)).toBeLessThanOrEqual(1)
    expect(h).toBeGreaterThanOrEqual(64)
  })
  it('完全に透明な画像でも失敗しない', async () => {
    const out = await finalizeImage(await solid(100, 100, { r: 0, g: 0, b: 0, alpha: 0 }), 'tab')
    expect((await inspectImage(out)).width).toBe(96)
  })
})
