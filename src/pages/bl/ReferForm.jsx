import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  OJE_FIELDS, INTERVIEW_FIELDS,
  OJE_RATING_IDS, OJE_SCORE_FORMULA,
  IV_RATING_IDS,  IV_SCORE_FORMULA,
} from '../../lib/constants'
import { Button, Field, inputCls, Spinner } from '../../components/ui'
import {
  uploadCv, validateCv, ACCEPTED_CV, MAX_CV_MB,
} from '../../lib/cv'
import { UploadCloud, CheckCircle2, X } from 'lucide-react'
import { useEffect } from 'react'

// ─── Rating widget ────────────────────────────────────────────────────────────
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

function AutoScoreDisplay({ value }) {
  const filled = value != null && value !== ''
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${filled ? 'bg-moss/10 border-moss/30' : 'bg-[#f9f8f5] border-[#e4e2db]'}`}>
      <span className={`font-display text-2xl font-700 ${filled ? 'text-moss' : 'text-gray-300'}`}>
        {filled ? value : '—'}
      </span>
      <span className="text-sm text-gray-500">auto-calculated from ratings above</span>
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
  if (field.type === 'date') return (
    <Field label={field.label} required={field.required}>
      <input type="date" className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
  if (field.type === 'number') return (
    <Field label={field.label} required={field.required}>
      <input type="number" className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
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

// ─── File upload field ────────────────────────────────────────────────────────
function FileUploadField({ label, accept, file, onFile, onClear, hint }) {
  return (
    <Field label={label}>
      {file ? (
        <div className="flex items-center gap-3 px-4 py-3 border border-[#cfcdc6] bg-white">
          <UploadCloud size={18} className="text-accent shrink-0" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <button type="button" onClick={onClear} className="text-gray-400 hover:text-clay">
            <X size={16} />
          </button>
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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="border-t border-[#e4e2db] pt-5 pb-1">
      <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400">{title}</div>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default function ReferForm() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [name, setName]       = useState('')
  const [answers, setAnswers] = useState({})
  const [cv, setCv]           = useState(null)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [done, setDone]       = useState(false)

  const setAns = (id) => (val) => setAnswers((a) => ({ ...a, [id]: val }))

  useEffect(() => {
    const vals = IV_RATING_IDS.map((id) => Number(answers[id]) || 0)
    const allFilled = vals.every((v) => v > 0)
    if (allFilled) setAnswers((a) => ({ ...a, iv_total_marks: IV_SCORE_FORMULA(vals.reduce((a, b) => a + b, 0)) }))
    else setAnswers((a) => ({ ...a, iv_total_marks: '' }))
  }, [answers.iv_grooming, answers.iv_interpersonal, answers.iv_integrity, answers.iv_growth_mindset, answers.iv_customer])

  useEffect(() => {
    const vals = OJE_RATING_IDS.map((id) => Number(answers[id]) || 0)
    const allFilled = vals.every((v) => v > 0)
    if (allFilled) setAnswers((a) => ({ ...a, oje_overall: OJE_SCORE_FORMULA(vals.reduce((a, b) => a + b, 0)) }))
    else setAnswers((a) => ({ ...a, oje_overall: '' }))
  }, [answers.oje_grasp, answers.oje_energy, answers.oje_hygiene, answers.oje_listening, answers.oje_patience, answers.oje_teamwork, answers.oje_willingness])

  function handleCv(file) {
    if (!file) return
    const e = validateCv(file)
    if (e) { setErr(e); return }
    setErr(''); setCv(file)
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const allFields = [...INTERVIEW_FIELDS, ...OJE_FIELDS]
      for (const f of allFields) {
        if (!f.required || f.type === 'auto_score') continue
        const v = answers[f.id]
        const empty = v == null || v === '' || v === 0
        if (empty) throw new Error(`Please fill: ${f.label}`)
      }
      if (!name.trim()) throw new Error('Candidate name is required.')

      let cv_path = null, cv_name = null, cv_mime = null
      if (cv) {
        const m = await uploadCv(cv, profile.id)
        cv_path = m.path; cv_name = m.originalName; cv_mime = m.mime
      }

      const answerSnapshot = {}
      for (const f of allFields) {
        const v = answers[f.id]
        if (v !== undefined && v !== '' && v !== 0)
          answerSnapshot[f.id] = { label: f.label, type: f.type, value: v }
      }

      const { error } = await supabase.from('referrals').insert({
        candidate_name: name, candidate_email: answers['oje_email'] || null,
        position: answers['oje_designation'] || answers['iv_position'] || null,
        answers: answerSnapshot, cv_path, cv_name, cv_mime,
        referred_by: profile.id,
        branch: answers['oje_branch'] || answers['iv_recommended_branch'] || profile.branch,
      })
      if (error) throw error
      setDone(true)
      setTimeout(() => nav('/bl/referrals'), 1200)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  if (done) return (
    <div className="grid place-items-center py-24 text-center">
      <CheckCircle2 size={48} className="text-moss" />
      <h2 className="font-display text-2xl font-700 mt-4">Referral sent to HR</h2>
      <p className="text-gray-500 mt-1">Redirecting to your referrals…</p>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">New referral</div>
        <h1 className="font-display text-3xl font-700 mt-1">Refer a Candidate</h1>
        <p className="text-sm text-gray-500 mt-1">Fill both forms, upload CV and photo, then send to HR.</p>
      </header>

      <form onSubmit={submit} className="ledger p-6 space-y-5">
        <Field label="Candidate name" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <SectionHeader title="Interview Form" />
        <div className="space-y-5">
          {INTERVIEW_FIELDS.map((f) => {
            if (f.type === 'auto_score') return (
              <div key={f.id}>
                <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1.5">{f.label}</div>
                <AutoScoreDisplay value={answers[f.id]} />
              </div>
            )
            return <FormField key={f.id} field={f} value={answers[f.id]} onChange={setAns(f.id)} />
          })}
        </div>

        <SectionHeader title="OJE Form" subtitle="On-the-job evaluation details" />
        <div className="space-y-5">
          {OJE_FIELDS.map((f) => {
            if (f.type === 'auto_score') return (
              <div key={f.id}>
                <div className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-1.5">{f.label}</div>
                <AutoScoreDisplay value={answers[f.id]} />
              </div>
            )
            return <FormField key={f.id} field={f} value={answers[f.id]} onChange={setAns(f.id)} />
          })}
        </div>

        <SectionHeader title="CV / Resume" />
        <FileUploadField
          label="Upload CV"
          accept={ACCEPTED_CV}
          file={cv}
          onFile={handleCv}
          onClear={() => setCv(null)}
          hint={`PDF, DOC, DOCX, JPG or PNG — max ${MAX_CV_MB} MB`}
        />

        {err && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{err}</div>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={busy}>{busy ? <Spinner /> : 'Send to HR'}</Button>
          <Button type="button" variant="ghost" onClick={() => nav('/bl')}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
