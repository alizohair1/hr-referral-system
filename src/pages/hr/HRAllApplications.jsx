import { useState, useMemo } from 'react'
import { useReferrals } from '../../hooks/useReferrals'
import { STAGES } from '../../lib/constants'
import { Spinner, StageBadge } from '../../components/ui'
import ReferralDrawer from '../../components/ReferralDrawer'
import { Search, X, Download } from 'lucide-react'

function blName(r) {
  if (r.referrer?.full_name) return r.referrer.full_name
  if (r.referrer?.branch)    return r.referrer.branch
  if (r.branch)              return r.branch
  return '—'
}

// safely extract a plain value from a stored answer {type,label,value} or raw value
function val(answers, fieldId) {
  const a = answers?.[fieldId]
  if (a == null) return ''
  if (typeof a === 'object' && 'value' in a) return a.value ?? ''
  return a
}

// CSV download — Interview Form fields only
const IV_COLUMNS = [
  { header: 'Name',                      fn: (r) => r.candidate_name },
  { header: 'Contact #',                 fn: (r) => val(r.answers, 'iv_contact') },
  { header: 'Grooming',                  fn: (r) => val(r.answers, 'iv_grooming') },
  { header: 'Interpersonal Savvy',       fn: (r) => val(r.answers, 'iv_interpersonal') },
  { header: 'Integrity and Trust',       fn: (r) => val(r.answers, 'iv_integrity') },
  { header: 'Growth Mindset (HDNA)',     fn: (r) => val(r.answers, 'iv_growth_mindset') },
  { header: 'Customer Centricity (HDNA)',fn: (r) => val(r.answers, 'iv_customer') },
  { header: 'Section',                   fn: (r) => val(r.answers, 'iv_section') },
  { header: 'Full Time / Part Time',     fn: (r) => val(r.answers, 'iv_employment_type') },
  { header: 'Recommended Branch',        fn: (r) => val(r.answers, 'iv_recommended_branch') },
  { header: 'Position',                  fn: (r) => val(r.answers, 'iv_position') },
  { header: 'Total Score (%)',           fn: (r) => val(r.answers, 'iv_total_marks') },
  { header: 'Education',                 fn: (r) => val(r.answers, 'iv_education') },
  { header: 'Comments',                  fn: (r) => val(r.answers, 'iv_comments') },
  { header: 'Additional Remarks',        fn: (r) => val(r.answers, 'iv_additional') },
]

function escapeCSV(v) {
  const s = String(v ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCSV(rows) {
  const header = IV_COLUMNS.map(c => escapeCSV(c.header)).join(',')
  const body   = rows.map(r => IV_COLUMNS.map(c => escapeCSV(c.fn(r))).join(',')).join('\n')
  const csv    = `${header}\n${body}`
  const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `applications_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ALL = 'all'

export default function HRAllApplications() {
  const { rows, loading }           = useReferrals()
  const [sel, setSel]               = useState(null)
  const [selected, setSelected]     = useState(new Set()) // selected row ids
  const [search, setSearch]         = useState('')
  const [stage, setStage]           = useState(ALL)
  const [branch, setBranch]         = useState(ALL)
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const branches = useMemo(() => {
    const set = new Set()
    rows.forEach(r => { const b = r.referrer?.branch || r.branch; if (b) set.add(b) })
    return [...set].sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (stage !== ALL && r.stage !== stage) return false
      if (branch !== ALL) {
        const b = r.referrer?.branch || r.branch || ''
        if (b !== branch) return false
      }
      if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23,59,59,999)
        if (new Date(r.created_at) > end) return false
      }
      if (search.trim()) {
        const q    = search.toLowerCase()
        const name = r.candidate_name?.toLowerCase() || ''
        const bl   = blName(r).toLowerCase()
        const pos  = (r.position || '').toLowerCase()
        if (!name.includes(q) && !bl.includes(q) && !pos.includes(q)) return false
      }
      return true
    })
  }, [rows, stage, branch, dateFrom, dateTo, search])

  function clearFilters() {
    setSearch(''); setStage(ALL); setBranch(ALL); setDateFrom(''); setDateTo('')
  }

  // selection helpers
  const allFilteredIds   = filtered.map(r => r.id)
  const allSelected      = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected     = allFilteredIds.some(id => selected.has(id))
  const selectedCount    = allFilteredIds.filter(id => selected.has(id)).length

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.delete(id)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.add(id)); return s })
    }
  }

  function toggleOne(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function handleDownload() {
    const toDownload = filtered.filter(r => selected.has(r.id))
    if (toDownload.length === 0) return
    downloadCSV(toDownload)
  }

  const hasFilters = stage !== ALL || branch !== ALL || dateFrom || dateTo || search.trim()
  const inputCls   = 'px-3 py-2 text-sm border border-[#d8d6cf] bg-white focus:outline-none focus:border-accent'

  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-gray-500">HR panel</div>
          <h1 className="font-display text-3xl font-700 mt-1">All Applications</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} of {rows.length} applications</p>
        </div>

        {/* Download button — shown when rows are selected */}
        {someSelected && (
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium hover:bg-accent/90 transition">
            <Download size={15} />
            Download {selectedCount} selected
          </button>
        )}
      </header>

      {/* ── Filters ── */}
      <div className="ledger p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} w-full pl-9`}
            placeholder="Search by candidate, BL name, or position…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">Stage</label>
            <select className={`${inputCls} w-full`} value={stage} onChange={e => setStage(e.target.value)}>
              <option value={ALL}>All stages</option>
              {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">Branch</label>
            <select className={`${inputCls} w-full`} value={branch} onChange={e => setBranch(e.target.value)}>
              <option value={ALL}>All branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">From date</label>
            <input type="date" className={`${inputCls} w-full`} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">To date</label>
            <input type="date" className={`${inputCls} w-full`} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-clay font-mono">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="ledger overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">No applications match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f0efe9] text-left font-mono text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                      onChange={toggleAll}
                      className="cursor-pointer" />
                  </th>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Branch leader</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Claimed by</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}
                    className={`border-t border-[#eee] hover:bg-[#f9f8f5] transition ${selected.has(r.id) ? 'bg-accent/5' : ''}`}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        className="cursor-pointer" />
                    </td>
                    <td className="px-5 py-3 font-medium cursor-pointer" onClick={() => setSel(r)}>{r.candidate_name}</td>
                    <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSel(r)}>{r.position || '—'}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSel(r)}>{blName(r)}</td>
                    <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => setSel(r)}>{r.referrer?.branch || r.branch || '—'}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSel(r)}>
                      <StageBadge stage={r.bl_oje_pending ? 'sent_to_bl' : r.stage} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => setSel(r)}>{r.claimer?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-gray-400 cursor-pointer" onClick={() => setSel(r)}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sel && <ReferralDrawer referral={sel} onClose={() => setSel(null)} canAct={true} />}
    </div>
  )
}
