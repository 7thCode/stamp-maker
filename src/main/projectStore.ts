import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { newProject, withProjectDefaults } from '../shared/project'
import type { Project, ProjectSummary } from '../shared/types'

export class ProjectStore {
  constructor(private readonly root: string) {}

  dir(id: string): string {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('不正なプロジェクトIDです')
    return join(this.root, id)
  }

  async list(): Promise<ProjectSummary[]> {
    await mkdir(this.root, { recursive: true })
    const ids = await readdir(this.root)
    const out: ProjectSummary[] = []
    for (const id of ids) {
      try {
        const p = await this.load(id)
        out.push({ id: p.id, name: p.name, updatedAt: p.updatedAt })
      } catch {
        // 壊れた/無関係なフォルダは一覧から除外
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async create(name: string): Promise<Project> {
    const id = randomUUID()
    const project = newProject(id, name, new Date().toISOString(), () => randomUUID())
    await mkdir(join(this.dir(id), 'refs'), { recursive: true })
    await mkdir(join(this.dir(id), 'images'), { recursive: true })
    await this.save(project)
    return project
  }

  // プロジェクトのフォルダごと削除する(IDは形式検証済み)
  async remove(id: string): Promise<void> {
    await rm(this.dir(id), { recursive: true, force: true })
  }

  // 参考画像を一覧とファイルの両方から削除する
  async removeReference(id: string, rel: string): Promise<Project> {
    const project = await this.load(id)
    if (!project.referenceImages.includes(rel)) throw new Error('参考画像が見つかりません')
    const next = await this.save({ ...project, referenceImages: project.referenceImages.filter((r) => r !== rel) })
    await rm(this.resolveInside(id, rel), { force: true })
    return next
  }

  async load(id: string): Promise<Project> {
    return withProjectDefaults(JSON.parse(await readFile(join(this.dir(id), 'project.json'), 'utf-8')) as Project)
  }

  // 一時ファイル経由で書き込み、途中終了でも既存データを壊さない
  async save(project: Project): Promise<Project> {
    const next = { ...project, updatedAt: new Date().toISOString() }
    const file = join(this.dir(project.id), 'project.json')
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(next, null, 2), 'utf-8')
    await rename(tmp, file)
    return next
  }

  // 原本は変更せず、プロジェクト内へコピーする。戻り値は相対パス
  async importReference(id: string, srcPath: string): Promise<string> {
    const ext = extname(srcPath).toLowerCase()
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) throw new Error('PNG・JPEGのみ取り込めます')
    const rel = join('refs', `${randomUUID()}-${basename(srcPath)}`)
    await copyFile(srcPath, join(this.dir(id), rel))
    return rel
  }

  // 参考画像の候補を保存する(採用されるまで referenceImages には入らない)
  async saveCandidate(id: string, data: Buffer): Promise<string> {
    const rel = join('candidates', `${randomUUID()}.png`)
    await mkdir(join(this.dir(id), 'candidates'), { recursive: true })
    await this.writeImage(id, rel, data)
    return rel
  }

  // 候補を参考画像として取り込む。戻り値は refs 配下の相対パス
  async adoptCandidate(id: string, candidateRel: string): Promise<string> {
    const data = await this.readImage(id, candidateRel)
    const rel = join('refs', `${randomUUID()}-generated.png`)
    await this.writeImage(id, rel, data)
    return rel
  }

  async writeImage(id: string, rel: string, data: Buffer): Promise<void> {
    await writeFile(join(this.resolveInside(id, rel)), data)
  }

  async readImage(id: string, rel: string): Promise<Buffer> {
    return readFile(this.resolveInside(id, rel))
  }

  private resolveInside(id: string, rel: string): string {
    const base = this.dir(id)
    const full = join(base, rel)
    if (!full.startsWith(`${base}/`)) throw new Error('プロジェクト外のパスは指定できません')
    return full
  }
}
