import { Link } from 'react-router-dom'
import { useReferrals } from '../../hooks/useReferrals'
import { Stat, Spinner, Button } from '../../components/ui'
import { FilePlus2 } from 'lucide-react'

export default function BLDashboard() {
  const { rows, loading } = useReferrals()
  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  const total = rows.length
  const accepted = rows.filter(r => r.stage === 'accepted').length
  const rejected = rows.filter(r => r.stage === 'rejected').length
  const active = total - accepted - rejected

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Branch leader</div>
          <h1 className="font-display text-3xl font-700 mt-1">Your referrals</h1>
        </div>
        <Link to="/bl/refer"><Button><FilePlus2 size={16} /> Refer candidate</Button></Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Referred" value={total} />
        <Stat label="In progress" value={active} accent="#3b5bff" />
        <Stat label="Accepted" value={accepted} accent="#1f7a5a" />
        <Stat label="Rejected" value={rejected} accent="#c8462e" />
      </div>

      <div className="ledger p-6">
        <h2 className="font-display text-lg font-700 mb-3">Recent activity</h2>
        {rows.length === 0
          ? <p className="text-sm text-gray-500">No referrals yet. Refer your first candidate to get started.</p>
          : <ul className="divide-y divide-[#eee]">
              {rows.slice(0, 6).map(r => (
                <li key={r.id} className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{r.candidate_name}</div>
                    <div className="text-xs text-gray-500">{r.position}</div>
                  </div>
                  <span className="font-mono text-xs uppercase text-gray-500">{r.stage.replace('_',' ')}</span>
                </li>
              ))}
            </ul>}
      </div>
    </div>
  )
}
