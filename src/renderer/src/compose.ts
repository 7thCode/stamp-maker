import { LINE_SPEC } from '../../shared/lineSpec'
import type { TextStyle } from '../../shared/types'

export const CANVAS_W = LINE_SPEC.sticker.maxWidth
export const CANVAS_H = LINE_SPEC.sticker.maxHeight
const MIN_FONT_SIZE = 12

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像を読み込めません'))
    img.src = src
  })
}

export interface ComposeResult {
  // 文字が枠からはみ出す(縮小しても収まらない)場合 true
  overflow: boolean
}

// 画像と文字をキャンバスへ合成する。プレビューと書き出しで共通利用する。
export function composeSticker(
  canvas: HTMLCanvasElement,
  base: HTMLImageElement | null,
  text: string,
  style: TextStyle
): ComposeResult {
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvasを利用できません')
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  const m = LINE_SPEC.marginPx
  if (base) {
    const scale = Math.min((CANVAS_W - m * 2) / base.width, (CANVAS_H - m * 2) / base.height)
    const w = base.width * scale
    const h = base.height * scale
    ctx.drawImage(base, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h)
  }
  if (!text.trim()) return { overflow: false }

  const lines = text.split('\n')
  const maxWidth = CANVAS_W - m * 2
  let size = style.fontSize
  const measure = (s: number) => {
    ctx.font = `bold ${s}px "${style.fontFamily}", sans-serif`
    return Math.max(...lines.map((l) => ctx.measureText(l).width))
  }
  while (size > MIN_FONT_SIZE && measure(size) + style.strokeWidth > maxWidth) size -= 1
  const widest = measure(size) + style.strokeWidth

  const lineH = size * 1.15
  const blockH = lineH * lines.length
  const cx = style.x * CANVAS_W
  const top = style.y * CANVAS_H - blockH / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = style.strokeWidth
  ctx.strokeStyle = style.strokeColor
  ctx.fillStyle = style.color
  lines.forEach((line, i) => {
    const y = top + lineH * (i + 0.5)
    if (style.strokeWidth > 0) ctx.strokeText(line, cx, y)
    ctx.fillText(line, cx, y)
  })

  const overflow =
    widest > maxWidth || cx - widest / 2 < 0 || cx + widest / 2 > CANVAS_W || top < 0 || top + blockH > CANVAS_H
  return { overflow }
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? blob.arrayBuffer().then(resolve) : reject(new Error('PNG変換に失敗'))), 'image/png')
  })
}
