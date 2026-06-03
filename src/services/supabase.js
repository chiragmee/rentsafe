import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Agreements ──────────────────────────────────────────────────────────────

export async function createAgreement(data) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row, error } = await supabase
    .from('agreements')
    .insert({ ...data, user_id: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return row
}

export async function getMyAgreements() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('agreements')
    .select('id, tenant_name, owner_name, property_address, monthly_rent, deposit_amount, tenure_start_date, tenure_months, parsed_at')
    .eq('user_id', user.id)
    .order('parsed_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAgreement(id) {
  const { data, error } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updateAgreement(id, updates) {
  const { data, error } = await supabase
    .from('agreements')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Assets ───────────────────────────────────────────────────────────────────

export async function getAssets(agreementId) {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('tier', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertAsset(asset) {
  const { data, error } = await supabase
    .from('assets')
    .upsert(asset)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAsset(id) {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

export async function insertAssets(assets) {
  const { data, error } = await supabase.from('assets').insert(assets).select()
  if (error) throw error
  return data
}

// ── Room Conditions ──────────────────────────────────────────────────────────

export async function getRooms(agreementId) {
  const { data, error } = await supabase
    .from('room_conditions')
    .select('*')
    .eq('agreement_id', agreementId)
  if (error) throw error
  return data
}

export async function upsertRoom(room) {
  const { data, error } = await supabase
    .from('room_conditions')
    .upsert(room)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Signatures ───────────────────────────────────────────────────────────────

export async function getSignature(agreementId) {
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('agreement_id', agreementId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertSignature(sig) {
  const { data, error } = await supabase
    .from('signatures')
    .upsert(sig)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Settlement ────────────────────────────────────────────────────────────────

export async function getSettlement(agreementId) {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('agreement_id', agreementId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertSettlement(settlement) {
  const { data, error } = await supabase
    .from('settlements')
    .upsert(settlement)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Utility Settlements ───────────────────────────────────────────────────────

export async function getUtilitySettlement(agreementId) {
  const { data } = await supabase
    .from('utility_settlements')
    .select('*')
    .eq('agreement_id', agreementId)
    .single()
  return data
}

export async function upsertUtilitySettlement(data) {
  const { data: row, error } = await supabase
    .from('utility_settlements')
    .upsert(data)
    .select()
    .single()
  if (error) throw error
  return row
}

// ── Video Upload ──────────────────────────────────────────────────────────────

export async function uploadVideo(file, agreementId) {
  const ext = file.name?.split('.').pop() || 'mp4'
  const path = `${agreementId}/walkthrough/walkthrough.${ext}`
  const { error } = await supabase.storage
    .from('rentsafe-photos')
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('rentsafe-photos').getPublicUrl(path)
  return data.publicUrl
}

// ── Photo Storage ─────────────────────────────────────────────────────────────

export async function uploadPhoto(file, agreementId, context) {
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `${agreementId}/${context}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('rentsafe-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('rentsafe-photos').getPublicUrl(path)
  return data.publicUrl
}
