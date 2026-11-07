import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProjectStore } from '../src/main/projectStore'
import { buildReferencePrompt } from '../src/main/referenceGen'

describe('buildReferencePrompt', () => {
  it('説明を含め、白縁の原因になる sticker を使わない', () => {
    const p = buildReferencePrompt(' a white cat ')
    expect(p.startsWith('a white cat.')).toBe(true)
    expect(p).toContain('pure white background')
    expect(p.toLowerCase()).not.toContain('sticker')
  })
})

describe('ProjectStore 参考画像の候補', () => {
  let root: string
  let store: ProjectStore
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'stamp-test-')); store = new ProjectStore(root) })
  afterEach(async () => { await rm(root, { recursive: true, force: true }) })

  it('候補は採用するまで referenceImages に入らず、採用で refs へコピーされる', async () => {
    const project = await store.create('t')
    const rel = await store.saveCandidate(project.id, Buffer.from('png-bytes'))
    expect(rel.startsWith('candidates/')).toBe(true)
    expect((await store.load(project.id)).referenceImages).toEqual([])

    const adopted = await store.adoptCandidate(project.id, rel)
    expect(adopted.startsWith('refs/')).toBe(true)
    expect((await readFile(join(store.dir(project.id), adopted))).toString()).toBe('png-bytes')
  })
  it('プロジェクト外のパスは拒否する', async () => {
    const project = await store.create('t')
    await expect(store.readImage(project.id, '../../etc/passwd')).rejects.toThrow()
  })
  it('不正なIDは拒否する', () => {
    expect(() => store.dir('../x')).toThrow()
    expect(() => store.dir(randomUUID())).not.toThrow()
  })
})
