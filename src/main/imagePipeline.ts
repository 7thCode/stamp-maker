import sharp from 'sharp'
import { LINE_SPEC } from '../shared/lineSpec'
import type { ImageInfo } from '../shared/validate'

export type ImageKind = 'sticker' | 'main' | 'tab'

const ALPHA_THRESHOLD = 16

function toEven(n: number): number {
  return n % 2 === 0 ? n : n - 1
}

// 規格に合わせて縮小・偶数化し、72dpi付きPNGへ変換する
export async function finalizeImage(input: Buffer, kind: ImageKind): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w === 0 || h === 0) throw new Error('画像サイズを取得できません')

  let pipeline = sharp(input).ensureAlpha()
  if (kind === 'sticker') {
    const box = LINE_SPEC.sticker
    const scale = Math.min(1, box.maxWidth / w, box.maxHeight / h)
    const tw = Math.max(2, toEven(Math.floor(w * scale)))
    const th = Math.max(2, toEven(Math.floor(h * scale)))
    pipeline = pipeline.resize(tw, th, { fit: 'fill' })
  } else {
    const box = LINE_SPEC[kind]
    pipeline = pipeline.resize(box.width, box.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
  }
  return pipeline.withMetadata({ density: LINE_SPEC.minDpi }).png({ compressionLevel: 9 }).toBuffer()
}

export async function inspectImage(buf: Buffer): Promise<ImageInfo> {
  const meta = await sharp(buf).metadata()
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: buf.length,
    hasAlpha: meta.hasAlpha === true,
    dpi: meta.density ?? 0,
    format: meta.format ?? 'unknown'
  }
}

// 不透明画素の外接矩形(余白チェック用)。全透明なら null
export async function opaqueBounds(
  buf: Buffer
): Promise<{ left: number; top: number; right: number; bottom: number } | null> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 }
}

function colorDistance(a: Uint8Array, ai: number, r: number, g: number, b: number): number {
  return Math.max(Math.abs(a[ai] - r), Math.abs(a[ai + 1] - g), Math.abs(a[ai + 2] - b))
}

// 四隅の色と近い、外周から連結した領域を透明にする(単色背景向け)
export async function removeBackground(input: Buffer, tolerance = 24): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const px = new Uint8Array(data)
  const corner = (x: number, y: number) => (y * width + x) * 4
  const c = corner(0, 0)
  const [r, g, b] = [px[c], px[c + 1], px[c + 2]]
  // 隅が既に透明なら処理不要
  if (px[c + 3] < ALPHA_THRESHOLD) return input

  const visited = new Uint8Array(width * height)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const idx = y * width + x
    if (visited[idx]) return
    if (colorDistance(px, idx * 4, r, g, b) > tolerance) return
    visited[idx] = 1
    stack.push(idx)
  }
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1) }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y) }
  while (stack.length > 0) {
    const idx = stack.pop() as number
    const x = idx % width
    const y = (idx - x) / width
    px[idx * 4 + 3] = 0
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }
  return sharp(Buffer.from(px), { raw: { width, height, channels: 4 } }).png().toBuffer()
}
