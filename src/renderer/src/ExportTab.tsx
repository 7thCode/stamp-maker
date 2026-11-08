import { useState } from 'react'
import { adoptedSlotImage, adoptedStickers } from '../../shared/project'
import type { Project, ValidationIssue } from '../../shared/types'
import { CANVAS_H, CANVAS_W, canvasToPng, composeSticker, loadImage } from './compose'

interface Props { project: Project; onChange: (fn: (p: Project) => Project) => void }

async function render(project: Project, imagePath: string | null, text: string, style: Project['stickers'][number]['textStyle']) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W; canvas.height = CANVAS_H
  const base = imagePath ? await loadImage(await window.stamp.readImage(project.id, imagePath)) : null
  composeSticker(canvas, base, text, style)
  return canvasToPng(canvas)
}

export function ExportTab({ project, onChange }: Props) {
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [outDir, setOutDir] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const adopted = adoptedStickers(project)
  const mainSticker = adopted.find((s) => s.id === project.mainStickerId) ?? adopted[0]

  const run = async () => {
    if (!mainSticker) { setIssues([{ level: 'error', target: 'set', message: '採用済みスタンプがありません' }]); return }
    setBusy(true); setOutDir(null)
    try {
      const stickers = await Promise.all(adopted.map(async (s) => ({ id: s.id, png: await render(project, s.imagePath, s.text, s.textStyle) })))
      // メイン/タブ画像は文字なし。専用の画像が採用済みならそれを、無ければ採用スタンプを元にする
      const fallback = await render(project, mainSticker.imagePath, '', mainSticker.textStyle)
      const own = async (slot: Project['mainImage']) => {
        const rel = adoptedSlotImage(slot)
        return rel ? render(project, rel, '', slot.textStyle) : fallback
      }
      const res = await window.stamp.exportSet({ projectId: project.id, stickers, main: await own(project.mainImage), tab: await own(project.tabImage) })
      setIssues(res.issues); setOutDir(res.outputDir)
    } catch (e) {
      setIssues([{ level: 'error', target: 'export', message: e instanceof Error ? e.message : String(e) }])
    } finally { setBusy(false) }
  }

  const label = (target: string) => {
    const i = project.stickers.findIndex((s) => s.id === target)
    return i >= 0 ? `スタンプ${String(i + 1).padStart(2, '0')}` : target
  }

  return (
    <div>
      <div className="row">
        <span>採用済み: {adopted.length}枚</span>
        <label>メイン/タブ画像の元にする採用スタンプ(専用画像が未採用のとき):
          <select value={mainSticker?.id ?? ''} onChange={(e) => onChange((p) => ({ ...p, mainStickerId: e.target.value }))}>
            {adopted.map((s) => <option key={s.id} value={s.id}>{label(s.id)} {s.text}</option>)}
          </select>
        </label>
        <button className="primary" disabled={busy} onClick={run}>検証して書き出し</button>
      </div>
      {outDir && <p>書き出しました: {outDir}</p>}
      <ul>
        {issues.map((i, k) => <li key={k} className={`issue-${i.level}`}>[{i.level === 'error' ? 'エラー' : '警告'}] {label(i.target)}: {i.message}</li>)}
      </ul>
    </div>
  )
}
