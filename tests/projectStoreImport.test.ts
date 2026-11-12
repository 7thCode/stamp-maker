import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProjectStore } from '../src/main/projectStore'

describe('ProjectStore 参考画像の取り込み', () => {
  let root: string
  let store: ProjectStore
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'stamp-import-')); store = new ProjectStore(join(root, 'projects')) })
  afterEach(async () => { await rm(root, { recursive: true, force: true }) })

  const source = async (name: string, data: Buffer | string = 'data'): Promise<string> => {
    const p = join(root, name)
    await writeFile(p, data)
    return p
  }

  it.each(['a.png', 'a.jpg', 'a.jpeg', 'a.webp', 'A.WEBP'])('%s を取り込み、refs 配下へコピーする', async (name) => {
    const project = await store.create('p')
    const rel = await store.importReference(project.id, await source(name))
    expect(rel.startsWith('refs/')).toBe(true)
    expect(rel.toLowerCase().endsWith(name.toLowerCase())).toBe(true)
    expect(existsSync(join(store.dir(project.id), rel))).toBe(true)
  })

  it('WebP の中身をそのまま保存する(読み戻して WebP として開ける)', async () => {
    const project = await store.create('p')
    const webp = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#f00' } }).webp().toBuffer()
    const rel = await store.importReference(project.id, await source('r.webp', webp))
    expect((await sharp(await store.readImage(project.id, rel)).metadata()).format).toBe('webp')
  })

  it.each(['a.gif', 'a.tiff', 'a.pdf', 'a'])('%s は PNG・JPEG・WebP 以外として断る', async (name) => {
    const project = await store.create('p')
    await expect(store.importReference(project.id, await source(name))).rejects.toThrow('PNG・JPEG・WebPのみ取り込めます')
  })
})
