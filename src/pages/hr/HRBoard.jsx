import { useState } from 'react'
import { useReferrals } from '../../hooks/useReferrals'
import { useAuth } from '../../context/AuthContext'
import { STAGES } from '../../lib/constants'
import { Spinner, Empty } from '../../components/ui'
import ReferralDrawer from '../../components/ReferralDrawer'
import { Inbox, Loader, Search, Hourglass, Check, X } from 'lucide-react'

const SECTIONS = [
  { key: 'inbox',            icon: Inbox },
  { key: 'inprocess',        icon: Loader },
  { key: 'background_check', icon: Search },
  { key: 'decision_pending', icon: Hourglass },
  { key: 'accepted',         icon: Check },
  { key: 'rejected',         icon: X },
]

// best-effort name: profile full_name → branch → email fragment → 'Unknown'
function blName(r) {
  if (r.referrer?.full_name) return r.referrer.full_name
  if (r.referrer?.branch)    return r.referrer.branch
  if (r.branch)              return r.branch
  return 'Unknown'
}

export default function HRBoard() {
  const { rows, loading } = useReferrals()
  const { profile } = useAuth()
  const [tab, setTab] = useState('inbox')
  const [sel, setSel] = useState(null)

  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  // hide applications that are pending BL's OJE — those live in BL inbox
  const hrRows    = rows.filter(r => !r.bl_oje_pending)
  const inSection = (r, key) => key === 'inbox' ? r.stage === 'inbox' : r.stage === key
  const visible   = hrRows.filter(r => inSection(r, tab))
  const count     = (key) => hrRows.filter(r => inSection(r, key)).length

  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">HR pipeline</div>
        <h1 className="font-display text-3xl font-700 mt-1">Application board</h1>
      </header>

      {/* ── Stage tabs ── */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ key, icon: Icon }) => {
          const s      = STAGES[key]
          const active = tab === key
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium border transition ${
                active ? 'bg-ink text-paper border-ink' : 'bg-white border-[#d8d6cf] hover:border-ink'
              }`}>
              <Icon size={15} style={{ color: active ? '#fff' : s.color }} />
              {s.label}
              <span className={`font-mono text-xs px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-[#f0efe9]'}`}>
                {count(key)}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Cards ── */}
      {visible.length === 0
        ? <Empty
            title={`Nothing in ${STAGES[tab]?.label?.toLowerCase() || tab}`}
            hint={tab === 'inbox'
              ? 'New referrals from branch leaders appear here.'
              : 'Move applications here as they progress.'}
          />
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(r => (
              <button key={r.id} onClick={() => setSel(r)}
                className="ledger p-4 text-left hover:border-accent transition">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-display font-700 truncate">{r.candidate_name}</div>
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* position */}
                <div className="text-sm text-gray-600 truncate mt-0.5">
                  {r.position || '—'}
                </div>

                <div className="mt-3 pt-3 border-t border-[#eee] flex justify-between items-center text-xs text-gray-500">
                  {/* BL name — always visible */}
                  <span className="font-medium text-gray-700">
                    by {blName(r)}
                  </span>
                  {/* claimed by */}
                  {r.claimer?.full_name && (
                    <span className="text-gray-400 truncate ml-2">
                      · {r.claimer.full_name}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      }

      {sel && (
        <ReferralDrawer
          referral={sel}
          onClose={() => setSel(null)}
          canAct={true}
        />
      )}
    </div>
  )
}
