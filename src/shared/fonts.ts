// スタンプの文字に使える書体(macOS 標準の日本語フォント)
export interface FontChoice {
  family: string
  label: string
}

export const FONT_CHOICES: readonly FontChoice[] = [
  { family: 'Hiragino Maru Gothic ProN', label: 'ヒラギノ丸ゴ' },
  { family: 'Hiragino Sans', label: 'ヒラギノ角ゴ' },
  { family: 'Hiragino Mincho ProN', label: 'ヒラギノ明朝' },
  { family: 'YuGothic', label: '游ゴシック' },
  { family: 'YuMincho', label: '游明朝' },
  { family: 'BIZ UDGothic', label: 'BIZ UDゴシック' },
  { family: 'BIZ UDMincho', label: 'BIZ UD明朝' },
  { family: 'Klee', label: 'クレー(手書き風)' },
  { family: 'Osaka', label: 'Osaka' }
]

// この環境で使える書体だけを返す。保存済みの書体が一覧に無い、または使えない場合も、
// 選択が消えて見た目が変わらないよう、現在の書体を先頭に残す
export function fontOptions(isAvailable: (family: string) => boolean, current: string): FontChoice[] {
  const usable = FONT_CHOICES.filter((f) => isAvailable(f.family))
  if (usable.some((f) => f.family === current)) return usable
  const known = FONT_CHOICES.find((f) => f.family === current)
  return [{ family: current, label: known ? `${known.label}(この環境に無い)` : current }, ...usable]
}
