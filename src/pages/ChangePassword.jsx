import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Field, inputCls, Spinner } from '../components/ui'
import { KeyRound } from 'lucide-react'

export default function ChangePassword() {
  const { refreshProfile, signOut } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (pw.length < 6) return setErr('Password must be at least 6 characters.')
    if (pw !== pw2) return setErr('Passwords do not match.')
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      const { error: rpcErr } = await supabase.rpc('clear_password_change_flag')
      if (rpcErr) throw rpcErr
      await refreshProfile()
      nav('/')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function out() { await signOut(); nav('/login') }

  return (
    <div className="min-h-screen grid place-items-center p-8 bg-paper">
      <form onSubmit={submit} className="w-full max-w-sm ledger p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grid place-items-center bg-ink text-paper"><KeyRound size={18} /></div>
          <div>
            <h2 className="font-display text-xl font-700">Set a new password</h2>
            <p className="text-sm text-gray-500">Required before you continue.</p>
          </div>
        </div>

        <Field label="New password" required>
          <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
        </Field>
        <Field label="Confirm new password" required>
          <input type="password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        </Field>

        {err && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{err}</div>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner /> : 'Save and continue'}
        </Button>
        <button type="button" onClick={out} className="w-full text-sm text-gray-500 hover:text-ink">
          Sign out
        </button>
      </form>
    </div>
  )
}
