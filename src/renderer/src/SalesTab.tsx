import { LINE_SPEC } from '../../shared/lineSpec'
import type { Project, SalesInfo } from '../../shared/types'
import { lineTextWeight } from '../../shared/validate'

interface Props { project: Project; onChange: (fn: (p: Project) => Project) => void }

const FIELDS: Array<[keyof SalesInfo, string, number, boolean]> = [
  ['title', 'タイトル', LINE_SPEC.text.title, false],
  ['creatorName', 'クリエイター名', LINE_SPEC.text.creator, false],
  ['description', '説明文', LINE_SPEC.text.description, true],
  ['copyright', 'コピーライト(英数字のみ)', LINE_SPEC.text.copyright, false]
]

export function SalesTab({ project, onChange }: Props) {
  return (
    <div>
      {FIELDS.map(([key, label, max, multiline]) => {
        const value = project.sales[key]
        const weight = lineTextWeight(value)
        const set = (v: string) => onChange((p) => ({ ...p, sales: { ...p.sales, [key]: v } }))
        return (
          <label className="field" key={key}>
            {label}(全角=2換算 {weight}/{max})
            {multiline
              ? <textarea rows={3} value={value} onChange={(e) => set(e.target.value)} />
              : <input type="text" value={value} onChange={(e) => set(e.target.value)} />}
            {weight > max && <span className="warn">上限を超えています</span>}
          </label>
        )
      })}
    </div>
  )
}
