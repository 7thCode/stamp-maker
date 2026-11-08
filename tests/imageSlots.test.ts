import { describe, expect, it } from 'vitest'
import {
  MAIN_IMAGE_ID, TAB_IMAGE_ID, adoptedSlotImage, findSlot, imageSlots, newProject, updateSlot, withProjectDefaults
} from '../src/shared/project'
import type { Project } from '../src/shared/types'

let seq = 0
const makeProject = (): Project => newProject('p1', 'テスト', '2026-11-08T00:00:00Z', () => `s${++seq}`)

describe('メイン画像・タブ画像の枠', () => {
  it('新規プロジェクトにはメイン画像とタブ画像の枠がある', () => {
    const p = makeProject()
    expect(p.mainImage.id).toBe(MAIN_IMAGE_ID)
    expect(p.tabImage.id).toBe(TAB_IMAGE_ID)
    expect(p.tabImage.poseEn).toContain('close-up')
  })
  it('全ての枠はスタンプ、メイン、タブの順に並ぶ', () => {
    const p = makeProject()
    const ids = imageSlots(p).map((s) => s.id)
    expect(ids).toHaveLength(p.stickers.length + 2)
    expect(ids.slice(-2)).toEqual([MAIN_IMAGE_ID, TAB_IMAGE_ID])
  })
  it('IDでスタンプにもメイン・タブにも到達できる', () => {
    const p = makeProject()
    expect(findSlot(p, p.stickers[0].id)).toBe(p.stickers[0])
    expect(findSlot(p, TAB_IMAGE_ID)).toBe(p.tabImage)
    expect(findSlot(p, 'none')).toBeUndefined()
  })
  it('updateSlot は対象の枠だけを変え、元を変更しない', () => {
    const p = makeProject()
    const next = updateSlot(p, MAIN_IMAGE_ID, { imagePath: 'images/m.png' })
    expect(next.mainImage.imagePath).toBe('images/m.png')
    expect(next.tabImage).toBe(p.tabImage)
    expect(p.mainImage.imagePath).toBeNull()
    const s = updateSlot(p, p.stickers[1].id, { text: 'やあ' })
    expect(s.stickers[1].text).toBe('やあ')
    expect(s.stickers[0]).toBe(p.stickers[0])
  })
  it('古いプロジェクト(メイン・タブ無し)を読み込むと既定の枠が補われる', () => {
    const { mainImage: _m, tabImage: _t, ...legacy } = makeProject()
    const loaded = withProjectDefaults(legacy as unknown as Project)
    expect(loaded.mainImage.id).toBe(MAIN_IMAGE_ID)
    expect(loaded.tabImage.id).toBe(TAB_IMAGE_ID)
  })
  it('既にある枠は上書きしない', () => {
    const p = updateSlot(makeProject(), TAB_IMAGE_ID, { imagePath: 'images/t.png' })
    expect(withProjectDefaults(p).tabImage.imagePath).toBe('images/t.png')
  })
  it('専用画像は採用済みで画像があるときだけ使う', () => {
    const p = makeProject()
    expect(adoptedSlotImage(p.mainImage)).toBeNull()
    const generated = updateSlot(p, MAIN_IMAGE_ID, { imagePath: 'images/m.png' })
    expect(adoptedSlotImage(generated.mainImage)).toBeNull()
    const adopted = updateSlot(generated, MAIN_IMAGE_ID, { status: 'adopted' })
    expect(adoptedSlotImage(adopted.mainImage)).toBe('images/m.png')
  })
})
