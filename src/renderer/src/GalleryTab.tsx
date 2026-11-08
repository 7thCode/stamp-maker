import { useCallback, useEffect, useRef, useState } from 'react'
import type { Project, Sticker, StickerStatus } from '../../shared/types'
import { fontOptions } from '../../shared/fonts'
import { imageSlots, updateSlot } from '../../shared/project'
import { isFontAvailable } from './compose'
import { StickerCanvas } from './StickerCanvas'

interface Props {
  project: Project
  onChange: (fn: (p: Project) => Project) => void
  onReplace: (p: Project) => void
}

const ELAPSED_TICK_MS = 1000

// 生成を始めてからの経過秒数(生成中だけ表示する)
function Elapsed() {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => setSec(Math.floor((Date.now() - started) / 1000)), ELAPSED_TICK_MS)
    return () => clearInterval(id)
  }, [])
  return <>{sec}秒</>
}

// 書体の使用可否は起動中に変わらないので、結果を覚えておく
const fontAvailability = new Map<string, boolean>()
function fontAvailable(family: string): boolean {
  const known = fontAvailability.get(family)
  if (known !== undefined) return known
  const result = isFontAvailable(family)
  fontAvailability.set(family, result)
  return result
}

const STATUS_LABEL: Record<StickerStatus, string> = { unchecked: '未確認', adopted: '採用', needsFix: '要修正' }

function Card({ project, sticker, title, textless, busy, generating, onChange, onGenerate, onReplace }: {
  project: Project; sticker: Sticker; busy: boolean; generating: boolean
  // メイン画像・タブ画像の枠のとき、見出しを付け、文字の設定を隠す
  title?: string; textless?: boolean
  onChange: Props['onChange']; onGenerate: (id: string) => void; onReplace: Props['onReplace']
}) {
  const [overflow, setOverflow] = useState(false)
  const [dark, setDark] = useState(false)
  const setOverflowStable = useCallback((v: boolean) => setOverflow(v), [])
  const patch = (fields: Partial<Sticker>) => onChange((p) => updateSlot(p, sticker.id, fields))
  const style = (fields: Partial<Sticker['textStyle']>) => patch({ textStyle: { ...sticker.textStyle, ...fields } })

  return (
    <div className={`card ${sticker.status} ${dark ? 'dark' : ''}`}>
      {title && <div className="card-title">{title}</div>}
      <div className="canvas-wrap">
        <StickerCanvas projectId={project.id} sticker={sticker} onOverflow={setOverflowStable} />
        {generating && (
          <div className="generating" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>生成中… <Elapsed /></span>
          </div>
        )}
      </div>
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
      {!textless && <details className="text-style">
        <summary>文字の設定</summary>
        <label className="field">書体
          <select value={sticker.textStyle.fontFamily} onChange={(e) => style({ fontFamily: e.target.value })}>
            {fontOptions(fontAvailable, sticker.textStyle.fontFamily).map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
          </select>
        </label>
        <label className="slider">サイズ<input type="range" min={16} max={80} value={sticker.textStyle.fontSize} onChange={(e) => style({ fontSize: Number(e.target.value) })} /><output>{sticker.textStyle.fontSize}</output></label>
        <label className="slider">上下位置<input type="range" min={0.1} max={0.95} step={0.01} value={sticker.textStyle.y} onChange={(e) => style({ y: Number(e.target.value) })} /><output>{Math.round(sticker.textStyle.y * 100)}%</output></label>
        <label className="slider">左右位置<input type="range" min={0.1} max={0.9} step={0.01} value={sticker.textStyle.x} onChange={(e) => style({ x: Number(e.target.value) })} /><output>{Math.round(sticker.textStyle.x * 100)}%</output></label>
        <div className="row">
          <label>文字色<input type="color" value={sticker.textStyle.color} onChange={(e) => style({ color: e.target.value })} /></label>
          <label>縁の色<input type="color" value={sticker.textStyle.strokeColor} onChange={(e) => style({ strokeColor: e.target.value })} /></label>
        </div>
        <label className="slider">縁の太さ<input type="range" min={0} max={16} value={sticker.textStyle.strokeWidth} onChange={(e) => style({ strokeWidth: Number(e.target.value) })} /><output>{sticker.textStyle.strokeWidth}</output></label>
      </details>}
      {sticker.job === 'failed' && <div className="warn">生成に失敗しました</div>}
    </div>
  )
}

export function GalleryTab({ project, onChange, onReplace }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null)
  const cancelRef = useRef(false)

  const generateOne = useCallback(async (stickerId: string) => {
    setBusy(true); setError(''); setGeneratingId(stickerId)
    try { onReplace(await window.stamp.generateSticker(project.id, stickerId)) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); onReplace(await window.stamp.loadProject(project.id)) }
    finally { setBusy(false); setGeneratingId(null) }
  }, [project.id, onReplace])

  // 未生成・失敗分のみ順次生成。採用済みは対象外。キャンセル可。
  const generateAll = async () => {
    cancelRef.current = false
    const targets = imageSlots(project).filter((s) => s.status !== 'adopted' && !(s.imagePath && s.job !== 'failed'))
    setBusy(true); setError(''); setBatch({ done: 0, total: targets.length })
    for (const [i, s] of targets.entries()) {
      if (cancelRef.current) break
      setGeneratingId(s.id)
      try { onReplace(await window.stamp.generateSticker(project.id, s.id)) }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); onReplace(await window.stamp.loadProject(project.id)) }
      setBatch({ done: i + 1, total: targets.length })
    }
    setBusy(false); setGeneratingId(null); setBatch(null)
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
      {busy && (
        <div className="progress-area" role="status">
          <div className={batch ? 'progress' : 'progress indeterminate'}>
            <div className="progress-bar" style={batch ? { width: `${(batch.done / batch.total) * 100}%` } : undefined} />
          </div>
          <span className="hint">{batch ? `生成中 ${Math.min(batch.done + 1, batch.total)} / ${batch.total} 枚目(1枚あたり30秒ほど)` : '生成中…(30秒ほどかかります)'}</span>
        </div>
      )}
      <div className="grid">
        {project.stickers.map((s) => (
          <Card key={s.id} project={project} sticker={s} busy={busy} generating={generatingId === s.id} onChange={onChange} onGenerate={generateOne} onReplace={onReplace} />
        ))}
      </div>
      <h3>メイン画像・タブ画像</h3>
      <p className="hint">LINEに登録する代表画像です。メインは240×240、タブは96×74で書き出します(余白を詰めて枠いっぱいに収めます)。表情とポーズは「構成・文言」で変更できます。</p>
      <div className="grid">
        <Card key={project.mainImage.id} title="メイン画像(240×240)" textless project={project} sticker={project.mainImage} busy={busy} generating={generatingId === project.mainImage.id} onChange={onChange} onGenerate={generateOne} onReplace={onReplace} />
        <Card key={project.tabImage.id} title="タブ画像(96×74)" textless project={project} sticker={project.tabImage} busy={busy} generating={generatingId === project.tabImage.id} onChange={onChange} onGenerate={generateOne} onReplace={onReplace} />
      </div>
    </div>
  )
}
