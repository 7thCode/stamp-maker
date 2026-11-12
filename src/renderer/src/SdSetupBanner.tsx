import { useEffect, useState } from 'react'
import type { SdSetupState } from '../../shared/api'

// 画像生成の環境(sd-cli・モデル)を用意している間と、失敗したときに画面上部へ出す
export function SdSetupBanner() {
  const [state, setState] = useState<SdSetupState | null>(null)
  useEffect(() => {
    let alive = true
    window.stamp.getSdSetup().then((s) => { if (alive) setState((prev) => prev ?? s) })
    const off = window.stamp.onSdSetup(setState)
    return () => { alive = false; off() }
  }, [])

  if (!state || state.phase === 'ready') return null
  if (state.phase === 'failed') {
    return (
      <div className="setup-banner failed" role="alert">
        <div className="setup-title">画像生成の準備ができていません</div>
        <div className="warn setup-detail">{state.error}</div>
        <button className="primary" onClick={() => { window.stamp.retrySdSetup() }}>再試行</button>
      </div>
    )
  }
  return (
    <div className="setup-banner" role="status">
      <div className="setup-title">画像生成のモデルを取得しています(初回のみ。約8.5GB、数十分かかることがあります)</div>
      {state.progress === undefined
        ? <div className="progress indeterminate"><div className="progress-bar" /></div>
        : <div className="progress"><div className="progress-bar" style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>}
      <div className="hint">{state.step}{state.detail ? `  ${state.detail}` : ''}</div>
      <div className="hint">準備中も、プロジェクトの作成や文言の編集はできます。画像の生成は準備が終わってからです。</div>
    </div>
  )
}
