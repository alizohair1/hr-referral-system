import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Loads the admin-defined custom form fields, ordered.
export function useFormFields({ activeOnly = false } = {}) {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    let q = supabase.from('form_fields').select('*').order('sort_order')
    if (activeOnly) q = q.eq('active', true)
    const { data } = await q
    setFields(data ?? [])
    setLoading(false)
  }, [activeOnly])

  useEffect(() => { load() }, [load])
  return { fields, loading, reload: load }
}
