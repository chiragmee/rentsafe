import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import ProgressStepper from '../components/ProgressStepper'
import PhotoGrid from '../components/PhotoGrid'
import { getAgreement, getAssets, upsertAsset, upsertSignature, uploadPhoto } from '../services/supabase'

const CONDITIONS = ['Good', 'Damaged', 'Missing']

function ItemCard({ asset, agreementId, onUpdate }) {
  const [local, setLocal] = useState(asset)
  const [saving, setSaving] = useState(false)

  async function update(field, value) {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    setSaving(true)
    await upsertAsset(updated)
    setSaving(false)
    onUpdate(updated)
  }

  async function addPhoto(file) {
    setSaving(true)
    const url = await uploadPhoto(file, agreementId, `assets/${asset.id}`)
    const photos = [...(local.move_in_photos ?? []), url]
    await update('move_in_photos', photos)
    setSaving(false)
  }

  const minPhotos = 0
  const isDone = !!local.condition_at_movein

  return (
    <div className={`rounded border p-3 transition-all ${isDone ? 'border-[#2E9E6B]/40 bg-[#2E9E6B]/3' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-ink">{asset.item_name}</span>
            <span className="text-xs text-gray-400">×{asset.quantity}</span>
            {asset.replacement_cost > 0 && (
              <span className="text-xs text-gray-400 font-mono">₹{Number(asset.replacement_cost).toLocaleString('en-IN')}</span>
            )}
            {asset.tier === 1 && <span className="badge-tier1 text-[10px]">High Value</span>}
            {asset.tier === 2 && <span className="badge-tier2 text-[10px]">Disputed</span>}
          </div>
          {saving && <span className="text-[10px] text-gray-400">Saving…</span>}
        </div>
        {isDone && (
          <span className="text-[#2E9E6B] text-xs font-semibold flex items-center gap-1 flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            Done
          </span>
        )}
      </div>

      {/* Condition */}
      <div className="flex gap-1.5 mb-2">
        {CONDITIONS.map(c => (
          <button key={c} onClick={() => update('condition_at_movein', c)}
            className={`text-xs px-2.5 py-1 rounded border font-medium transition-all
              ${local.condition_at_movein === c
                ? c === 'Good' ? 'bg-[#2E9E6B] border-[#2E9E6B] text-white'
                  : 'bg-[#E05252] border-[#E05252] text-white'
                : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Photos */}
      <PhotoGrid
        photos={local.move_in_photos ?? []}
        onAdd={addPhoto}
        onRemove={i => update('move_in_photos', (local.move_in_photos ?? []).filter((_, idx) => idx !== i))}
        minPhotos={minPhotos}
      />

      {/* Notes */}
      <textarea rows={1} placeholder="Pre-existing issues (optional)"
        className="input-field text-xs mt-2 resize-none"
        value={local.move_in_notes ?? ''}
        onChange={e => update('move_in_notes', e.target.value)}
      />
    </div>
  )
}

function RoomSection({ roomName, assets, agreementId, onUpdate }) {
  const [open, setOpen] = useState(true)
  const done = assets.filter(a => a.condition_at_movein).length
  const required = assets.length
  const allDone = done >= required && required > 0

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allDone ? 'bg-[#2E9E6B]' : 'bg-gray-300'}`} />
          <span className="font-display font-semibold text-navy text-sm">{roomName}</span>
          <span className="text-xs text-gray-400">{assets.length} items</span>
        </div>
        <div className="flex items-center gap-2">
          {allDone
            ? <span className="status-locked text-[10px]">Complete</span>
            : <span className="text-xs text-gray-400">{done}/{required} documented</span>
          }
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-3 space-y-2">
          {assets.map(a => (
            <ItemCard key={a.id} asset={a} agreementId={agreementId} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Registry() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id)]).then(([ag, items]) => {
      setAgreement(ag)
      // If no room_name on assets → redirect to BHK setup
      if (items.length === 0 || items.every(a => !a.room_name)) {
        navigate(`/bhk-setup?id=${id}`)
        return
      }
      setAssets(items)
    })
  }, [id])

  function updateAsset(updated) {
    setAssets(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  // Group assets by room
  const rooms = [...new Set(assets.map(a => a.room_name ?? 'Other'))].filter(Boolean)
  const byRoom = rooms.reduce((acc, room) => {
    acc[room] = assets.filter(a => (a.room_name ?? 'Other') === room)
    return acc
  }, {})

  const totalRequired = assets.length
  const totalDone = assets.filter(a => a.condition_at_movein).length
  const canSend = totalDone >= totalRequired && totalRequired > 0

  async function handleSend() {
    setSaving(true)
    await upsertSignature({
      agreement_id: id,
      registry_status: 'Pending Owner',
      owner_notified_at: new Date().toISOString(),
    })
    navigate(`/sign?id=${id}`)
  }

  const [saving2, setSaving] = useState(false)

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProgressStepper currentStep={2} />
        <h1 className="page-title mb-2">Document Your Flat</h1>
        <p className="page-subtitle mb-2">
          Set condition and take photos for each item. This is your protection at move-out.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {totalDone}/{totalRequired} required items documented
        </p>

        <div className="space-y-3">
          {rooms.map(room => (
            <RoomSection
              key={room}
              roomName={room}
              assets={byRoom[room]}
              agreementId={id}
              onUpdate={updateAsset}
            />
          ))}
        </div>

        <div className="mt-8 p-4 border border-gray-200 rounded bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              {totalDone}/{totalRequired} items complete
            </p>
            {!canSend && (
              <p className="text-xs text-gray-400">Document all Tier 1 & 2 items to continue</p>
            )}
          </div>
          <button onClick={handleSend} disabled={!canSend || sending}
            className={`btn-primary w-full justify-center py-3 ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {sending ? 'Sending…' : 'Send to Owner →'}
          </button>
        </div>
      </div>
    </div>
  )
}
