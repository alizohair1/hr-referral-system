import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { OJE_FIELDS, OJE_RATING_IDS, OJE_SCORE_FORMULA, STAGES } from '../../lib/constants'
import { StageBadge, Button, Field, inputCls, Spinner, Empty } from '../../components/ui'
import { X, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect as useEff } from 'react'

// ─── Rating widget ────────────────────────────────────────────────────────────
function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-9 h-9 rounded border text-sm font-mono font-600 transition
            ${value >= n
              ? 'bg-accent text-white border-accent'
              : 'bg-white text-gray-400 border-[#d8d6cf] hover:border-accent hover:text-accent'}`}>
          {n}
        </button>
      ))}
      {value > 0 && (
        <button type="button" onClick={() => onChange(0)}
          className="ml-2 text-xs text-gray-400 hover:text-clay underline">clear</button>
      )}
    </div>
  )
}

// ─── Auto score display ───────────────────────────────────────────────────────
function AutoScoreDisplay({ value, max }) {
  const filled = value != null && value !== ''
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded border ${
      filled ? 'bg-moss/10 border-moss/30' : 'bg-[#f9f8f5] border-[#e4e2db]'
    }`}>
      <span className={`font-display text-xl font-700 ${filled ? 'text-moss' : 'text-gray-300'}`}>
        {filled ? value : '—'}
      </span>
      <span className="text-xs text-gray-500">out of {max} · auto-calculated</span>
    </div>
  )
}

