import { useState } from 'react'
import { LINE_SPEC } from '../../shared/lineSpec'
import { resizeStickers, updateSlot } from '../../shared/project'
import type { Project, Sticker } from '../../shared/types'

interface Props {
  project: Project
  onChange: (fn: (p: Project) => Project) => void
  onReplace: (p: Project) => void
}

export function PlanTab({ project, onChange, onReplace }: Props) {
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const translate = async () => {
    setTranslating(true); setError('')
    try { onReplace(await window.stamp.translatePrompts(project.id)) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setTranslating(false) }
  }
  const setCount = (count: number) =>
    onChange((p) => ({ ...p, stickerCount: count, stickers: resizeStickers(p.stickers, count, () => crypto.randomUUID()) }))
  const patch = (id: string, fields: Partial<Sticker>) => onChange((p) => updateSlot(p, id, fields))
  const move = (index: number, delta: number) =>
    onChange((p) => {
      const to = index + delta
      if (to < 0 || to >= p.stickers.length) return p
      const list = [...p.stickers]
      ;[list[index], list[to]] = [list[to], list[index]]
      return { ...p, stickers: list }
    })

  return (
    <div>
      <div className="row">
        枚数:
        <select value={project.stickerCount} onChange={(e) => setCount(Number(e.target.value))}>
          {LINE_SPEC.allowedStickerCounts.map((n) => <option key={n} value={n}>{n}枚</option>)}
        </select>
        <button disabled={translating} onClick={translate}>
          {translating ? '英訳中…(初回は数分かかることがあります)' : '表情・ポーズを英訳(Ollama)'}
        </button>
        {error && <span className="warn">{error}</span>}
      </div>
      <table>
        <thead><tr><th>番号</th><th>文言(改行可)</th><th>表情</th><th>ポーズ</th><th>表情(英・生成用)</th><th>ポーズ(英・生成用)</th><th>状態</th><th>並び</th></tr></thead>
        <tbody>
          {project.stickers.map((s, i) => (
            <tr key={s.id}>
              <td>{String(i + 1).padStart(2, '0')}</td>
              <td><textarea rows={1} value={s.text} onChange={(e) => patch(s.id, { text: e.target.value })} /></td>
              <td><input type="text" value={s.expression} onChange={(e) => patch(s.id, { expression: e.target.value })} /></td>
              <td><input type="text" value={s.pose} onChange={(e) => patch(s.id, { pose: e.target.value })} /></td>
              <td><input type="text" value={s.expressionEn ?? ''} onChange={(e) => patch(s.id, { expressionEn: e.target.value })} /></td>
              <td><input type="text" value={s.poseEn ?? ''} onChange={(e) => patch(s.id, { poseEn: e.target.value })} /></td>
              <td>{s.imagePath ? '画像あり' : '未生成'}</td>
              <td><button onClick={() => move(i, -1)}>↑</button><button onClick={() => move(i, 1)}>↓</button></td>
            </tr>
          ))}
          {[['メイン', project.mainImage], ['タブ', project.tabImage]].map(([label, s]) => (
            <tr key={(s as Sticker).id}>
              <td>{label as string}</td>
              <td><small>文字なし</small></td>
              <td><input type="text" value={(s as Sticker).expression} onChange={(e) => patch((s as Sticker).id, { expression: e.target.value })} /></td>
              <td><input type="text" value={(s as Sticker).pose} onChange={(e) => patch((s as Sticker).id, { pose: e.target.value })} /></td>
              <td><input type="text" value={(s as Sticker).expressionEn ?? ''} onChange={(e) => patch((s as Sticker).id, { expressionEn: e.target.value })} /></td>
              <td><input type="text" value={(s as Sticker).poseEn ?? ''} onChange={(e) => patch((s as Sticker).id, { poseEn: e.target.value })} /></td>
              <td>{(s as Sticker).imagePath ? '画像あり' : '未生成'}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">「メイン」はLINEの一覧に出る代表画像(240×240)、「タブ」はトークルームのタブに出る小さな画像(96×74)です。タブは小さいので、顔のアップがおすすめです。</p>
    </div>
  )
}
