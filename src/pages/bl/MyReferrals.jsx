import { useState } from 'react'
import { useReferrals } from '../../hooks/useReferrals'
import { StageBadge, Spinner, Empty } from '../../components/ui'
import ReferralDrawer from '../../components/ReferralDrawer'

export default function MyReferrals() {
  const { rows, loading } = useReferrals()
  const [sel, setSel] = useState(null)
  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">All time</div>
        <h1 className="font-display text-3xl font-700 mt-1">My referrals</h1>
      </header>

      {rows.length === 0
        ? <Empty title="No referrals yet" hint="Use “Refer candidate” to send your first one." />
        : <div className="ledger overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f0efe9] text-left font-mono text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Position</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 hidden md:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} onClick={() => setSel(r)}
                    className="border-t border-[#eee] hover:bg-[#faf9f5] cursor-pointer">
                    <td className="px-4 py-3 font-medium">{r.candidate_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{r.position}</td>
                    <td className="px-4 py-3"><StageBadge stage={r.stage} /></td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}

      {sel && <ReferralDrawer referral={sel} onClose={() => setSel(null)} canAct={false} />}
    </div>
  )
}
