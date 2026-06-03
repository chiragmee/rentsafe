import { supabase } from './supabase'

/**
 * Calculate and save the protection score for an agreement.
 * Score out of 100:
 *   Room coverage  — 30 pts  (rooms with condition set / total rooms)
 *   Asset coverage — 30 pts  (tier1+2 items with condition / total tier1+2)
 *   Photo coverage — 20 pts  (items with ≥1 photo / total tier1+2)
 *   Walkthrough    — 20 pts  (video uploaded)
 */
export function calculateScore({ assets, rooms, hasVideo }) {
  const tier12 = assets.filter(a => a.tier <= 2)
  const totalRooms = rooms.length || 1
  const totalAssets = tier12.length || 1

  const documentedRooms = rooms.filter(r => r.condition_at_movein).length
  const documentedAssets = tier12.filter(a => a.condition_at_movein).length
  const assetsWithPhotos = tier12.filter(a => (a.move_in_photos?.length ?? 0) >= 1).length

  const roomScore  = Math.round((documentedRooms / totalRooms) * 30)
  const assetScore = Math.round((documentedAssets / totalAssets) * 30)
  const photoScore = Math.round((assetsWithPhotos / totalAssets) * 20)
  const videoScore = hasVideo ? 20 : 0

  const score = roomScore + assetScore + photoScore + videoScore

  const confidence =
    score >= 90 ? 'HIGH' :
    score >= 70 ? 'MEDIUM' : 'LOW'

  return {
    score,
    room_coverage_percent:  Math.round((documentedRooms / totalRooms) * 100),
    asset_coverage_percent: Math.round((documentedAssets / totalAssets) * 100),
    photo_coverage_percent: Math.round((assetsWithPhotos / totalAssets) * 100),
    walkthrough_video_present: hasVideo,
    estimated_recovery_confidence: confidence,
    breakdown: { roomScore, assetScore, photoScore, videoScore },
  }
}

export async function saveProtectionScore(agreementId, scoreData) {
  const { data, error } = await supabase
    .from('protection_scores')
    .upsert({ agreement_id: agreementId, ...scoreData })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getProtectionScore(agreementId) {
  const { data } = await supabase
    .from('protection_scores')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()
  return data
}
