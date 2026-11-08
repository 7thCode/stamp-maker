import { describe, expect, it } from 'vitest'
import { translateOrKeep } from '../src/shared/translateFallback'

describe('translateOrKeep', () => {
  it('英訳できたときは英訳結果を返す', async () => {
    expect(await translateOrKeep('白い猫', async () => 'white cat')).toEqual({ text: 'white cat' })
  })
  it('英訳に失敗したときは元の文章と理由を返す', async () => {
    const out = await translateOrKeep('白い猫', async () => { throw new Error('Ollamaに接続できません') })
    expect(out).toEqual({ text: '白い猫', fallbackReason: 'Ollamaに接続できません' })
  })
  it('Error以外が投げられても元の文章を返す', async () => {
    const out = await translateOrKeep('白い猫', async () => { throw 'boom' })
    expect(out).toEqual({ text: '白い猫', fallbackReason: 'boom' })
  })
})
