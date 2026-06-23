import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { INTERVIEW_FIELDS, IV_RATING_IDS, IV_SCORE_FORMULA } from '../../lib/constants'
import { Button, Field, inputCls, Spinner } from '../../components/ui'
import { uploadCv, validateCv, ACCEPTED_CV, MAX_CV_MB } from '../../lib/cv'
import { UploadCloud, CheckCircle2, X } from 'lucide-react'

const BRANCHES = ['Phase 6', 'CC', 'Bahria Town', 'Cloud Kitchen', 'Valencia', 'Johar Town', 'Emporium']

function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-9 h-9 rounded border text-sm font-mono font-600 transition
            ${value >= n ? 'bg-accent text-white border-accent'
              : 'bg-white text-gray-400 border-[#d8d6cf] hover:border-accent hover:text-accent'}`}>
          {n}
        </button>
      ))}
      {value > 0 && <button type="button" onClick={() => onChange(0)}
        className="ml-2 text-xs text-gray-400 hover:text-clay underline">clear</button>}
    </div>
  )
}

function AutoScoreDisplay({ value, max }) {
  const filled = value != null && value !== ''
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${filled ? 'bg-moss/10 border-moss/30' : 'bg-[#f9f8f5] border-[#e4e2db]'}`}>
      <span className={`font-display text-2xl font-700 ${filled ? 'text-moss' : 'text-gray-300'}`}>{filled ? value : '—'}</span>
      <span className="text-sm text-gray-500">out of {max} · auto-calculated</span>
    </div>
  )
}

function FormField({ field, value, onChange }) {
  if (field.type === 'auto_score') return null
  if (field.type === 'rating') return (
    <Field label={field.label} required={field.required}>
      <RatingInput value={value ?? 0} onChange={onChange} />
    </Field>
  )
  if (field.type === 'dropdown') return (
    <Field label={field.label} required={field.required}>
      <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )
  if (field.type === 'long_text') return (
    <Field label={field.label} required={field.required}>
      <textarea className={inputCls} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
  return (
    <Field label={field.label} required={field.required}>
      <input type="text" className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function FileUploadField({ label, accept, file, onFile, onClear, hint }) {
  return (
    <Field label={label}>
      {file ? (
        <div className="flex items-center gap-3 px-4 py-3 border border-[#cfcdc6] bg-white">
          <UploadCloud size={18} className="text-accent shrink-0" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <button type="button" onClick={onClear} className="text-gray-400 hover:text-clay"><X size={16} /></button>
        </div>
      ) : (
        <label className="flex items-center gap-3 px-4 py-6 border border-dashed border-[#cfcdc6] bg-white cursor-pointer hover:border-accent transition">
          <UploadCloud size={20} className="text-accent" />
          <span className="text-sm text-gray-600">{hint}</span>
          <input type="file" accept={accept} className="hidden"
            onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </label>
      )}
    </Field>
  )
}

export default function HRCreateApplication() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [candidateName, setCandidateName] = useState('')
  const [branch, setBranch]               = useState('')
  const [answers, setAnswers]             = useState({})
  const [cv, setCv]                       = useState(null)
  const [busy, setBusy]                   = useState(false)
  const [err, setErr]                     = useState('')
  const [done, setDone]                   = useState(false)

  const setAns = (id) => (val) => setAnswers((a) => ({ ...a, [id]: val }))

  useEffect(() => {
    const vals = IV_RATING_IDS.map((id) => Number(answers[id]) || 0)
    const allFilled = vals.every((v) => v > 0)
    if (allFilled) setAnswers((a) => ({ ...a, iv_total_marks: IV_SCORE_FORMULA(vals.reduce((a, b) => a + b, 0)) }))
    else setAnswers((a) => ({ ...a, iv_total_marks: '' }))
  }, [answers.iv_grooming, answers.iv_interpersonal, answers.iv_integrity, answers.iv_growth_mindset, answers.iv_customer])

  function handleCv(file) {
    if (!file) return
    const e = validateCv(file)
    if (e) { setErr(e); return }
    setErr(''); setCv(file)
  }

  function handlePhoto(file) {
    if (!file) return
    const e = validatePhoto(file)
    if (e) { setErr(e); return }
    setErr(''); setPhoto(file)
  }

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (!candidateName.trim()) return setErr('Candidate name is required.')
    if (!branch) return setErr('Please select a branch.')
    for (const f of INTERVIEW_FIELDS) {
      if (!f.required || f.type === 'auto_score') continue
      const v = answers[f.id]
      if (v == null || v === '' || v === 0) return setErr(`Please fill: ${f.label}`)
    }
    setBusy(true)
    try {
      let cv_path = null, cv_name = null, cv_mime = null
      if (cv) { const m = await uploadCv(cv, profile.id); cv_path = m.path; cv_name = m.originalName; cv_mime = m.mime }

      const answerSnapshot = {}
      for (const f of INTERVIEW_FIELDS) {
        const v = answers[f.id]
        if (v !== undefined && v !== '' && v !== 0)
          answerSnapshot[f.id] = { label: f.label, type: f.type, value: v }
      }

      const { error } = await supabase.from('referrals').insert({
        candidate_name: candidateName.trim(),
        position: answers['iv_position'] || null,
        answers: answerSnapshot, cv_path, cv_name, cv_mime,
        referred_by: profile.id, branch, assigned_branch: branch,
        stage: 'inbox', initiated_by: 'hr', bl_oje_pending: true,
      })
      if (error) throw error
      setDone(true)
      setTimeout(() => nav('/hr/board'), 1500)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  if (done) return (
    <div className="grid place-items-center py-24 text-center">
      <CheckCircle2 size={48} className="text-moss" />
      <h2 className="font-display text-2xl font-700 mt-4">Application sent to branch</h2>
      <p className="text-gray-500 mt-1">The BL will fill the OJE form and send it back.</p>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">HR panel</div>
        <h1 className="font-display text-3xl font-700 mt-1">Create Application</h1>
        <p className="text-sm text-gray-500 mt-1">Fill the interview form and assign to a branch BL for OJE.</p>
      </header>

      <form onSubmit={submit} className="ledger p-6 space-y-5">
        <Field label="Candidate name" required>
          <input className={inputCls} value={candidateName} onChange={(e) => setCandidateName(e.target.value)} required />
        </Field>
        <Field label="Assign to branch" required>
          <select className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Select branch…</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>

        <div className="border-t border-[#e4e2db] pt-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400 mb-4">Interview Form</div>
          <div className="space-y-5">
            {INTERVIEW_FIELDS.map((f) => {
              if (f.type === 'auto_score') return (
                <div key={f.id}>
                  <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1.5">{f.label}</div>
                  <AutoScoreDisplay value={answers[f.id]} max={15} />
                </div>
              )
              return <FormField key={f.id} field={f} value={answers[f.id]} onChange={setAns(f.id)} />
            })}
          </div>
        </div>

        <div className="border-t border-[#e4e2db] pt-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400 mb-4">Upload CV</div>
          <FileUploadField label="Upload CV" accept={ACCEPTED_CV} file={cv}
            onFile={(f) => { if (!f) return; const e = validateCv(f); if (e) { setErr(e); return; } setErr(''); setCv(f) }}
            onClear={() => setCv(null)} hint={`PDF, DOC, DOCX, JPG or PNG — max ${MAX_CV_MB} MB`} />
        </div>

        {err && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{err}</div>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={busy}>{busy ? <Spinner /> : 'Send to branch BL'}</Button>
          <Button type="button" variant="ghost" onClick={() => nav('/hr/board')}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
