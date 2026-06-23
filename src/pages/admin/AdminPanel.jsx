import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useReferrals } from '../../hooks/useReferrals'
import { useAuth } from '../../context/AuthContext'
import { Stat, Spinner, Button, Field, inputCls } from '../../components/ui'
import FormBuilder from '../../components/FormBuilder'
import { UserPlus, CheckCircle2, Pencil, Trash2, X } from 'lucide-react'
import { STAGES } from '../../lib/constants'

const EMPTY = { full_name: '', email: '', password: '', role: 'bl', branch: '' }
const BRANCHES = ['Phase 6', 'CC', 'Bahria Town', 'Cloud Kitchen', 'Valencia', 'Johar Town', 'Emporium']

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
        <p className="text-sm">{message}</p>
        <div className="flex gap-3">
          <Button variant="reject" onClick={onConfirm}>Delete</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const { rows, loading, reload: reloadReferrals } = useReferrals()
  const { createUser } = useAuth()
  const [users, setUsers]       = useState([])
  const [savingId, setSavingId] = useState(null)

  // create user form
  const [nu, setNu]             = useState(EMPTY)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')
  const [createOk, setCreateOk]   = useState('')

  // edit user
  const [editUser, setEditUser]   = useState(null) // user object being edited
  const [editForm, setEditForm]   = useState({})
  const [editBusy, setEditBusy]   = useState(false)
  const [editErr, setEditErr]     = useState('')

  // delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'user'|'application', id, label }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
  }
  useEffect(() => { loadUsers() }, [])

  const updNu = (k) => (e) => setNu({ ...nu, [k]: e.target.value })

  async function submitNewUser(e) {
    e.preventDefault(); setCreateErr(''); setCreateOk(''); setCreating(true)
    try {
      await createUser(nu)
      setCreateOk(`Account created for ${nu.email}. They must change the password on first login.`)
      setNu(EMPTY)
      await loadUsers()
    } catch (e) { setCreateErr(e.message) } finally { setCreating(false) }
  }

  async function setRole(id, role) {
    setSavingId(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    await loadUsers()
    setSavingId(null)
  }

  // ── Edit user ──────────────────────────────────────────────────────────────
  function startEdit(u) {
    setEditUser(u)
    setEditForm({ full_name: u.full_name, branch: u.branch || '', role: u.role })
    setEditErr('')
  }

  async function saveEdit(e) {
    e.preventDefault(); setEditErr(''); setEditBusy(true)
    try {
      const { error } = await supabase.from('profiles')
        .update({ full_name: editForm.full_name, branch: editForm.branch, role: editForm.role })
        .eq('id', editUser.id)
      if (error) throw error
      setEditUser(null)
      await loadUsers()
    } catch (e) { setEditErr(e.message) } finally { setEditBusy(false) }
  }

  // ── Delete user ────────────────────────────────────────────────────────────
  async function deleteUser(id) {
    // delete from auth via admin API isn't available client-side
    // so we just delete the profile — auth user remains but can't log in usefully
    await supabase.from('profiles').delete().eq('id', id)
    await loadUsers()
    setConfirmDelete(null)
  }

  // ── Delete application ─────────────────────────────────────────────────────
  async function deleteApplication(id) {
    await supabase.from('referrals').delete().eq('id', id)
    await reloadReferrals()
    setConfirmDelete(null)
  }

  if (loading) return <div className="grid place-items-center py-20"><Spinner /></div>

  const counts = {
    total:    rows.length,
    bls:      users.filter(u => u.role === 'bl').length,
    hr:       users.filter(u => u.role === 'hr').length,
    accepted: rows.filter(r => r.stage === 'accepted').length,
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Administration</div>
        <h1 className="font-display text-3xl font-700 mt-1">Admin panel</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total referrals" value={counts.total} />
        <Stat label="Branch leaders"  value={counts.bls} />
        <Stat label="HR staff"        value={counts.hr}       accent="#3b5bff" />
        <Stat label="Hired"           value={counts.accepted} accent="#1f7a5a" />
      </div>

      {/* ── Create user ── */}
      <section className="ledger p-6">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={18} className="text-accent" />
          <h2 className="font-display text-lg font-700">Create user</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Set a temporary password. The user must change it on first login.</p>
        <form onSubmit={submitNewUser} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <input className={inputCls} value={nu.full_name} onChange={updNu('full_name')} required />
            </Field>
            <Field label="Email" required>
              <input type="email" className={inputCls} value={nu.email} onChange={updNu('email')} required />
            </Field>
            <Field label="Temporary password" required>
              <input className={inputCls} value={nu.password} onChange={updNu('password')} required minLength={6} placeholder="min 6 characters" />
            </Field>
            <Field label="Role" required>
              <select className={inputCls} value={nu.role} onChange={updNu('role')}>
                <option value="bl">Branch Leader</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Branch">
              <select className={inputCls} value={nu.branch} onChange={updNu('branch')}>
                <option value="">Select branch…</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          {createErr && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{createErr}</div>}
          {createOk  && <div className="text-sm text-moss bg-moss/10 border border-moss/30 px-3 py-2 flex items-center gap-2"><CheckCircle2 size={15}/>{createOk}</div>}
          <Button type="submit" disabled={creating}>{creating ? <Spinner /> : 'Create user'}</Button>
        </form>
      </section>

      <FormBuilder />

      {/* ── Users & roles ── */}
      <section className="ledger overflow-hidden">
        <div className="p-6 pb-3">
          <h2 className="font-display text-lg font-700">Users & roles</h2>
          <p className="text-sm text-gray-500">Edit, change roles, or delete users.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f0efe9] text-left font-mono text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-4 py-3 hidden sm:table-cell">Email</th>
              <th className="px-4 py-3 hidden md:table-cell">Branch</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-[#eee]">
                <td className="px-6 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{u.email}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{u.branch || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select value={u.role} onChange={e => setRole(u.id, e.target.value)}
                      className="px-2 py-1.5 border border-[#d8d6cf] bg-white text-sm">
                      <option value="bl">BL</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                    {savingId === u.id && <Spinner />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(u)}
                      className="p-1.5 hover:bg-[#f0efe9] text-gray-500 hover:text-accent" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ type: 'user', id: u.id, label: u.full_name })}
                      className="p-1.5 hover:bg-clay/10 text-clay" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── All applications (admin can delete) ── */}
      <section className="ledger overflow-hidden">
        <div className="p-6 pb-3">
          <h2 className="font-display text-lg font-700">All applications</h2>
          <p className="text-sm text-gray-500">View and delete any application.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f0efe9] text-left font-mono text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Candidate</th>
                <th className="px-4 py-3 hidden sm:table-cell">Position</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 hidden md:table-cell">Date</th>
                <th className="px-4 py-3">Delete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-[#eee]">
                  <td className="px-5 py-3 font-medium">{r.candidate_name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{r.position || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{ background: (STAGES[r.bl_oje_pending ? 'sent_to_bl' : r.stage]?.color ?? '#999') + '22',
                               color: STAGES[r.bl_oje_pending ? 'sent_to_bl' : r.stage]?.color ?? '#999' }}>
                      {r.bl_oje_pending ? 'Sent to BL' : (STAGES[r.stage]?.label || r.stage)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 font-mono text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete({ type: 'application', id: r.id, label: r.candidate_name })}
                      className="p-1.5 hover:bg-clay/10 text-clay" title="Delete application">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">No applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Edit user modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditUser(null)} />
          <div className="relative bg-white p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-700">Edit user</h3>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <Field label="Full name" required>
                <input className={inputCls} value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
              </Field>
              <Field label="Branch">
                <select className={inputCls} value={editForm.branch}
                  onChange={e => setEditForm({ ...editForm, branch: e.target.value })}>
                  <option value="">No branch</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Role">
                <select className={inputCls} value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="bl">Branch Leader</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              {editErr && <div className="text-sm text-clay bg-clay/10 border border-clay/30 px-3 py-2">{editErr}</div>}
              <div className="flex gap-3">
                <Button type="submit" disabled={editBusy}>{editBusy ? <Spinner /> : 'Save changes'}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete dialog ── */}
      {confirmDelete && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${confirmDelete.label}"? This cannot be undone.`}
          onConfirm={() =>
            confirmDelete.type === 'user'
              ? deleteUser(confirmDelete.id)
              : deleteApplication(confirmDelete.id)
          }
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
