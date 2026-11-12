import { describe, expect, it } from 'vitest'
import { buildSdArgs, SD_MODEL_FILES, SD_SIZE, SD_STEPS, summarizeSdError } from '../src/main/sdRunner'

function valueOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i < 0 ? undefined : args[i + 1]
}

describe('buildSdArgs', () => {
  it('参考画像ごとに -r を付け、モデルと生成条件を指定する', () => {
    const args = buildSdArgs({ prompt: 'p', seed: 7, output: '/o.png', referenceImages: ['/a.png', '/b.png'] })
    expect(args.filter((a) => a === '-r')).toHaveLength(2)
    expect(args).toContain('/a.png')
    expect(args).toContain('/b.png')
    expect(valueOf(args, '--diffusion-model')).toBe(SD_MODEL_FILES.diffusion)
    expect(valueOf(args, '--steps')).toBe(String(SD_STEPS))
    expect(valueOf(args, '-W')).toBe(String(SD_SIZE))
    expect(valueOf(args, '-s')).toBe('7')
    expect(valueOf(args, '-o')).toBe('/o.png')
  })

  it('参考画像が無ければ -r を付けない(文字からの生成)', () => {
    expect(buildSdArgs({ prompt: 'p', seed: 1, output: '/o.png' })).not.toContain('-r')
  })
})

describe('summarizeSdError', () => {
  it('[E] の行だけを取り出し、ソースの位置の表記は除いて、重複をまとめる', () => {
    const out = [
      'ggml_metal_device_init: GPU name: MTL0 (Apple M2)',
      "[E] load image from '/tmp/a.png' failed --- media_io.cpp:516",
      "[E] load image from '/tmp/a.png' failed --- main.cpp:757"
    ].join('\n')
    expect(summarizeSdError(out)).toBe("[E] load image from '/tmp/a.png' failed")
  })
  it('[E] が無ければ、末尾の数行を返す', () => {
    const out = Array.from({ length: 20 }, (_, i) => `line${i}`).join('\n')
    expect(summarizeSdError(out)).toBe('line15\nline16\nline17\nline18\nline19')
  })
  it('空の出力は空文字', () => {
    expect(summarizeSdError('')).toBe('')
  })
})
