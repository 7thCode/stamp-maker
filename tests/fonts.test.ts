import { describe, expect, it } from 'vitest'
import { FONT_CHOICES, fontOptions } from '../src/shared/fonts'

describe('fontOptions', () => {
  it('使える書体だけを一覧にする', () => {
    const list = fontOptions((f) => f === 'YuGothic' || f === 'Osaka', 'YuGothic')
    expect(list.map((f) => f.family)).toEqual(['YuGothic', 'Osaka'])
  })
  it('現在の書体が使えなければ、先頭に残して注記する', () => {
    const list = fontOptions((f) => f === 'Osaka', 'YuMincho')
    expect(list[0]).toEqual({ family: 'YuMincho', label: '游明朝(この環境に無い)' })
    expect(list.map((f) => f.family)).toContain('Osaka')
  })
  it('一覧に無い書体名でも選択を保つ', () => {
    const list = fontOptions(() => true, 'Custom Font')
    expect(list[0]).toEqual({ family: 'Custom Font', label: 'Custom Font' })
    expect(list).toHaveLength(FONT_CHOICES.length + 1)
  })
  it('既定の書体は一覧に含まれる', () => {
    expect(FONT_CHOICES.map((f) => f.family)).toContain('Hiragino Maru Gothic ProN')
  })
})
