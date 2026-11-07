import { useRef, useState } from 'react'
import type { Project } from '../../shared/types'

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
  const cancelRef = useRef(false)

  const generate = async () => {
    cancelRef.current = false
    setBusy(true); setError(''); setCandidates([])
    try {
      // 日本語なら英訳してから生成する(英訳は表示して確認できる)
      setStatus('説明を英訳中…(初回は数分かかることがあります)')
      const prompt = await window.stamp.translateText(description)
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
        <button disabled={busy || !description.trim()} onClick={generate}>候補を{CANDIDATE_COUNT}枚生成</button>
        <button disabled={!busy} onClick={() => { cancelRef.current = true }}>中止</button>
        <span>{status}</span>
        {error && <span className="warn">{error}</span>}
      </div>
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
