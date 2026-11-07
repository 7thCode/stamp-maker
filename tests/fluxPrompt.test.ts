import { describe, expect, it } from 'vitest'
import { buildKleinPrompt } from '../src/main/fluxPrompt'

describe('buildKleinPrompt', () => {
  it('特徴・表情・ポーズを含める', () => {
    const p = buildKleinPrompt({ keepTraits: 'black silhouette', expression: 'smiling', pose: 'waving a tentacle' })
    expect(p).toContain('black silhouette')
    expect(p).toContain('facial expression: smiling')
    expect(p).toContain('pose: waving a tentacle')
  })
  it('特徴が空なら参照画像どおりと指示する', () => {
    expect(buildKleinPrompt({ keepTraits: ' ', expression: '', pose: '' })).toContain('reference image')
  })
  it('変更指定が空なら現状維持を指示する', () => {
    expect(buildKleinPrompt({ keepTraits: 'x', expression: '', pose: '' })).toContain('Keep the pose and expression')
  })
  it('描き直しを促す語を含めない', () => {
    expect(buildKleinPrompt({ keepTraits: 'x', expression: 'sad', pose: 'bow' }).toLowerCase()).not.toContain('redraw')
  })
})
