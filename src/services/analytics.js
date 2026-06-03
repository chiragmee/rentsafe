import { supabase } from './supabase'

// Fire-and-forget — never blocks UI, never throws
export async function track(eventName, agreementId = null, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      agreement_id: agreementId,
      user_id: user?.id ?? null,
      metadata,
    })
  } catch {
    // Silent fail — analytics must never break the product
  }
}
