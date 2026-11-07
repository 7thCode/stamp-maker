// LINE Creators Market 通常静止画スタンプの規格値。
// 公式ガイドラインの変更に追従できるよう、確認日とともに1か所へ集約する。
export const LINE_SPEC = {
  confirmedAt: '2026-11-07',
  source: 'https://creator.line.me/ja/guideline/sticker/',
  allowedStickerCounts: [8, 16, 24, 32, 40],
  sticker: { maxWidth: 370, maxHeight: 320 },
  main: { width: 240, height: 240 },
  tab: { width: 96, height: 74 },
  maxImageBytes: 1024 * 1024,
  maxZipBytes: 60 * 1024 * 1024,
  minDpi: 72,
  marginPx: 10,
  text: { title: 40, creator: 50, description: 160, copyright: 50 }
} as const

export type LineSpec = typeof LINE_SPEC
