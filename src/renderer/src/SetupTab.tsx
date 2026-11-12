import { useEffect, useState } from 'react'
import type { Project } from '../../shared/types'
import { ReferenceGenerator } from './ReferenceGenerator'

interface Props {
  project: Project
  onChange: (fn: (p: Project) => Project) => void
  onReplace: (p: Project) => void
}

export function SetupTab({ project, onChange, onReplace }: Props) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [generators, setGenerators] = useState<Array<{ id: string; label: string }>>([])

  useEffect(() => {
    Promise.all(project.referenceImages.map(async (r) => [r, await window.stamp.readImage(project.id, r)] as const))
      .then((pairs) => setThumbs(Object.fromEntries(pairs)))
  }, [project.id, project.referenceImages])
  useEffect(() => { window.stamp.listGenerators().then(setGenerators) }, [])

  const removeRef = async (rel: string) => {
    const next = await window.stamp.removeReference(project.id, rel)
    if (next) onReplace(next)
  }
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const translateTraits = async () => {
    setTranslating(true); setError('')
    try { setChar('keepTraitsEn', await window.stamp.translateText(project.character.keepTraits)) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setTranslating(false) }
  }
  const importRefs = async () => {
    const next = await window.stamp.importReferences(project.id)
    if (next) onReplace(next)
  }
  const setChar = (key: 'name' | 'keepTraits' | 'keepTraitsEn' | 'notes', value: string) =>
    onChange((p) => ({ ...p, character: { ...p.character, [key]: value } }))

  return (
    <div>
      <h3>参考画像(PNG・JPEG・WebP)</h3>
      <div className="row refs">
        {project.referenceImages.map((rel, i) => thumbs[rel] && (
          <span key={rel} className="ref">
            <img src={thumbs[rel]} alt={`参考画像${i + 1}`} />
            <button className="ref-remove text" title="この参考画像を削除" onClick={() => removeRef(rel)}>✕</button>
          </span>
        ))}
        <button onClick={importRefs}>画像を追加…</button>
      </div>
      {project.referenceImages.length > 1 && (
        <p className="hint">参考画像が複数ある場合は、生成のたびにランダムで1枚を使います。</p>
      )}
      <ReferenceGenerator project={project} onReplace={onReplace} />
      <h3>キャラクター設定</h3>
      <label className="field">名前<input type="text" value={project.character.name} onChange={(e) => setChar('name', e.target.value)} /></label>
      <label className="field">維持したい特徴(顔・配色・服装・画風)<textarea rows={3} value={project.character.keepTraits} onChange={(e) => setChar('keepTraits', e.target.value)} /></label>
      <div className="row">
        <button onClick={translateTraits} disabled={translating || !project.character.keepTraits.trim()}>
          {translating ? '英訳中…' : '特徴を英訳(Ollama)'}
        </button>
        <span className="hint">生成には英語が使われます。必要なら下の英語欄を直接編集できます。</span>
      </div>
      {error && <p className="warn">{error}</p>}
      <label className="field">維持したい特徴(英語・生成に使用)<textarea rows={3} value={project.character.keepTraitsEn ?? ''} onChange={(e) => setChar('keepTraitsEn', e.target.value)} /></label>
      <label className="field">メモ<textarea rows={2} value={project.character.notes} onChange={(e) => setChar('notes', e.target.value)} /></label>
      <h3>生成方式</h3>
      <select value={project.generator} onChange={(e) => onChange((p) => ({ ...p, generator: e.target.value }))}>
        {generators.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      <p className="hint">ローカル生成は表情の変更が得意で、ポーズは当たり外れがあります。気に入らない画像は再生成してください。</p>
    </div>
  )
}
