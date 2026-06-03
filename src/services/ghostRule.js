import { getSignature, upsertSignature } from './supabase'

export const GHOST_RULE_HOURS = 72
export const REMINDER_HOURS = 48

/**
 * Check if ghost rule should fire and update signature status.
 * Call this when tenant loads their dashboard or any status screen.
 */
export async function checkGhostRule(agreementId) {
  const sig = await getSignature(agreementId)
  if (!sig) return null

  // Already locked — nothing to do
  if (sig.registry_status === 'Locked' || sig.registry_status === 'Owner Non-Responsive') {
    return sig
  }

  if (!sig.owner_notified_at) return sig

  const notifiedAt = new Date(sig.owner_notified_at)
  const now = new Date()
  const hoursElapsed = (now - notifiedAt) / (1000 * 60 * 60)

  if (hoursElapsed >= GHOST_RULE_HOURS && !sig.owner_signed) {
    return await upsertSignature({
      agreement_id: agreementId,
      registry_status: 'Owner Non-Responsive',
      registry_locked_at: now.toISOString(),
    })
  }

  return sig
}

export function hoursUntilGhostRule(ownerNotifiedAt) {
  if (!ownerNotifiedAt) return null
  const elapsed = (Date.now() - new Date(ownerNotifiedAt)) / (1000 * 60 * 60)
  return Math.max(0, GHOST_RULE_HOURS - elapsed)
}
