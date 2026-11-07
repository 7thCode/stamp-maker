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
    imagePath: null,
    status: 'unchecked',
    job: 'idle',
    textStyle: { ...DEFAULT_TEXT_STYLE },
    ...overrides
  }
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
    character: { name: '', keepTraits: '', notes: '' },
    stickerCount: count,
    stickers: resizeStickers([], count, makeId),
    sales: { title: '', description: '', creatorName: '', copyright: '' },
    mainStickerId: null,
    generator: 'flux2-klein-4b-local'
  }
}

// 申請用出力に使う採用済みスタンプ(並び順維持)
export function adoptedStickers(project: Project): Sticker[] {
  return project.stickers.filter((s) => s.status === 'adopted' && s.imagePath)
}
