import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, FilePlus2, Inbox, Users, LogOut, ListChecks, TableProperties, PlusCircle } from 'lucide-react'

const navByRole = {
  bl: [
    { to: '/bl',           label: 'Dashboard',       icon: LayoutDashboard, end: true },
    { to: '/bl/refer',     label: 'Refer candidate', icon: FilePlus2 },
    { to: '/bl/referrals', label: 'My referrals',    icon: ListChecks },
    { to: '/bl/inbox',     label: 'HR Inbox',        icon: Inbox },
  ],
  hr: [
    { to: '/hr',               label: 'Dashboard',        icon: LayoutDashboard, end: true },
    { to: '/hr/board',         label: 'Pipeline',         icon: Inbox },
    { to: '/hr/applications',  label: 'All applications', icon: TableProperties },
    { to: '/hr/create',        label: 'Create application', icon: PlusCircle },
  ],
  admin: [
    { to: '/admin',            label: 'Admin',            icon: Users,          end: true },
    { to: '/hr',               label: 'HR view',          icon: LayoutDashboard },
    { to: '/hr/board',         label: 'Pipeline',         icon: Inbox },
    { to: '/hr/applications',  label: 'All applications', icon: TableProperties },
    { to: '/hr/create',        label: 'Create application', icon: PlusCircle },
    { to: '/bl',               label: 'BL view',          icon: ListChecks },
    { to: '/bl/inbox',         label: 'HR Inbox',         icon: Inbox },
  ],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const items = navByRole[profile?.role] || []

  async function out() { await signOut(); nav('/login') }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-ink text-paper flex flex-col">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="bg-white rounded px-3 py-1.5 inline-block">
            <img
              src="/logo.png"
              alt="Johnny & Jugnu"
              style={{ height: '28px', width: 'auto', display: 'block' }}
            />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/50 mt-2">
            {profile?.role} workspace
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-sm">
            <div className="font-medium truncate">{profile?.full_name}</div>
            <div className="text-white/50 text-xs truncate">{profile?.email}</div>
          </div>
          <button onClick={out}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition">
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8"><Outlet /></div>
      </main>
    </div>
  )
}
