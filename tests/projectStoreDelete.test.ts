import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProjectStore } from '../src/main/projectStore'

describe('ProjectStore 削除', () => {
  let root: string
  let store: ProjectStore
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'stamp-test-')); store = new ProjectStore(root) })
  afterEach(async () => { await rm(root, { recursive: true, force: true }) })

  it('プロジェクトを削除するとフォルダごと消え、一覧から外れる', async () => {
    const keep = await store.create('keep')
    const gone = await store.create('gone')
    await store.remove(gone.id)
    expect(existsSync(store.dir(gone.id))).toBe(false)
    expect((await store.list()).map((p) => p.id)).toEqual([keep.id])
  })

  it('不正なIDの削除は拒否する', async () => {
    await expect(store.remove('../outside')).rejects.toThrow('不正なプロジェクトID')
  })

  it('参考画像を削除すると一覧とファイルの両方から消える', async () => {
    const project = await store.create('t')
    const src = join(root, 'src.png')
    await writeFile(src, Buffer.from('png'))
    const a = await store.importReference(project.id, src)
    const b = await store.importReference(project.id, src)
    await store.save({ ...project, referenceImages: [a, b] })

    const next = await store.removeReference(project.id, a)
    expect(next.referenceImages).toEqual([b])
    expect(existsSync(join(store.dir(project.id), a))).toBe(false)
    expect(existsSync(join(store.dir(project.id), b))).toBe(true)
    expect((await store.load(project.id)).referenceImages).toEqual([b])
  })

  it('一覧に無いパスの参考画像は削除できない', async () => {
    const project = await store.create('t')
    await expect(store.removeReference(project.id, 'project.json')).rejects.toThrow('見つかりません')
    expect(existsSync(join(store.dir(project.id), 'project.json'))).toBe(true)
  })
})
