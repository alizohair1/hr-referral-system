import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useFormFields } from '../hooks/useFormFields'
import { FIELD_TYPES, OJE_FIELDS, INTERVIEW_FIELDS } from '../lib/constants'
import { Button, Field, inputCls, Spinner } from './ui'
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, X, GripVertical, Lock } from 'lucide-react'

const BLANK = { label: '', field_type: 'short_text', required: false, optionsText: '' }

// ─── Fixed form preview banner ────────────────────────────────────────────────
function FixedFormBanner({ title, filledBy, fields }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[#e4e2db] bg-[#f9f8f5] mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Lock size={13} className="text-gray-400 shrink-0" />
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
              Fixed · {filledBy} · {fields.length} fields · cannot be edited here
            </div>
          </div>
        </div>
        <span className="font-mono text-[11px] text-gray-400 shrink-0 ml-2">
          {open ? 'HIDE' : 'SHOW'} FIELDS
        </span>
      </button>

      {open && (
        <ol className="border-t border-[#e4e2db] px-3 py-2 space-y-1">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-1 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <span>{f.label}</span>
              {f.required && <span className="text-clay text-xs">*</span>}
              <span className="font-mono text-[11px] text-gray-400 ml-auto">{f.type}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────
export default function FormBuilder() {
  const { fields, loading, reload } = useFormFields()
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const needsOptions = FIELD_TYPES[form.field_type]?.hasOptions
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function startEdit(f) {
    setEditingId(f.id)
    setForm({
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      optionsText: (Array.isArray(f.options) ? f.options : []).join('\n'),
    })
    setErr('')
  }

  function cancel() { setEditingId(null); setForm(BLANK); setErr('') }

  async function save(e) {
    e.preventDefault()
    setErr('')
    if (!form.label.trim()) return setErr('Label is required.')

    const options = needsOptions
      ? form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : []
    if (needsOptions && options.length === 0) return setErr('Add at least one option.')

    setBusy(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('form_fields')
          .update({ label: form.label.trim(), field_type: form.field_type, required: form.required, options })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const nextOrder = fields.length ? Math.max(...fields.map((f) => f.sort_order)) + 1 : 1
        const { error } = await supabase.from('form_fields').insert({
          label: form.label.trim(),
          field_type: form.field_type,
          required: form.required,
          options,
          sort_order: nextOrder,
        })
        if (error) throw error
      }
      cancel()
      await reload()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this field? Existing referrals keep their saved answers.')) return
    await supabase.from('form_fields').delete().eq('id', id)
    await reload()
  }

  async function toggleActive(f) {
    await supabase.from('form_fields').update({ active: !f.active }).eq('id', f.id)
    await reload()
  }

  async function moveField(idx, dir) {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    const a = fields[idx], b = fields[target]
    await supabase.from('form_fields').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('form_fields').update({ sort_order: a.sort_order }).eq('id', b.id)
    await reload()
  }

  return (
    <section className="ledger p-6">
      <h2 className="font-display text-lg font-700">Referral form fields</h2>
      <p className="text-sm text-gray-500 mb-5">
        Two default forms are always included. You can add extra custom fields below that appear in the BL refer form.
      </p>

      {/* ── Fixed forms (locked) ── */}
      <div className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400 mb-2">
          Default forms (always active)
        </div>
        <FixedFormBanner
          title="OJE Form"
          filledBy="Filled by Branch Leader"
          fields={OJE_FIELDS}
        />
        <FixedFormBanner
          title="Interview Feedback Form"
          filledBy="Filled by HR after claiming"
          fields={INTERVIEW_FIELDS}
        />
      </div>

      {/* ── Custom fields ── */}
      <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400 mb-2">
        Additional custom fields
      </div>

      {loading
        ? <div className="flex items-center gap-2 text-sm text-gray-500 mb-4"><Spinner /> Loading…</div>
        : (
          <ol className="space-y-2 mb-6">
            {fields.length === 0 && (
              <li className="text-sm text-gray-500">No custom fields yet. Add one below.</li>
            )}
            {fields.map((f, idx) => (
              <li
                key={f.id}
                className={`flex items-center gap-3 px-3 py-2.5 border
                  ${f.active
                    ? 'bg-white border-[#e4e2db]'
                    : 'bg-[#f3f2ee] border-dashed border-[#cfcdc6] opacity-70'}`}
              >
                <GripVertical size={15} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {f.label}{f.required && <span className="text-clay"> *</span>}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
                    {FIELD_TYPES[f.field_type]?.label || f.field_type}
                    {!f.active && ' · hidden'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button title="Move up" onClick={() => moveField(idx, -1)} className="p-1.5 hover:bg-[#f0efe9]">
                    <ArrowUp size={14} />
                  </button>
                  <button title="Move down" onClick={() => moveField(idx, 1)} className="p-1.5 hover:bg-[#f0efe9]">
                    <ArrowDown size={14} />
                  </button>
                  <button
                    title={f.active ? 'Hide' : 'Show'}
                    onClick={() => toggleActive(f)}
                    className="p-1.5 hover:bg-[#f0efe9] text-xs font-mono"
                  >
                    {f.active ? 'HIDE' : 'SHOW'}
                  </button>
                  <button title="Edit" onClick={() => startEdit(f)} className="p-1.5 hover:bg-[#f0efe9]">
                    <Pencil size={14} />
                  </button>
                  <button title="Delete" onClick={() => remove(f.id)} className="p-1.5 hover:bg-clay/10 text-clay">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

      {/* ── Add / Edit form ── */}
      <form onSubmit={save} className="border-t border-[#eee] pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-700">{editingId ? 'Edit field' : 'Add custom field'}</h3>
          {editingId && (
            <button type="button" onClick={cancel} className="text-sm text-gray-500 flex items-center gap-1">
              <X size={14} /> Cancel edit
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Question label" required>
            <input
              className={inputCls}
              value={form.label}
              onChange={upd('label')}
              placeholder="e.g. Expected salary"
            />
          </Field>
          <Field label="Field type" required>
            <select className={inputCls} value={form.field_type} onChange={upd('field_type')}>
              {Object.entries(FIELD_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {needsOptions && (
          <Field label="Options (one per line)" required>
            <textarea
              className={inputCls}
              rows={3}
              value={form.optionsText}
              onChange={upd('optionsText')}
              placeholder={'Option A\nOption B\nOption C'}
            />
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.required}
            onChange={(e) => setForm({ ...form, required: e.target.checked })}
          />
          Required field
        </label>

        {err && (
          <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{err}</div>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? <Spinner /> : (editingId ? 'Save changes' : <><Plus size={15} /> Add field</>)}
        </Button>
      </form>
    </section>
  )
}
