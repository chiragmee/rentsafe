// Supabase Edge Function — Ghost Rule
// Runs every hour via pg_cron (set up in Supabase dashboard).
// Locks any registry where owner_notified_at > 72 hours ago
// and owner has not signed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const GHOST_RULE_HOURS = 72

Deno.serve(async () => {
  const cutoff = new Date(Date.now() - GHOST_RULE_HOURS * 60 * 60 * 1000).toISOString()

  // Find all signatures where:
  // - owner was notified more than 72 hours ago
  // - owner has NOT signed
  // - status is still Pending Owner (not already locked)
  const { data: pending, error } = await supabase
    .from('signatures')
    .select('agreement_id')
    .eq('registry_status', 'Pending Owner')
    .eq('owner_signed', false)
    .lt('owner_notified_at', cutoff)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ locked: 0 }), { status: 200 })
  }

  const ids = pending.map((r) => r.agreement_id)

  const { error: updateError } = await supabase
    .from('signatures')
    .update({
      registry_status: 'Owner Non-Responsive',
      registry_locked_at: new Date().toISOString(),
    })
    .in('agreement_id', ids)

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })
  }

  console.log(`Ghost rule fired: locked ${ids.length} registries`, ids)

  return new Response(JSON.stringify({ locked: ids.length, agreement_ids: ids }), { status: 200 })
})
