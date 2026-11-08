import { describe, expect, it } from 'vitest'
import { pickRandomReference } from '../src/main/generators'

describe('pickRandomReference', () => {
  it('複数あっても1枚だけ返す', () => {
    expect(pickRandomReference(['a', 'b', 'c'], () => 1)).toEqual(['b'])
  })
  it('乱数の範囲として画像の枚数を渡す', () => {
    let received = 0
    pickRandomReference(['a', 'b', 'c'], (max) => { received = max; return 0 })
    expect(received).toBe(3)
  })
  it('1枚ならその画像を返す', () => {
    expect(pickRandomReference(['only'])).toEqual(['only'])
  })
  it('空なら空を返す', () => {
    expect(pickRandomReference([])).toEqual([])
  })
  it('実際の乱数でも、すべての画像が選ばれ得る', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) seen.add(pickRandomReference(['a', 'b', 'c'])[0])
    expect(seen.size).toBe(3)
  })
})
