import { useCallback, useRef, useState } from 'react'
import type { Project, Sticker, StickerStatus } from '../../shared/types'
import { StickerCanvas } from './StickerCanvas'

interface Props {
  project: Project
  onChange: (fn: (p: Project) => Project) => void
  onReplace: (p: Project) => void
}

const STATUS_LABEL: Record<StickerStatus, string> = { unchecked: '未確認', adopted: '採用', needsFix: '要修正' }

function Card({ project, sticker, busy, onChange, onGenerate, onReplace }: {
  project: Project; sticker: Sticker; busy: boolean
  onChange: Props['onChange']; onGenerate: (id: string) => void; onReplace: Props['onReplace']
}) {
  const [overflow, setOverflow] = useState(false)
  const [dark, setDark] = useState(false)
  const setOverflowStable = useCallback((v: boolean) => setOverflow(v), [])
  const patch = (fields: Partial<Sticker>) =>
    onChange((p) => ({ ...p, stickers: p.stickers.map((s) => (s.id === sticker.id ? { ...s, ...fields } : s)) }))
  const style = (fields: Partial<Sticker['textStyle']>) => patch({ textStyle: { ...sticker.textStyle, ...fields } })

  return (
    <div className={`card ${sticker.status} ${dark ? 'dark' : ''}`}>
      <StickerCanvas projectId={project.id} sticker={sticker} onOverflow={setOverflowStable} />
      {overflow && <div className="warn">文字が枠からはみ出しています</div>}
      <div className="row">
        <select value={sticker.status} onChange={(e) => patch({ status: e.target.value as StickerStatus })}>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label><input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />暗背景</label>
      </div>
      <div className="row">
        <button className="primary" disabled={busy || sticker.status === 'adopted'} onClick={() => onGenerate(sticker.id)}>
          {sticker.job === 'failed' ? '再実行' : sticker.imagePath ? '再生成' : '生成'}
        </button>
        <button onClick={async () => { const n = await window.stamp.importStickerImage(project.id, sticker.id); if (n) onReplace(n) }}>差替</button>
        <button disabled={!sticker.imagePath} onClick={async () => onReplace(await window.stamp.removeBackground(project.id, sticker.id))}>背景透過</button>
      </div>
      <div className="row">
        サイズ<input type="range" min={16} max={80} value={sticker.textStyle.fontSize} onChange={(e) => style({ fontSize: Number(e.target.value) })} />
        縦位置<input type="range" min={0.1} max={0.95} step={0.01} value={sticker.textStyle.y} onChange={(e) => style({ y: Number(e.target.value) })} />
      </div>
      <div className="row">
        <input type="color" value={sticker.textStyle.color} onChange={(e) => style({ color: e.target.value })} />
        縁<input type="color" value={sticker.textStyle.strokeColor} onChange={(e) => style({ strokeColor: e.target.value })} />
        <input type="range" min={0} max={16} value={sticker.textStyle.strokeWidth} onChange={(e) => style({ strokeWidth: Number(e.target.value) })} />
      </div>
      {sticker.job === 'failed' && <div className="warn">生成に失敗しました</div>}
    </div>
  )
}

export function GalleryTab({ project, onChange, onReplace }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cancelRef = useRef(false)

  const generateOne = useCallback(async (stickerId: string) => {
    setBusy(true); setError('')
    try { onReplace(await window.stamp.generateSticker(project.id, stickerId)) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); onReplace(await window.stamp.loadProject(project.id)) }
    finally { setBusy(false) }
  }, [project.id, onReplace])

  // 未生成・失敗分のみ順次生成。採用済みは対象外。キャンセル可。
  const generateAll = async () => {
    cancelRef.current = false
    setBusy(true); setError('')
    for (const s of project.stickers) {
      if (cancelRef.current) break
      if (s.status === 'adopted' || (s.imagePath && s.job !== 'failed')) continue
      try { onReplace(await window.stamp.generateSticker(project.id, s.id)) }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); onReplace(await window.stamp.loadProject(project.id)) }
    }
    setBusy(false)
  }

  const done = project.stickers.filter((s) => s.imagePath).length
  return (
    <div>
      <div className="row">
        <button className="primary" disabled={busy} onClick={generateAll}>未生成・失敗分を一括生成</button>
        <button disabled={!busy} onClick={() => { cancelRef.current = true }}>キャンセル</button>
        <span>{done} / {project.stickers.length} 枚 画像あり</span>
        {error && <span className="warn">{error}</span>}
      </div>
      <div className="grid">
        {project.stickers.map((s) => (
          <Card key={s.id} project={project} sticker={s} busy={busy} onChange={onChange} onGenerate={generateOne} onReplace={onReplace} />
        ))}
      </div>
    </div>
  )
}
