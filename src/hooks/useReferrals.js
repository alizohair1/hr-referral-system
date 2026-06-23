import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Live list of referrals (RLS scopes rows per role). Realtime keeps inboxes in sync.
export function useReferrals() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('referrals')
      .select('*, referrer:referred_by(full_name,branch), claimer:claimed_by(full_name)')
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('referrals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  return { rows, loading, reload: load }
}
