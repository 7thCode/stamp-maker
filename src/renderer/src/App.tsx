import { useCallback, useEffect, useRef, useState } from 'react'
import type { Project, ProjectSummary } from '../../shared/types'
import { ExportTab } from './ExportTab'
import { GalleryTab } from './GalleryTab'
import { PlanTab } from './PlanTab'
import { SalesTab } from './SalesTab'
import { PublishTab } from './PublishTab'
import { SetupTab } from './SetupTab'

type Tab = 'setup' | 'plan' | 'gallery' | 'sales' | 'export' | 'publish'
const TABS: Array<[Tab, string]> = [['setup', '参考画像・設定'], ['plan', '構成・文言'], ['gallery', '生成・確認'], ['sales', '販売情報'], ['export', '検証・出力'], ['publish', '申請準備']]
const SAVE_DEBOUNCE_MS = 400

function ProjectList({ onOpen }: { onOpen: (id: string) => void }) {
  const [list, setList] = useState<ProjectSummary[]>([])
  const [name, setName] = useState('')
  useEffect(() => { window.stamp.listProjects().then(setList) }, [])
  const remove = async (id: string) => {
    if (await window.stamp.deleteProject(id)) setList(await window.stamp.listProjects())
  }
  const create = async () => {
    if (!name.trim()) return
    onOpen((await window.stamp.createProject(name.trim())).id)
  }
  return (
    <main>
      <h2>プロジェクト</h2>
      <div className="row">
        <input type="text" placeholder="新しいプロジェクト名" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 280 }} />
        <button onClick={create}>作成</button>
      </div>
      <ul>
        {list.map((p) => <li key={p.id}><button onClick={() => onOpen(p.id)}>{p.name}</button> <small>{new Date(p.updatedAt).toLocaleString()}</small> <button onClick={() => remove(p.id)}>削除</button></li>)}
      </ul>
    </main>
  )
}

export function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<Tab>('setup')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef<Project | null>(null)

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    if (latest.current) await window.stamp.saveProject(latest.current)
  }, [])

  // 編集は即時反映し、保存は短い遅延でまとめる
  const onChange = useCallback((fn: (p: Project) => Project) => {
    setProject((prev) => {
      if (!prev) return prev
      const next = fn(prev)
      latest.current = next
      clearTimeout(timer.current)
      timer.current = setTimeout(() => { window.stamp.saveProject(next) }, SAVE_DEBOUNCE_MS)
      return next
    })
  }, [])

  // main側で更新済みのプロジェクトで置き換える(保存待ちの編集は破棄しない)
  const onReplace = useCallback((p: Project) => { latest.current = p; setProject(p) }, [])

  const open = async (id: string) => { setProject(await window.stamp.loadProject(id)); setTab('setup') }
  const close = async () => { await flush(); latest.current = null; setProject(null) }

  if (!project) return <div className="app"><header><h1>スタンプメーカー</h1></header><ProjectList onOpen={open} /></div>
  return (
    <div className="app">
      <header>
        <h1>{project.name}</h1>
        <nav>{TABS.map(([t, l]) => <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{l}</button>)}</nav>
        <button onClick={close}>一覧へ</button>
      </header>
      <main>
        {tab === 'setup' && <SetupTab project={project} onChange={onChange} onReplace={onReplace} />}
        {tab === 'plan' && <PlanTab project={project} onChange={onChange} onReplace={onReplace} />}
        {tab === 'gallery' && <GalleryTab project={project} onChange={onChange} onReplace={onReplace} />}
        {tab === 'sales' && <SalesTab project={project} onChange={onChange} />}
        {tab === 'export' && <ExportTab project={project} onChange={onChange} />}
        {tab === 'publish' && <PublishTab project={project} onChange={onChange} />}
      </main>
    </div>
  )
}
