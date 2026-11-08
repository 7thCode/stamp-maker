import type { Project, Sticker, TextStyle } from './types'

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Hiragino Maru Gothic ProN',
  fontSize: 44,
  color: '#ffffff',
  strokeColor: '#333333',
  strokeWidth: 8,
  x: 0.5,
  y: 0.85
}

export function newSticker(id: string, overrides: Partial<Sticker> = {}): Sticker {
  return {
    id,
    text: '',
    expression: '',
    pose: '',
    expressionEn: '',
    poseEn: '',
    imagePath: null,
    status: 'unchecked',
    job: 'idle',
    textStyle: { ...DEFAULT_TEXT_STYLE },
    ...overrides
  }
}

export const MAIN_IMAGE_ID = 'main'
export const TAB_IMAGE_ID = 'tab'

// メイン画像は愛想のよい上半身、タブ画像は小さくても分かる顔のアップを既定にする
export function newMainImage(): Sticker {
  return newSticker(MAIN_IMAGE_ID, { expression: '笑顔', pose: '正面向きのバストアップ', expressionEn: 'smiling happily', poseEn: 'facing front, bust-up portrait' })
}
export function newTabImage(): Sticker {
  return newSticker(TAB_IMAGE_ID, { expression: '笑顔', pose: '顔のアップ', expressionEn: 'smiling happily', poseEn: 'face close-up, head only, big simple shapes' })
}

// 生成・差し替え・採用の対象になる全ての画像枠(スタンプ、メイン画像、タブ画像)
export function imageSlots(project: Project): Sticker[] {
  return [...project.stickers, project.mainImage, project.tabImage]
}

export function findSlot(project: Project, id: string): Sticker | undefined {
  return imageSlots(project).find((s) => s.id === id)
}

// 枠のIDに合う項目だけを更新して返す(不変更新)
export function updateSlot(project: Project, id: string, patch: Partial<Sticker>): Project {
  const apply = (s: Sticker): Sticker => (s.id === id ? { ...s, ...patch } : s)
  return { ...project, stickers: project.stickers.map(apply), mainImage: apply(project.mainImage), tabImage: apply(project.tabImage) }
}

// 古いプロジェクトに無い項目を補う
export function withProjectDefaults(project: Project): Project {
  return { ...project, mainImage: project.mainImage ?? newMainImage(), tabImage: project.tabImage ?? newTabImage() }
}

// 書き出しに使う専用画像。採用済みで画像があるときだけ返す
export function adoptedSlotImage(slot: Sticker): string | null {
  return slot.status === 'adopted' && slot.imagePath ? slot.imagePath : null
}

// 枚数変更。減らすときも先頭から残し、既存の内容は保持する(不変更新)
export function resizeStickers(stickers: readonly Sticker[], count: number, makeId: () => string): Sticker[] {
  if (count <= stickers.length) return stickers.slice(0, count)
  const added = Array.from({ length: count - stickers.length }, () => newSticker(makeId()))
  return [...stickers, ...added]
}

export function newProject(id: string, name: string, now: string, makeId: () => string): Project {
  const count = 8
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    referenceImages: [],
    character: { name: '', keepTraits: '', keepTraitsEn: '', notes: '' },
    stickerCount: count,
    stickers: resizeStickers([], count, makeId),
    mainImage: newMainImage(),
    tabImage: newTabImage(),
    sales: { title: '', description: '', creatorName: '', copyright: '' },
    mainStickerId: null,
    generator: 'flux2-klein-4b-local',
    publishChecks: {}
  }
}

// 申請用出力に使う採用済みスタンプ(並び順維持)
export function adoptedStickers(project: Project): Sticker[] {
  return project.stickers.filter((s) => s.status === 'adopted' && s.imagePath)
}
