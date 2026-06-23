import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Layout from './components/Layout'

import BLDashboard from './pages/bl/BLDashboard'
import ReferForm from './pages/bl/ReferForm'
import MyReferrals from './pages/bl/MyReferrals'
import BLInbox from './pages/bl/BLInbox'

import HRDashboard from './pages/hr/HRDashboard'
import HRBoard from './pages/hr/HRBoard'
import HRAllApplications from './pages/hr/HRAllApplications'
import HRCreateApplication from './pages/hr/HRCreateApplication'

import AdminPanel from './pages/admin/AdminPanel'

function Guard({ allow, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="h-screen grid place-items-center"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace />
  if (profile?.must_change_password) return <Navigate to="/change-password" replace />
  if (profile && allow && !allow.includes(profile.role))
    return <Navigate to="/" replace />
  return children
}

function Home() {
  const { profile, loading } = useAuth()
  if (loading) return <div className="h-screen grid place-items-center"><Spinner /></div>
  if (!profile) return <Navigate to="/login" replace />
  if (profile.must_change_password) return <Navigate to="/change-password" replace />
  if (profile.role === 'bl')    return <Navigate to="/bl" replace />
  if (profile.role === 'hr')    return <Navigate to="/hr" replace />
  if (profile.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/" element={<Home />} />

      <Route element={<Guard allow={['bl','admin']}><Layout /></Guard>}>
        <Route path="/bl"            element={<BLDashboard />} />
        <Route path="/bl/refer"      element={<ReferForm />} />
        <Route path="/bl/referrals"  element={<MyReferrals />} />
        <Route path="/bl/inbox"      element={<BLInbox />} />
      </Route>

      <Route element={<Guard allow={['hr','admin']}><Layout /></Guard>}>
        <Route path="/hr"                  element={<HRDashboard />} />
        <Route path="/hr/board"            element={<HRBoard />} />
        <Route path="/hr/applications"     element={<HRAllApplications />} />
        <Route path="/hr/create"           element={<HRCreateApplication />} />
      </Route>

      <Route element={<Guard allow={['admin']}><Layout /></Guard>}>
        <Route path="/admin" element={<AdminPanel />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
