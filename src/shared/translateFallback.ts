// 英訳に失敗しても処理を止めず、元の文章をそのまま使う(Ollama が無い環境向け)
export interface TranslationOutcome {
  text: string
  // 英訳できなかったときの理由。英訳できたときは undefined
  fallbackReason?: string
}

export async function translateOrKeep(text: string, translate: (text: string) => Promise<string>): Promise<TranslationOutcome> {
  try {
    return { text: await translate(text) }
  } catch (e) {
    return { text, fallbackReason: e instanceof Error ? e.message : String(e) }
  }
}
