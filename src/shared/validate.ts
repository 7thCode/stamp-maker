import { LINE_SPEC } from './lineSpec'
import type { SalesInfo, ValidationIssue } from './types'

// 全角(非ASCII)は2文字として数える
export function lineTextWeight(text: string): number {
  let n = 0
  for (const ch of text) n += ch.charCodeAt(0) <= 0x7f ? 1 : 2
  return n
}

const EMOJI_RE = /\p{Extended_Pictographic}/u
// 審査基準 2.4: URLが表示されているものは不可
const URL_RE = /https?:\/\/|www\./i

export function validateSalesInfo(sales: SalesInfo): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const limits: Array<[keyof SalesInfo, string, number]> = [
    ['title', 'タイトル', LINE_SPEC.text.title],
    ['creatorName', 'クリエイター名', LINE_SPEC.text.creator],
    ['description', '説明文', LINE_SPEC.text.description],
    ['copyright', 'コピーライト', LINE_SPEC.text.copyright]
  ]
  for (const [key, label, max] of limits) {
    const value = sales[key]
    if (!value.trim()) {
      issues.push({ level: 'error', target: 'sales', message: `${label}が未入力です` })
      continue
    }
    if (lineTextWeight(value) > max) {
      issues.push({ level: 'error', target: 'sales', message: `${label}が${max}文字(全角2文字換算)を超えています` })
    }
    if (URL_RE.test(value)) {
      issues.push({ level: 'error', target: 'sales', message: `${label}にURLは使用できません` })
    }
    if (EMOJI_RE.test(value)) {
      issues.push({ level: 'error', target: 'sales', message: `${label}に絵文字は使用できません` })
    }
  }
  if (sales.copyright && !/^[\x20-\x7e]*$/.test(sales.copyright)) {
    issues.push({ level: 'error', target: 'sales', message: 'コピーライトは英数字(半角)のみ使用できます' })
  }
  return issues
}

export interface ImageInfo {
  width: number
  height: number
  bytes: number
  hasAlpha: boolean
  dpi: number
  format: string
  // 色空間(sharpの表記。RGBなら 'srgb')。不明なら省略
  space?: string
}

export function validateImage(
  target: string,
  info: ImageInfo,
  kind: 'sticker' | 'main' | 'tab'
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const err = (message: string) => issues.push({ level: 'error', target, message })
  if (info.format !== 'png') err('PNG形式ではありません')
  if (info.bytes > LINE_SPEC.maxImageBytes) err('容量が1MBを超えています')
  if (info.space !== undefined && info.space !== 'srgb') err('カラーモードがRGBではありません')
  if (!info.hasAlpha) err('背景透過(アルファチャンネル)がありません')
  if (info.dpi < LINE_SPEC.minDpi) err(`解像度が${LINE_SPEC.minDpi}dpi未満です`)
  if (info.width % 2 !== 0 || info.height % 2 !== 0) err('縦横の寸法が偶数ではありません')
  if (kind === 'sticker') {
    if (info.width > LINE_SPEC.sticker.maxWidth || info.height > LINE_SPEC.sticker.maxHeight) {
      err(`寸法が最大${LINE_SPEC.sticker.maxWidth}×${LINE_SPEC.sticker.maxHeight}pxを超えています`)
    }
  } else {
    const want = LINE_SPEC[kind]
    if (info.width !== want.width || info.height !== want.height) {
      err(`寸法が${want.width}×${want.height}pxではありません`)
    }
  }
  return issues
}

export function validateSetSize(adoptedCount: number): ValidationIssue[] {
  const allowed = LINE_SPEC.allowedStickerCounts as readonly number[]
  if (allowed.includes(adoptedCount)) return []
  return [{
    level: 'error',
    target: 'set',
    message: `スタンプ枚数は${allowed.join('・')}枚のいずれかが必要です(現在${adoptedCount}枚)`
  }]
}

export function validateZipSize(bytes: number): ValidationIssue[] {
  return bytes > LINE_SPEC.maxZipBytes
    ? [{ level: 'error', target: 'zip', message: 'ZIPが60MBを超えています' }]
    : []
}

// 余白チェック用: 不透明画素の外接矩形が外枠から約10px以上離れているか
export function marginWarning(
  target: string,
  bbox: { left: number; top: number; right: number; bottom: number },
  width: number,
  height: number
): ValidationIssue[] {
  const m = LINE_SPEC.marginPx
  const tight = bbox.left < m || bbox.top < m || width - bbox.right < m || height - bbox.bottom < m
  return tight
    ? [{ level: 'warning', target, message: `コンテンツと外枠の余白が約${m}px未満です(確認対象)` }]
    : []
}
