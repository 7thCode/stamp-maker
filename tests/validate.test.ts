import { describe, expect, it } from 'vitest'
import { lineTextWeight, marginWarning, validateImage, validateSalesInfo, validateSetSize } from '../src/shared/validate'

const okSales = { title: 'ねこ', description: 'かわいい', creatorName: 'oda', copyright: 'oda 2026' }

describe('lineTextWeight', () => {
  it('全角を2文字、半角を1文字と数える', () => {
    expect(lineTextWeight('あa')).toBe(3)
    expect(lineTextWeight('')).toBe(0)
  })
})

describe('validateSalesInfo', () => {
  it('正常値はエラーなし', () => {
    expect(validateSalesInfo(okSales)).toEqual([])
  })
  it('タイトルは全角20文字(重み40)を超えるとエラー', () => {
    expect(validateSalesInfo({ ...okSales, title: 'あ'.repeat(20) })).toEqual([])
    expect(validateSalesInfo({ ...okSales, title: 'あ'.repeat(21) })).toHaveLength(1)
  })
  it('空欄はエラー', () => {
    expect(validateSalesInfo({ ...okSales, description: ' ' })).toHaveLength(1)
  })
  it('絵文字はエラー', () => {
    expect(validateSalesInfo({ ...okSales, title: 'ねこ😀' }).some((i) => i.message.includes('絵文字'))).toBe(true)
  })
  it('コピーライトに全角はエラー', () => {
    expect(validateSalesInfo({ ...okSales, copyright: '小田' }).some((i) => i.message.includes('英数字'))).toBe(true)
  })
})

const goodSticker = { width: 370, height: 320, bytes: 1000, hasAlpha: true, dpi: 72, format: 'png' }

describe('validateImage', () => {
  it('適合画像はエラーなし', () => {
    expect(validateImage('s1', goodSticker, 'sticker')).toEqual([])
  })
  it('寸法超過・奇数・容量・透過なしを検出', () => {
    const issues = validateImage('s1', { ...goodSticker, width: 371, bytes: 2_000_000, hasAlpha: false }, 'sticker')
    expect(issues.length).toBeGreaterThanOrEqual(4)
  })
  it('メイン画像は240x240固定', () => {
    expect(validateImage('main', { ...goodSticker, width: 240, height: 240 }, 'main')).toEqual([])
    expect(validateImage('main', { ...goodSticker, width: 200, height: 200 }, 'main')).toHaveLength(1)
  })
  it('タブ画像は96x74固定', () => {
    expect(validateImage('tab', { ...goodSticker, width: 96, height: 74 }, 'tab')).toEqual([])
  })
})

describe('validateSetSize', () => {
  it.each([8, 16, 24, 32, 40])('%d枚は許容', (n) => expect(validateSetSize(n)).toEqual([]))
  it.each([0, 7, 41])('%d枚はエラー', (n) => expect(validateSetSize(n)).toHaveLength(1))
})

describe('marginWarning', () => {
  it('余白不足は警告(エラーではない)', () => {
    const w = marginWarning('s1', { left: 2, top: 20, right: 300, bottom: 300 }, 370, 320)
    expect(w[0].level).toBe('warning')
  })
  it('十分な余白なら空', () => {
    expect(marginWarning('s1', { left: 12, top: 12, right: 350, bottom: 300 }, 370, 320)).toEqual([])
  })
})
