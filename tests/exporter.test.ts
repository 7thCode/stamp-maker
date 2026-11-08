import sharp from 'sharp'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildExport } from '../src/main/exporter'

const sales = { title: 'ねこ', description: 'かわいい', creatorName: 'oda', copyright: 'oda 2026' }

async function sticker() {
  // 透明な周囲に不透明な中央部を持つ画像
  return sharp({ create: { width: 370, height: 320, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: { create: { width: 200, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }, left: 85, top: 60 }])
    .png().toBuffer()
}

describe('buildExport', () => {
  it('8枚そろい規格に適合すればZIPとファイル一式を返す', async () => {
    const png = await sticker()
    const res = await buildExport({
      stickers: Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, png })),
      main: png, tab: png, sales
    })
    expect(res.issues.filter((i) => i.level === 'error')).toEqual([])
    expect(res.files).not.toBeNull()
    const names = Object.keys(unzipSync(new Uint8Array(res.zip as Buffer))).sort()
    expect(names).toEqual(['01.png','02.png','03.png','04.png','05.png','06.png','07.png','08.png','main.png','tab.png'])
  })
  it('枚数不足は画像出力せずエラーを返す', async () => {
    const png = await sticker()
    const res = await buildExport({ stickers: [{ id: 's0', png }], main: png, tab: png, sales })
    expect(res.files).toBeNull()
    expect(res.issues.some((i) => i.target === 'set')).toBe(true)
  })
  it('余白不足は警告のみで出力できる', async () => {
    const full = await sharp({ create: { width: 370, height: 320, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()
    const res = await buildExport({
      stickers: Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, png: full })),
      main: full, tab: full, sales
    })
    expect(res.files).not.toBeNull()
    expect(res.issues.some((i) => i.level === 'warning')).toBe(true)
  })
})
