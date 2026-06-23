import { useReferrals } from '../../hooks/useReferrals'
import { STAGES, PIPELINE } from '../../lib/constants'
import { Stat, Spinner } from '../../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'

export default function HRDashboard() {
  const { rows, loading } = useReferrals()
  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  const total    = rows.length
  const accepted = rows.filter(r => r.stage === 'accepted').length
  const rejected = rows.filter(r => r.stage === 'rejected').length
  const ratio    = rejected === 0 ? (accepted > 0 ? '∞' : '0') : (accepted / rejected).toFixed(2)

  // pipeline timeline — how many in each stage right now
  const timeline = PIPELINE.map(s => ({
    stage: STAGES[s].label,
    color: STAGES[s].color,
    count: rows.filter(r => r.stage === s).length,
  }))

  // per-BL breakdown: inbox / accepted / rejected
  const byBl = {}
  rows.forEach(r => {
    const name = r.referrer?.full_name || r.branch || 'Unknown'
    byBl[name] ??= { name, referred: 0, inbox: 0, accepted: 0, rejected: 0 }
    byBl[name].referred++
    if (r.stage === 'inbox')    byBl[name].inbox++
    if (r.stage === 'accepted') byBl[name].accepted++
    if (r.stage === 'rejected') byBl[name].rejected++
  })
  const blRows   = Object.values(byBl).sort((a, b) => b.referred - a.referred)
  const blChart  = blRows.map(b => ({
    name:     b.name,
    Inbox:    b.inbox,
    Accepted: b.accepted,
    Rejected: b.rejected,
  }))

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">HR overview</div>
        <h1 className="font-display text-3xl font-700 mt-1">Dashboard</h1>
      </header>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Referred by BLs" value={total} />
        <Stat label="Total accepted"  value={accepted} accent="#1f7a5a" />
        <Stat label="Total rejected"  value={rejected} accent="#c8462e" />
        <Stat label="Accept : Reject" value={ratio}    accent="#3b5bff" sub="accepted ÷ rejected" />
      </div>

      {/* ── Applications per BL bar chart ── */}
      <section className="ledger p-6">
        <h2 className="font-display text-lg font-700 mb-1">Applications by branch leader</h2>
        <p className="text-sm text-gray-500 mb-4">
          Inbox, accepted and rejected count per BL.
        </p>
        {blChart.length === 0
          ? <p className="text-sm text-gray-500">No data yet.</p>
          : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blChart} margin={{ left: -20, right: 8 }} barCategoryGap="30%">
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    interval={0}
                    angle={blChart.length > 4 ? -25 : 0}
                    textAnchor={blChart.length > 4 ? 'end' : 'middle'}
                    height={blChart.length > 4 ? 50 : 30}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#00000008' }} />
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  />
                  <Bar dataKey="Inbox"    fill="#6b7280" radius={[3,3,0,0]} />
                  <Bar dataKey="Accepted" fill="#1f7a5a" radius={[3,3,0,0]} />
                  <Bar dataKey="Rejected" fill="#c8462e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }
      </section>

      {/* ── Pipeline timeline ── */}
      <section className="ledger p-6">
        <h2 className="font-display text-lg font-700 mb-1">Pipeline timeline</h2>
        <p className="text-sm text-gray-500 mb-4">How many applications sit in each stage right now.</p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} margin={{ left: -20 }}>
              <XAxis dataKey="stage" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#00000008' }} />
              <Bar dataKey="count" radius={[3,3,0,0]}>
                {timeline.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── By BL table ── */}
      <section className="ledger overflow-hidden">
        <div className="p-6 pb-3">
          <h2 className="font-display text-lg font-700">By branch leader</h2>
          <p className="text-sm text-gray-500">Accepted-to-rejected ratio per referrer.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f0efe9] text-left font-mono text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Branch leader</th>
              <th className="px-4 py-3 text-center">Referred</th>
              <th className="px-4 py-3 text-center">Inbox</th>
              <th className="px-4 py-3 text-center">Accepted</th>
              <th className="px-4 py-3 text-center">Rejected</th>
              <th className="px-6 py-3 text-center">A:R</th>
            </tr>
          </thead>
          <tbody>
            {blRows.map(b => (
              <tr key={b.name} className="border-t border-[#eee]">
                <td className="px-6 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-center">{b.referred}</td>
                <td className="px-4 py-3 text-center text-gray-500">{b.inbox}</td>
                <td className="px-4 py-3 text-center text-moss font-medium">{b.accepted}</td>
                <td className="px-4 py-3 text-center text-clay font-medium">{b.rejected}</td>
                <td className="px-6 py-3 text-center font-mono">
                  {b.rejected === 0 ? (b.accepted > 0 ? '∞' : '—') : (b.accepted / b.rejected).toFixed(2)}
                </td>
              </tr>
            ))}
            {blRows.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
