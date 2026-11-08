import { describe, expect, it } from 'vitest'
import { buildSdArgs, SD_MODEL_FILES, SD_SIZE, SD_STEPS } from '../src/main/sdRunner'

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
