// FLUX.2 klein 向けのプロンプト構築。
// 検証結果: 色・形を明示し「デザインは同一、ポーズ/表情のみ変更」と書くと同一性が保たれる。
// 「Redraw」など描き直しを促す語は同一性を崩すため使わない。
const FALLBACK_TRAITS = 'the character exactly as shown in the reference image'

export interface PromptInput {
  keepTraits: string
  expression: string
  pose: string
}

export function buildKleinPrompt({ keepTraits, expression, pose }: PromptInput): string {
  const traits = keepTraits.trim() || FALLBACK_TRAITS
  const changes = [
    expression.trim() && `facial expression: ${expression.trim()}`,
    pose.trim() && `pose: ${pose.trim()}`
  ].filter(Boolean)
  const change = changes.length > 0 ? `Change only the ${changes.join(', and the ')}.` : 'Keep the pose and expression as they are.'
  return [
    `This exact character: ${traits}.`,
    'Flat 2D illustration on a pure white background, no outline, no border, no shadow, no text.',
    `Keep the design identical. ${change}`
  ].join(' ')
}
