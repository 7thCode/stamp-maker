import { useEffect, useState } from 'react'
import type { Project } from '../../shared/types'

interface Props {
  project: Project
  onChange: (fn: (p: Project) => Project) => void
  onReplace: (p: Project) => void
}

export function SetupTab({ project, onChange, onReplace }: Props) {
  const [thumbs, setThumbs] = useState<string[]>([])
  const [generators, setGenerators] = useState<Array<{ id: string; label: string }>>([])

  useEffect(() => {
    Promise.all(project.referenceImages.map((r) => window.stamp.readImage(project.id, r))).then(setThumbs)
  }, [project.id, project.referenceImages])
  useEffect(() => { window.stamp.listGenerators().then(setGenerators) }, [])

  const importRefs = async () => {
    const next = await window.stamp.importReferences(project.id)
    if (next) onReplace(next)
  }
  const setChar = (key: 'name' | 'keepTraits' | 'notes', value: string) =>
    onChange((p) => ({ ...p, character: { ...p.character, [key]: value } }))

  return (
    <div>
      <h3>参考画像(PNG・JPEG)</h3>
      <div className="row refs">
        {thumbs.map((t, i) => <img key={project.referenceImages[i]} src={t} alt={`参考画像${i + 1}`} />)}
        <button onClick={importRefs}>画像を追加…</button>
      </div>
      <h3>キャラクター設定</h3>
      <label className="field">名前<input type="text" value={project.character.name} onChange={(e) => setChar('name', e.target.value)} /></label>
      <label className="field">維持したい特徴(顔・配色・服装・画風)<textarea rows={3} value={project.character.keepTraits} onChange={(e) => setChar('keepTraits', e.target.value)} /></label>
      <label className="field">メモ<textarea rows={2} value={project.character.notes} onChange={(e) => setChar('notes', e.target.value)} /></label>
      <h3>生成方式</h3>
      <select value={project.generator} onChange={(e) => onChange((p) => ({ ...p, generator: e.target.value }))}>
        {generators.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      <p className="warn">ローカル/クラウドの画像生成モデルは先行検証後に追加されます。</p>
    </div>
  )
}
