// 画像生成バックエンドの差し替え口。
// ローカル(M4)/クラウドの方式は先行検証後に確定するため、ここにプロバイダを追加する。
export interface GenerateRequest {
  referenceImages: Buffer[]
  characterTraits: string
  expression: string
  pose: string
}

export interface ImageGenerator {
  id: string
  label: string
  // 文字なしのキャラクター画像(PNG/JPEG)を返す
  generate(req: GenerateRequest): Promise<Buffer>
}

// 動作確認用: 先頭の参考画像をそのまま返す。表情・ポーズは変わらない。
const passthrough: ImageGenerator = {
  id: 'passthrough',
  label: '参考画像をそのまま使用(表情・ポーズは変化しません)',
  async generate(req) {
    const first = req.referenceImages[0]
    if (!first) throw new Error('参考画像が取り込まれていません')
    return first
  }
}

const registry = new Map<string, ImageGenerator>([[passthrough.id, passthrough]])

export function listGenerators(): Array<{ id: string; label: string }> {
  return [...registry.values()].map(({ id, label }) => ({ id, label }))
}

export function getGenerator(id: string): ImageGenerator {
  const g = registry.get(id)
  if (!g) throw new Error(`未知の生成方式です: ${id}`)
  return g
}
