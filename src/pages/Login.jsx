import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Field, inputCls, Spinner } from '../components/ui'

export default function Login() {
  const { session, loading } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && session) { nav('/'); return null }

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      })
      if (error) throw error
      nav('/')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-paper p-12">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-9 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div className="font-display text-xl font-700">Referral Desk</div>
        </div>
        <div>
          <h1 className="font-display text-5xl leading-[1.05] font-700">
            Every referral,<br/>tracked from<br/><span className="text-accent">desk to decision.</span>
          </h1>
          <p className="mt-6 text-white/60 max-w-sm">
            Branch leaders refer candidates. HR claims, screens, and decides — one ledger, no double work.
          </p>
        </div>
        <div className="font-mono text-xs text-white/40">BL · HR · ADMIN</div>
      </div>

      <div className="grid place-items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <img src="/logo.png" alt="" className="h-12 w-auto mb-2 lg:hidden"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div>
            <h2 className="font-display text-2xl font-700">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">Use the credentials your admin gave you.</p>
          </div>

          <Field label="Email" required>
            <input type="email" className={inputCls} value={form.email} onChange={upd('email')} required />
          </Field>
          <Field label="Password" required>
            <input type="password" className={inputCls} value={form.password} onChange={upd('password')} required />
          </Field>

          {err && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{err}</div>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Spinner /> : 'Sign in'}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            No account? Ask your administrator to create one for you.
          </p>
        </form>
      </div>
    </div>
  )
}
