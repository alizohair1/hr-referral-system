import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  // Calls the secure Edge Function to create a user (admin only, enforced server-side)
  async function createUser({ email, password, full_name, role, branch }) {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email, password, full_name, role, branch },
    })
    if (error) {
      // surface the function's JSON error message if present
      let msg = error.message
      try { const ctx = await error.context?.json(); if (ctx?.error) msg = ctx.error } catch {}
      throw new Error(msg)
    }
    if (data?.error) throw new Error(data.error)
    return data
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, createUser, refreshProfile: () => session && loadProfile(session.user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}
