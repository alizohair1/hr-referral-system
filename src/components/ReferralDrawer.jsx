import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCvObjectUrl } from '../lib/cv'
import {
  STAGES, PIPELINE,
  INTERVIEW_FIELDS, IV_RATING_IDS, IV_SCORE_FORMULA,
} from '../lib/constants'
import { StageBadge, Button, Spinner } from './ui'
import { X, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Simple label/value row ───────────────────────────────────────────────────
function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#eee]">
      <span className="font-mono text-xs uppercase tracking-wide text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  )
}

// ─── Rating display (read-only) ───────────────────────────────────────────────
function RatingDisplay({ value }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}
          className={`w-7 h-7 flex items-center justify-center text-xs font-mono font-600 rounded border
            ${value >= n ? 'bg-accent text-white border-accent' : 'bg-white text-gray-300 border-[#e4e2db]'}`}>
          {n}
        </span>
      ))}
    </div>
  )
}

// ─── Rating input (interactive) ───────────────────────────────────────────────
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

// ─── HR Interview Form (editable, inside drawer) ──────────────────────────────
function HRInterviewForm({ referralId, existingFeedback, onSaved }) {
  const inputCls = 'w-full px-3 py-2 text-sm border border-[#d8d6cf] bg-white focus:outline-none focus:border-accent'
  const [open, setOpen]     = useState(!!existingFeedback)
  const [answers, setAnswers] = useState(() =>
    existingFeedback && typeof existingFeedback === 'object' ? existingFeedback : {}
  )
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')
  const [saved, setSaved] = useState(false)

  const setAns = (id) => (val) => setAnswers((a) => ({ ...a, [id]: val }))

  // auto-calculate total marks from rating fields
  useEffect(() => {
    const vals = IV_RATING_IDS.map((id) => Number(answers[id]) || 0)
    const allFilled = vals.every((v) => v > 0)
    if (allFilled) {
      const score = IV_SCORE_FORMULA(vals.reduce((a, b) => a + b, 0))
      setAnswers((a) => ({ ...a, iv_total_marks: score }))
    } else {
      setAnswers((a) => ({ ...a, iv_total_marks: '' }))
    }
  }, [
    answers.iv_grooming, answers.iv_interpersonal,
    answers.iv_integrity, answers.iv_growth_mindset, answers.iv_customer,
  ])

  async function save(e) {
    e.preventDefault()
    setErr('')
    // validate required fields (skip auto_score)
    for (const f of INTERVIEW_FIELDS) {
      if (!f.required || f.type === 'auto_score') continue
      const v = answers[f.id]
      const empty = v == null || v === '' || v === 0
      if (empty) { setErr(`Please fill: ${f.label}`); return }
    }
    setBusy(true)
    try {
      // build snapshot
      const snapshot = {}
      for (const f of INTERVIEW_FIELDS) {
        const v = answers[f.id]
        if (v !== undefined && v !== '' && v !== 0) {
          snapshot[f.id] = { label: f.label, type: f.type, value: v }
        }
      }
      // fetch current answers and merge
      const { data: current } = await supabase
        .from('referrals').select('answers').eq('id', referralId).single()
      const merged = { ...(current?.answers || {}), hr_interview: snapshot }
      const { error } = await supabase.from('referrals').update({ answers: merged }).eq('id', referralId)
      if (error) throw error
      setSaved(true)
      onSaved?.()
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
        <span>HR Interview Form</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {!open && existingFeedback && Object.keys(existingFeedback).length > 0 && (
        <div className="text-xs text-gray-400 font-mono mb-1">Feedback recorded · click to expand</div>
      )}

      {open && (
        <form onSubmit={save} className="ledger-tight p-4 space-y-4">
          {saved && (
            <div className="text-sm text-moss bg-moss/10 border border-moss/30 px-3 py-2">
              Interview feedback saved.
            </div>
          )}

          {INTERVIEW_FIELDS.map((f) => {
            // auto score field
            if (f.type === 'auto_score') return (
              <div key={f.id}>
                <div className="font-mono text-[10px] uppercase tracking-wide text-gray-500 mb-1">{f.label}</div>
                <AutoScoreDisplay value={answers[f.id]} max={15} />
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
                  <select className={inputCls} value={answers[f.id] ?? ''} onChange={(e) => setAns(f.id)(e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
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
          <Button type="submit" disabled={busy}>{busy ? <Spinner /> : 'Save interview feedback'}</Button>
        </form>
      )}
    </section>
  )
}

// ─── HR Interview read-only view ──────────────────────────────────────────────
function HRInterviewView({ feedback }) {
  const [open, setOpen] = useState(false)
  if (!feedback || Object.keys(feedback).length === 0) return null
  return (
    <section>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500 mb-2 hover:text-accent transition">
        <span>HR Interview Form</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="ledger-tight p-4 space-y-2">
          {Object.values(feedback).map((a, i) =>
            a?.type === 'rating' || a?.type === 'auto_score' ? (
              <div key={i} className="py-2 border-b border-[#eee]">
                <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1">{a.label}</div>
                {a.type === 'rating'
                  ? <RatingDisplay value={a.value} />
                  : <div className="font-display text-lg font-700 text-moss">{a.value} <span className="text-sm text-gray-400 font-sans font-400">/ 15</span></div>
                }
              </div>
            ) : (
              <Row key={i} label={a.label}
                value={Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '')} />
            )
          )}
        </div>
      )}
    </section>
  )
}

// ─── BL answers display ───────────────────────────────────────────────────────
function BLAnswersView({ answers, ojeOnly = false }) {
  const entries = Object.entries(answers)
    .filter(([k]) => {
      if (k === 'hr_interview') return false
      if (ojeOnly) return k.startsWith('oje_')
      return true
    })
    .map(([, v]) => v)
    .filter((a) => a && a.value != null && a.value !== '' && !(Array.isArray(a.value) && a.value.length === 0))

  if (entries.length === 0) return <div className="text-sm text-gray-500">No details provided.</div>

  return entries.map((a, i) =>
    a.type === 'rating' ? (
      <div key={i} className="py-2 border-b border-[#eee]">
        <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1">{a.label}</div>
        <RatingDisplay value={a.value} />
      </div>
    ) : a.type === 'auto_score' ? (
      <div key={i} className="py-2 border-b border-[#eee]">
        <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1">{a.label}</div>
        <div className="font-display text-lg font-700 text-moss">
          {a.value} <span className="text-sm text-gray-400 font-sans font-400">/ {a.label.includes('40') ? '40' : '15'}</span>
        </div>
      </div>
    ) : (
      <Row key={i} label={a.label}
        value={Array.isArray(a.value) ? a.value.join(', ') : String(a.value)} />
    )
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export default function ReferralDrawer({ referral, onClose, canAct }) {
  const [cv, setCv]         = useState(null)
  const [events, setEvents] = useState([])
  const [busy, setBusy]     = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!referral) return
    let url = null
    getCvObjectUrl(referral.cv_path, referral.cv_mime).then((u) => { url = u; setCv(u) })
    supabase.from('referral_events')
      .select('*, actor:actor_id(full_name)')
      .eq('referral_id', referral.id).order('created_at')
      .then(({ data }) => setEvents(data ?? []))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [referral])

  if (!referral) return null

  const rawAnswers     = referral.answers && typeof referral.answers === 'object' ? referral.answers : {}
  const hrFeedback     = rawAnswers.hr_interview || null
  const isHRInitiated  = referral.initiated_by === 'hr'
  const isClaimed      = referral.stage !== 'inbox'
  const isFinal        = ['accepted', 'rejected'].includes(referral.stage)
  const showHRForm     = isClaimed && !['inbox'].includes(referral.stage)
  const nextStages     = PIPELINE.filter((s) => s !== referral.stage)

  // For HR-initiated apps: the top-level answers ARE the HR interview form
  // For BL-initiated apps: the top-level answers are BL's OJE + interview submission
  const hrInitiatedAnswers = isHRInitiated
    ? Object.entries(rawAnswers)
        .filter(([k]) => k !== 'hr_interview')
        .map(([, v]) => v)
        .filter((a) => a && a.value != null && a.value !== '')
    : []

  async function claim() {
    setBusy(true)
    const { error } = await supabase.rpc('claim_referral', { p_referral_id: referral.id })
    setBusy(false)
    if (error) alert(error.message)
    else onClose()
  }

  async function move(to) {
    setBusy(true)
    const { error } = await supabase.rpc('move_stage', {
      p_referral_id: referral.id, p_to_stage: to, p_reason: reason || null,
    })
    setBusy(false)
    if (error) alert(error.message)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper h-full overflow-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-ink text-paper px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-700">{referral.candidate_name}</div>
            <div className="text-white/60 text-sm">{referral.position || '—'}</div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">

          {/* Stage + date */}
          <div className="flex items-center justify-between">
            <StageBadge stage={referral.stage} />
            <span className="font-mono text-xs text-gray-500">
              {new Date(referral.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* BL submitted answers */}
          <section>
            <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">
              {isHRInitiated ? 'OJE Details (submitted by BL)' : 'BL Submission'}
            </h3>
            <div className="ledger-tight p-4">
              <BLAnswersView answers={rawAnswers} ojeOnly={isHRInitiated} />
            </div>
          </section>

          {/* HR Interview answers (read-only) — shown when HR initiated the app */}
          {isHRInitiated && hrInitiatedAnswers.length > 0 && (
            <section>
              <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">HR Interview Form</h3>
              <div className="ledger-tight p-4 space-y-2">
                {hrInitiatedAnswers.map((a, i) =>
                  a.type === 'rating' ? (
                    <div key={i} className="py-2 border-b border-[#eee]">
                      <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1">{a.label}</div>
                      <RatingDisplay value={a.value} />
                    </div>
                  ) : a.type === 'auto_score' ? (
                    <div key={i} className="py-2 border-b border-[#eee]">
                      <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1">{a.label}</div>
                      <div className="font-display text-lg font-700 text-moss">
                        {a.value} <span className="text-sm text-gray-400 font-sans font-400">/ 15</span>
                      </div>
                    </div>
                  ) : (
                    <Row key={i} label={a.label}
                      value={Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '')} />
                  )
                )}
              </div>
            </section>
          )}

          {/* Referral meta */}
          <section>
            <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">Referral</h3>
            <div className="ledger-tight p-4">
              <Row label="Referred by" value={referral.referrer?.full_name} />
              <Row label="Branch"      value={referral.branch || referral.referrer?.branch} />
              <Row label="Claimed by"  value={referral.claimer?.full_name || '—'} />
            </div>
          </section>

          {/* CV */}
          <section>
            <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">CV</h3>
            {referral.cv_path
              ? cv
                ? <a href={cv} target="_blank" rel="noreferrer" download={referral.cv_name || 'cv'}
                    className="ledger-tight p-4 flex items-center gap-3 hover:border-accent transition">
                    <FileText size={18} className="text-accent" />
                    <span className="text-sm">{referral.cv_name || 'Open candidate CV'}</span>
                  </a>
                : <div className="ledger-tight p-4 flex items-center gap-2 text-sm text-gray-500"><Spinner /> Loading…</div>
              : <div className="text-sm text-gray-500">No CV attached.</div>
            }
          </section>

          {/* HR Interview Form — editable if HR, claimed, not final */}
          {canAct && showHRForm && !isFinal && (
            <HRInterviewForm
              referralId={referral.id}
              existingFeedback={hrFeedback}
              onSaved={() => {}}
            />
          )}

          {/* HR Interview read-only — for final stages or non-HR */}
          {(!canAct || isFinal) && hrFeedback && (
            <HRInterviewView feedback={hrFeedback} />
          )}

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
                      style={{ background: STAGES[e.to_stage]?.color }} />
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

          {/* Actions */}
          {canAct && (
            <section className="space-y-3 pt-2">
              {referral.stage === 'inbox' ? (
                <Button onClick={claim} disabled={busy} className="w-full">
                  {busy ? <Spinner /> : 'Claim this application'}
                </Button>
              ) : !isFinal ? (
                <>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason / note (optional)"
                    className="w-full px-3 py-2 text-sm border border-[#d8d6cf] bg-white focus:outline-none focus:border-accent"
                    rows={2} />
                  <div className="flex flex-wrap gap-2">
                    {nextStages.map((s) => (
                      <Button key={s} disabled={busy}
                        variant={s === 'accepted' ? 'accept' : s === 'rejected' ? 'reject' : 'ghost'}
                        onClick={() => move(s)} className="flex-1 min-w-[120px]">
                        {STAGES[s].label}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">Final decision recorded.</div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
