// Supabase Edge Function: admin-create-user
// Securely creates a new auth user. Only callable by an authenticated admin.
// Holds the service-role key server-side (never exposed to the browser).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Identify the caller from their JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return json({ error: 'Not authenticated' }, 401)
    }

    // 2. Verify the caller is an admin
    const { data: callerProfile } = await callerClient
      .from('profiles').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can create users' }, 403)
    }

    // 3. Validate input
    const { email, password, full_name, role, branch } = await req.json()
    if (!email || !password || !full_name || !role) {
      return json({ error: 'email, password, full_name and role are required' }, 400)
    }
    if (!['bl', 'hr', 'admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }
    if (String(password).length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    // 4. Create the user with the service-role key
    const admin = createClient(url, service)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // admin-created accounts are pre-confirmed
      user_metadata: { full_name, role, branch: branch ?? null, must_change_password: true },
    })
    if (error) return json({ error: error.message }, 400)

    return json({ user: { id: data.user?.id, email: data.user?.email } }, 200)
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
