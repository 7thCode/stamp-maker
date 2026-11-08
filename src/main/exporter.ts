import { zipSync } from 'fflate'
import type { SalesInfo, ValidationIssue } from '../shared/types'
import { marginWarning, validateImage, validateSalesInfo, validateSetSize, validateZipSize } from '../shared/validate'
import { finalizeImage, inspectImage, opaqueBounds } from './imagePipeline'

export interface ExportInput {
  // 並び順どおりの採用済みスタンプ(文字合成済みのPNG)
  stickers: Array<{ id: string; png: Buffer }>
  main: Buffer
  tab: Buffer
  sales: SalesInfo
}

export interface ExportResult {
  issues: ValidationIssue[]
  // エラーがある場合は null
  files: Record<string, Buffer> | null
  zip: Buffer | null
}

export function stickerFileName(index: number): string {
  return `${String(index + 1).padStart(2, '0')}.png`
}

export async function buildExport(input: ExportInput): Promise<ExportResult> {
  const issues: ValidationIssue[] = [
    ...validateSetSize(input.stickers.length),
    ...validateSalesInfo(input.sales)
  ]
  const files: Record<string, Buffer> = {}

  for (const [i, s] of input.stickers.entries()) {
    const out = await finalizeImage(s.png, 'sticker')
    const info = await inspectImage(out)
    issues.push(...validateImage(s.id, info, 'sticker'))
    const bounds = await opaqueBounds(out)
    if (bounds) issues.push(...marginWarning(s.id, bounds, info.width, info.height))
    else issues.push({ level: 'error', target: s.id, message: '画像が完全に透明です' })
    files[stickerFileName(i)] = out
  }
  for (const kind of ['main', 'tab'] as const) {
    const out = await finalizeImage(input[kind], kind)
    issues.push(...validateImage(kind, await inspectImage(out), kind))
    files[`${kind}.png`] = out
  }

  const zipInput = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, new Uint8Array(v)]))
  const zip = Buffer.from(zipSync(zipInput, { level: 0 }))
  issues.push(...validateZipSize(zip.length))

  const hasError = issues.some((i) => i.level === 'error')
  return { issues, files: hasError ? null : files, zip: hasError ? null : zip }
}
