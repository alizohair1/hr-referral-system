import { Field, inputCls } from './ui'

// Renders one admin-defined field as an input bound to value/onChange.
export function DynamicField({ field, value, onChange }) {
  const opts = Array.isArray(field.options) ? field.options : []

  const common = { className: inputCls, required: field.required }

  let control
  switch (field.field_type) {
    case 'long_text':
      control = <textarea {...common} rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'number':
      control = <input {...common} type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'date':
      control = <input {...common} type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'yesno':
      control = (
        <select {...common} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      )
      break
    case 'dropdown':
      control = (
        <select {...common} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
      break
    case 'checkboxes': {
      const arr = Array.isArray(value) ? value : []
      const toggle = (o) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
      control = (
        <div className="space-y-1.5">
          {opts.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={arr.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </div>
      )
      break
    }
    default: // short_text
      control = <input {...common} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  }

  return <Field label={field.label} required={field.required}>{control}</Field>
}

// Read-only display of an answer (for HR drawer).
export function answerToText(field, value) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}
