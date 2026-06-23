import { STAGES } from '../lib/constants'

export function StageBadge({ stage }) {
  const s = STAGES[stage] || { label: stage, color: '#6b7280' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium font-mono uppercase tracking-wide"
      style={{ color: s.color, background: s.color + '14', border: `1px solid ${s.color}33` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function Stat({ label, value, accent = '#13161c', sub }) {
  return (
    <div className="ledger p-5">
      <div className="font-mono text-xs uppercase tracking-widest text-gray-500">{label}</div>
      <div className="font-display text-4xl font-700 mt-2" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-ink text-paper hover:bg-accent',
    ghost: 'bg-transparent text-ink border border-[#d8d6cf] hover:bg-white',
    accept: 'bg-moss text-white hover:opacity-90',
    reject: 'bg-clay text-white hover:opacity-90',
  }
  return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>
}

export function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-wide text-gray-600">
        {label}{required && <span className="text-clay"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export const inputCls =
  'w-full px-3 py-2.5 bg-white border border-[#d8d6cf] text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export function Spinner() {
  return <div className="w-5 h-5 border-2 border-gray-300 border-t-ink rounded-full animate-spin" />
}

export function Empty({ title, hint }) {
  return (
    <div className="ledger-tight border-dashed p-10 text-center">
      <div className="font-display text-lg">{title}</div>
      {hint && <div className="text-sm text-gray-500 mt-1">{hint}</div>}
    </div>
  )
}