// ─── OJE Form (BL fills this inside the drawer) ───────────────────────────────
function OJEForm({ referral, onSubmitted }) {
  const [answers, setAnswers] = useState({})
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [open, setOpen]       = useState(true)

  const setAns = (id) => (val) => setAnswers((a) => ({ ...a, [id]: val }))

  // auto-calculate OJE overall score
  useEffect(() => {
    const vals      = OJE_RATING_IDS.map((id) => Number(answers[id]) || 0)
    const allFilled = vals.every((v) => v > 0)
    if (allFilled) {
      setAnswers((a) => ({ ...a, oje_overall: OJE_SCORE_FORMULA(vals.reduce((x, y) => x + y, 0)) }))
    } else {
      setAnswers((a) => ({ ...a, oje_overall: '' }))
    }
  }, [
    answers.oje_grasp, answers.oje_energy, answers.oje_hygiene,
    answers.oje_listening, answers.oje_patience, answers.oje_teamwork, answers.oje_willingness,
  ])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    // validate required OJE fields (skip auto_score)
    for (const f of OJE_FIELDS) {
      if (!f.required || f.type === 'auto_score') continue
      const v     = answers[f.id]
      const empty = v == null || v === '' || v === 0
      if (empty) return setErr(`Please fill: ${f.label}`)
    }

    setBusy(true)
    try {
      // build OJE snapshot
      const ojeSnapshot = {}
      for (const f of OJE_FIELDS) {
        const v = answers[f.id]
        if (v !== undefined && v !== '' && v !== 0) {
          ojeSnapshot[f.id] = { label: f.label, type: f.type, value: v }
        }
      }

      // merge OJE answers into existing answers, clear bl_oje_pending, move to inbox for HR
      const { data: current } = await supabase
        .from('referrals').select('answers').eq('id', referral.id).single()

      const merged = { ...(current?.answers || {}), ...ojeSnapshot }

      const { error } = await supabase.from('referrals')
        .update({
          answers:        merged,
          bl_oje_pending: false,
          stage:          'inbox', // goes back to HR inbox
        })
        .eq('id', referral.id)

      if (error) throw error
      onSubmitted?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500 mb-2 hover:text-accent transition">
        <span>OJE Form — fill and send back to HR</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <form onSubmit={submit} className="ledger-tight p-4 space-y-4">
          {OJE_FIELDS.map((f) => {
            if (f.type === 'auto_score') return (
              <div key={f.id}>
                <div className="font-mono text-[10px] uppercase tracking-wide text-gray-500 mb-1">{f.label}</div>
                <AutoScoreDisplay value={answers[f.id]} max={40} />
              </div>
            )
            return (
              <div key={f.id}>
                <label className="block font-mono text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                  {f.label}{f.required && <span className="text-clay"> *</span>}
                </label>
                {f.type === 'rating' && (
                  <RatingInput value={answers[f.id] ?? 0} onChange={setAns(f.id)} />
                )}
                {f.type === 'dropdown' && (
                  <select className={inputCls} value={answers[f.id] ?? ''}
                    onChange={(e) => setAns(f.id)(e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {f.type === 'date' && (
                  <input type="date" className={inputCls} value={answers[f.id] ?? ''}
                    onChange={(e) => setAns(f.id)(e.target.value)} />
                )}
                {f.type === 'number' && (
                  <input type="number" className={inputCls} value={answers[f.id] ?? ''}
                    onChange={(e) => setAns(f.id)(e.target.value)} />
                )}
                {f.type === 'long_text' && (
                  <textarea className={inputCls} rows={3} value={answers[f.id] ?? ''}
                    onChange={(e) => setAns(f.id)(e.target.value)} />
                )}
                {f.type === 'short_text' && (
                  <input type="text" className={inputCls} value={answers[f.id] ?? ''}
                    onChange={(e) => setAns(f.id)(e.target.value)} />
                )}
              </div>
            )
          })}

          {err && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{err}</div>}
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : 'Submit OJE & send back to HR'}
          </Button>
        </form>
      )}
    </section>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function InboxDrawer({ referral, onClose, onSubmitted }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!referral) return
    supabase.from('referral_events')
      .select('*, actor:actor_id(full_name)')
      .eq('referral_id', referral.id).order('created_at')
      .then(({ data }) => setEvents(data ?? []))
  }, [referral])

  if (!referral) return null

  // show HR's interview answers (what HR filled when creating)
  const rawAnswers = referral.answers && typeof referral.answers === 'object' ? referral.answers : {}
  const hrEntries  = Object.entries(rawAnswers)
    .filter(([k]) => k !== 'hr_interview')
    .map(([, v]) => v)
    .filter((a) => a && a.value != null && a.value !== '')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper h-full overflow-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-ink text-paper px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-700">{referral.candidate_name}</div>
            <div className="text-white/60 text-sm">Sent by HR · OJE required</div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">

          {/* Status banner */}
          <div className="bg-accent/10 border border-accent/30 px-4 py-3 text-sm text-accent font-medium rounded">
            HR has sent this candidate for OJE evaluation. Fill the OJE form below and send back.
          </div>

          {/* HR Interview answers (read-only) */}
          {hrEntries.length > 0 && (
            <section>
              <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">HR Interview Details</h3>
              <div className="ledger-tight p-4 space-y-1">
                {hrEntries.map((a, i) => (
                  <div key={i} className="flex justify-between gap-4 py-2 border-b border-[#eee]">
                    <span className="font-mono text-xs uppercase tracking-wide text-gray-500 shrink-0">{a.label}</span>
                    <span className="text-sm text-right">{Array.isArray(a.value) ? a.value.join(', ') : String(a.value)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* OJE Form */}
          <OJEForm referral={referral} onSubmitted={() => { onSubmitted?.(); onClose() }} />

          {/* Timeline */}
          {events.length > 0 && (
            <section>
              <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Clock size={13} /> Timeline
              </h3>
              <ol className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: STAGES[e.to_stage]?.color ?? '#999' }} />
                    <div>
                      <span className="font-medium">{STAGES[e.to_stage]?.label || e.to_stage}</span>
                      {e.note && <span className="text-gray-500"> — {e.note}</span>}
                      <div className="text-xs text-gray-400">
                        {e.actor?.full_name} · {new Date(e.created_at).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main BL Inbox page ───────────────────────────────────────────────────────
export default function BLInbox() {
  const { profile }           = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel]         = useState(null)

  const load = useCallback(async () => {
    if (!profile?.branch) { setLoading(false); return }
    const { data } = await supabase
      .from('referrals')
      .select('*, referrer:referred_by(full_name, branch), claimer:claimed_by(full_name)')
      .eq('initiated_by', 'hr')
      .eq('assigned_branch', profile.branch)
      .eq('bl_oje_pending', true)
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [profile?.branch])

  useEffect(() => {
    load()
    const ch = supabase.channel('bl-inbox-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Branch leader</div>
        <h1 className="font-display text-3xl font-700 mt-1">HR Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          Applications sent by HR for OJE evaluation at your branch.
        </p>
      </header>

      {rows.length === 0
        ? <Empty title="No pending OJE requests" hint="HR will send candidates here when they need an on-the-job evaluation." />
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <button key={r.id} onClick={() => setSel(r)}
                className="ledger p-4 text-left hover:border-accent transition">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-display font-700 truncate">{r.candidate_name}</div>
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-0.5">{r.position || '—'}</div>
                <div className="mt-3 pt-3 border-t border-[#eee] flex items-center justify-between text-xs">
                  <span className="bg-accent/10 text-accent font-mono px-2 py-0.5 rounded">OJE Required</span>
                  <span className="text-gray-400">from HR</span>
                </div>
              </button>
            ))}
          </div>
        )
      }

      {sel && (
        <InboxDrawer
          referral={sel}
          onClose={() => setSel(null)}
          onSubmitted={load}
        />
      )}
    </div>
  )
}
