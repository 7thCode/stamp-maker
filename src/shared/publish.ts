// LINE Creators Market への申請前に、利用者自身が確認する項目。
// 審査基準の原文は LINE 側が管理するため、ここでは確認を促すだけで合否は判定しない。
export interface ChecklistItem {
  id: string
  label: string
  hint: string
}

export const CREATORS_MARKET_URL = 'https://creator.line.me/ja/'

export const PUBLISH_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: 'reference-rights',
    label: '参考画像は自作、または利用の許諾がある',
    hint: '他人のキャラクター・ストックサイトの素材・透かし入り画像を使っていないこと'
  },
  {
    id: 'no-lookalike',
    label: '既存のキャラクター・著名人・商標・ロゴに似ていない',
    hint: '二次創作やパロディは登録できません。生成画像にロゴや文字が紛れ込んでいないかも確認'
  },
  {
    id: 'content-ok',
    label: '宣伝目的・不適切な表現を含まない',
    hint: '企業ロゴのみ・広告目的・差別的/暴力的な表現などは審査で却下されます'
  },
  {
    id: 'model-terms',
    label: '画像生成モデルの規約が商用利用を許している',
    hint: '標準構成の FLUX.2 klein 4B と Qwen3 4B は Apache 2.0 です。モデルを変えた場合は再確認'
  },
  {
    id: 'ai-disclosure',
    label: '説明文などに AI 生成画像を使った旨を書いた(手描きと偽らない)',
    hint: '審査の通りやすさにも関係するとの報告があります。LINE の最新の案内で扱いを確認'
  },
  {
    id: 'visual-check',
    label: '書き出した画像を目視で確認した',
    hint: '文字の欠け・はみ出し、手や顔の崩れ、背景の抜け残りがないこと'
  },
  {
    id: 'read-guidelines',
    label: 'LINE Creators Market の最新ガイドラインと規約を読んだ',
    hint: '仕様や基準は変更されることがあります。必ず公式の原文で確認してください'
  }
]

// 未確認の項目を返す(空なら全て確認済み)
export function pendingChecks(checks: Record<string, boolean> | undefined): ChecklistItem[] {
  return PUBLISH_CHECKLIST.filter((item) => !checks?.[item.id])
}
