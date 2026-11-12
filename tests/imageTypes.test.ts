import { describe, expect, it } from 'vitest'
import { IMPORTABLE_IMAGE_EXTENSIONS, imageMimeType, isImportableImage } from '../src/shared/imageTypes'

describe('imageTypes', () => {
  it('取り込める拡張子は PNG・JPEG・WebP', () => {
    expect([...IMPORTABLE_IMAGE_EXTENSIONS].sort()).toEqual(['jpeg', 'jpg', 'png', 'webp'])
  })
  it('大文字小文字を区別せず判定する', () => {
    expect(['a.png', 'a.JPG', 'a.Jpeg', '/x/y/a.WEBP'].every(isImportableImage)).toBe(true)
  })
  it('それ以外・拡張子なしは取り込めない', () => {
    expect(['a.gif', 'a.tiff', 'a.pdf', 'a', 'png', 'a.png.exe'].some(isImportableImage)).toBe(false)
  })
  it('表示用の MIME タイプを拡張子から決める。WebP を JPEG として返さない', () => {
    expect(imageMimeType('refs/a.webp')).toBe('image/webp')
    expect(imageMimeType('refs/a.JPG')).toBe('image/jpeg')
    expect(imageMimeType('images/a.png')).toBe('image/png')
  })
  it('不明な拡張子は PNG とする', () => {
    expect(imageMimeType('images/a')).toBe('image/png')
  })
})
