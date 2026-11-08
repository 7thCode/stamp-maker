// LINE Creators Market への申請前に、利用者自身が確認する項目。
// 審査基準の原文は LINE 側が管理するため、ここでは確認を促すだけで合否は判定しない。
export interface ChecklistItem {
  id: string
  // 画面で見出しとしてまとめる分類
  group: string
  label: string
  hint: string
}

export const CREATORS_MARKET_URL = 'https://creator.line.me/ja/'

// 項目は「スタンプ審査ガイドライン」(https://creator.line.me/ja/review_guideline/)の
// 画像・テキスト・モラル・ビジネス・権利の各基準をもとにしている。括弧内は該当する項番。
// 保存済みの確認状況を保つため、既存の項目IDは変更しない。
export const PUBLISH_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: 'reference-rights',
    group: '権利',
    label: '参考画像は自作、または利用の許諾がある',
    hint: '他人のキャラクター・ストックサイトの素材・透かし入り画像を使っていないこと。権利者の許諾が証明できない素材は不可です(5.1・5.4)'
  },
  {
    id: 'no-lookalike',
    group: '権利',
    label: '既存のキャラクター・商標・ロゴに似ていない',
    hint: '二次創作やパロディなど、権利の所在が明確でないものは不可です(5.1・5.2)。生成画像にロゴや文字が紛れ込んでいないかも確認'
  },
  {
    id: 'no-real-person',
    group: '権利',
    label: '実在の人物の顔・似顔絵になっていない',
    hint: '許諾のない人物の顔や似顔絵は、肖像権・パブリシティ権の侵害として不可です(5.3)。参考画像が写真の場合は特に確認'
  },
  {
    id: 'not-duplicate',
    group: '権利',
    label: '販売中・審査中のスタンプの複製ではない',
    hint: '既にスタンプショップで販売または審査されているスタンプの複製は不可です(1.10)'
  },
  {
    id: 'model-terms',
    group: '権利',
    label: '画像生成モデルの規約が商用利用を許している',
    hint: '標準構成の FLUX.2 klein 4B と Qwen3 4B は Apache 2.0 です。モデルを変えた場合は再確認'
  },
  {
    id: 'content-ok',
    group: '内容',
    label: '暴力・性的・差別・政治・宗教などの不適切な表現を含まない',
    hint: '暴力や殺傷の描写、肌の露出が多いもの、飲酒・喫煙・薬物・賭博・自傷の助長、特定の個人や団体への誹謗、政治・宗教の表現などは不可です(3.x)'
  },
  {
    id: 'no-personal-info',
    group: '内容',
    label: '個人情報(本名・連絡先・SNSアカウントなど)が画像や文章に入っていない',
    hint: '自分や第三者の個人情報を開示するもの、購入に個人情報やIDを求めるものは不可です(3.10・4.1)'
  },
  {
    id: 'no-ads',
    group: '内容',
    label: '宣伝・告知・寄付・勧誘・他のメッセンジャー名を含まない',
    hint: '企業や商品の宣伝、企業ロゴのみの画像、○月○日発売などの告知、寄付や団体への勧誘、他のメッセンジャーアプリ(類似サービス)の名前は不可です(1.5・2.3・4.2〜4.6)'
  },
  {
    id: 'readability',
    group: '画像',
    label: '日常会話で使いやすく、小さい画面でも読める',
    hint: '横長の画像、8頭身の全身、淡い色ばかりのセット、文字や数字だけの画像、ロゴだけの画像は不可です(1.2〜1.6)'
  },
  {
    id: 'visual-check',
    group: '画像',
    label: '書き出した画像を目視で確認した',
    hint: '文字の誤り・欠け・はみ出し、手や顔の崩れ、背景の抜け残りがないこと(1.7)'
  },
  {
    id: 'main-tab-match',
    group: '画像',
    label: 'メイン画像・タブ画像がスタンプの絵柄と大きく違わない',
    hint: '販売するスタンプの画像と著しく異なるメイン画像・タブ画像は不可です(1.9)。タブ画像(96×74)は小さいので、顔が分かるか確認'
  },
  {
    id: 'text-check',
    group: '文章',
    label: 'タイトル・説明文・クリエイター名に誤字や不適切な内容がない',
    hint: '誤字、URL、ハートなどの絵文字や機種依存文字、「○○と検索」などの告知文言は不可です。画像の内容と矛盾しないことも確認(1.8・2.2〜2.7)'
  },
  {
    id: 'ai-disclosure',
    group: 'その他',
    label: '説明文などに AI 生成画像を使った旨を書いた(手描きと偽らない)',
    hint: '確認したガイドライン(制作・審査)には、生成AIに関する明示的な規定はありませんでした。上記の権利や内容の基準は、AI生成物にもそのまま当てはまります。最新の案内も確認してください'
  },
  {
    id: 'read-guidelines',
    group: 'その他',
    label: 'LINE Creators Market の最新ガイドラインと規約を読んだ',
    hint: '制作ガイドライン(creator.line.me/ja/guideline/sticker/)と審査ガイドライン(creator.line.me/ja/review_guideline/)を、公式の原文で確認してください。基準は変更されることがあります'
  }
]

// 未確認の項目を返す(空なら全て確認済み)
export function pendingChecks(checks: Record<string, boolean> | undefined): ChecklistItem[] {
  return PUBLISH_CHECKLIST.filter((item) => !checks?.[item.id])
}
