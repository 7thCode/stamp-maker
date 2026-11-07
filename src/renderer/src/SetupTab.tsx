import { useEffect, useState } from 'react'
import type { Project } from '../../shared/types'
import { ReferenceGenerator } from './ReferenceGenerator'

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
      <ReferenceGenerator project={project} onReplace={onReplace} />
      <h3>キャラクター設定</h3>
      <label className="field">名前<input type="text" value={project.character.name} onChange={(e) => setChar('name', e.target.value)} /></label>
      <label className="field">維持したい特徴(顔・配色・服装・画風)<textarea rows={3} value={project.character.keepTraits} onChange={(e) => setChar('keepTraits', e.target.value)} /></label>
      <label className="field">メモ<textarea rows={2} value={project.character.notes} onChange={(e) => setChar('notes', e.target.value)} /></label>
      <h3>生成方式</h3>
      <select value={project.generator} onChange={(e) => onChange((p) => ({ ...p, generator: e.target.value }))}>
        {generators.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      <p className="warn">ローカル生成は表情の変更が得意で、ポーズは当たり外れがあります。気に入らない画像は再生成してください。</p>
    </div>
  )
}
