import { useRef, useState } from 'react'
import type { Project } from '../../shared/types'
import { translateOrKeep } from '../../shared/translateFallback'

const CANDIDATE_COUNT = 4

interface Candidate { rel: string; url: string }

interface Props {
  project: Project
  onReplace: (p: Project) => void
}

// 説明文から参考画像の候補を作り、選んで取り込む
export function ReferenceGenerator({ project, onReplace }: Props) {
  const [description, setDescription] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const cancelRef = useRef(false)

  const generate = async () => {
    cancelRef.current = false
    setBusy(true); setError(''); setNotice(''); setCandidates([])
    try {
      // 日本語なら英訳してから生成する。Ollama が使えないときは、入力をそのまま使う
      setStatus('説明を英訳中…(初回は数分かかることがあります)')
      const { text: prompt, fallbackReason } = await translateOrKeep(description, window.stamp.translateText)
      if (fallbackReason) setNotice(`英訳できなかったため、入力した文章をそのまま使います(${fallbackReason})`)
      for (let i = 0; i < CANDIDATE_COUNT; i++) {
        if (cancelRef.current) break
        setStatus(`${prompt} — 生成中 ${i + 1}/${CANDIDATE_COUNT}`)
        const rel = await window.stamp.generateReferenceCandidate(project.id, prompt)
        const url = await window.stamp.readImage(project.id, rel)
        setCandidates((prev) => [...prev, { rel, url }])
      }
      setStatus('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setStatus('')
    } finally { setBusy(false) }
  }

  const adopt = async (rel: string) => {
    onReplace(await window.stamp.adoptReferenceCandidate(project.id, rel))
    setCandidates((prev) => prev.filter((c) => c.rel !== rel))
  }

  return (
    <div>
      <h3>参考画像をAIで作る</h3>
      <label className="field">
        キャラクターの説明(日本語可)
        <textarea rows={2} value={description} placeholder="例: ふわふわの白い猫。大きな目、ピンクの小さな鼻"
          onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="row">
        <button className="primary" disabled={busy || !description.trim()} onClick={generate}>候補を{CANDIDATE_COUNT}枚生成</button>
        <button disabled={!busy} onClick={() => { cancelRef.current = true }}>中止</button>
        <span>{status}</span>
        {error && <span className="warn">{error}</span>}
      </div>
      {notice && <p className="hint">{notice}。英語で入力すると、より意図に近い画像になります。</p>}
      {busy && <div className="progress indeterminate" role="status"><div className="progress-bar" /></div>}
      <div className="row refs">
        {candidates.map((c) => (
          <div key={c.rel}>
            <img src={c.url} alt="参考画像の候補" /><br />
            <button onClick={() => adopt(c.rel)}>参考画像にする</button>
          </div>
        ))}
      </div>
    </div>
  )
}
