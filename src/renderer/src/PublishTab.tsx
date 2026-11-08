import { useState } from 'react'
import { PUBLISH_CHECKLIST, pendingChecks } from '../../shared/publish'
import type { Project, SalesInfo } from '../../shared/types'

interface Props { project: Project; onChange: (fn: (p: Project) => Project) => void }

const COPY_FIELDS: Array<[keyof SalesInfo, string]> = [
  ['title', 'タイトル'], ['creatorName', 'クリエイター名'], ['description', '説明文'], ['copyright', 'コピーライト']
]

const STEPS = [
  '「検証・出力」タブで書き出す(ダウンロードフォルダに画像と stamps.zip ができます)',
  '下のボタンで LINE Creators Market を開き、ログインして新しいスタンプを登録する',
  '販売情報(タイトル・説明文・クリエイター名・コピーライト)を、下のコピーボタンで貼り付ける',
  '書き出した画像をアップロードし、プレビューで文字や見切れを確認する',
  '内容を確認して審査をリクエストする(最後の操作はご自身で行います)'
]

export function PublishTab({ project, onChange }: Props) {
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')
  const checks = project.publishChecks ?? {}
  const pending = pendingChecks(checks)

  const toggle = (id: string, value: boolean) =>
    onChange((p) => ({ ...p, publishChecks: { ...(p.publishChecks ?? {}), [id]: value } }))

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key); setError('')
    } catch {
      setError('コピーできませんでした。テキストを選択して手動でコピーしてください')
    }
  }
  const open = async () => {
    try { await window.stamp.openCreatorsMarket(); setError('') }
    catch { setError('ブラウザを開けませんでした') }
  }

  return (
    <div>
      <h3>申請前チェック</h3>
      <p className={pending.length === 0 ? 'ok' : 'hint'}>
        {pending.length === 0 ? 'すべて確認済みです' : `未確認: ${pending.length}件`}
      </p>
      <ul className="checklist">
        {PUBLISH_CHECKLIST.map((item, i) => (
          <li key={item.id}>
            {item.group !== PUBLISH_CHECKLIST[i - 1]?.group && <div className="check-group">{item.group}</div>}
            <label>
              <input type="checkbox" checked={!!checks[item.id]} onChange={(e) => toggle(item.id, e.target.checked)} />
              {item.label}
            </label>
            <small className="checkhint">{item.hint}</small>
          </li>
        ))}
      </ul>

      <h3>販売情報のコピー</h3>
      <table>
        <tbody>
          {COPY_FIELDS.map(([key, label]) => (
            <tr key={key}>
              <th>{label}</th>
              <td className="copy-value">{project.sales[key] || <small>(未入力)</small>}</td>
              <td>
                <button disabled={!project.sales[key]} onClick={() => copy(key, project.sales[key])}>
                  {copied === key ? 'コピーしました' : 'コピー'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>申請の流れ(目安)</h3>
      <ol>{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
      <div className="row">
        <button className="primary" onClick={open}>LINE Creators Market を開く</button>
        <small>画面や手順は LINE 側の変更で変わることがあります。最新の案内に従ってください。</small>
      </div>
      {error && <p className="warn">{error}</p>}
    </div>
  )
}
