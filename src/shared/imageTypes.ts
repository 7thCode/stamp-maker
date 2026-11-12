// 取り込める画像の形式。ファイル選択の許可、保存時の検査、表示用の種類の判定で共通に使う
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
}

// ファイル選択ダイアログに渡す拡張子(ドットなし)
export const IMPORTABLE_IMAGE_EXTENSIONS: readonly string[] = Object.keys(MIME_BY_EXTENSION)

export const IMPORTABLE_IMAGE_LABEL = 'PNG・JPEG・WebP'

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot < 0 ? '' : path.slice(dot + 1).toLowerCase()
}

export function isImportableImage(path: string): boolean {
  return extensionOf(path) in MIME_BY_EXTENSION
}

// 表示用の MIME タイプ。拡張子から決め、不明なら PNG とする(保存する画像は PNG が基本のため)
export function imageMimeType(path: string): string {
  return MIME_BY_EXTENSION[extensionOf(path)] ?? 'image/png'
}
