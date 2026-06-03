import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import PhotoGrid from '../components/PhotoGrid'
import { getAgreement, getAssets, getRooms, upsertAsset, upsertRoom, uploadPhoto } from '../services/supabase'
import { calculateCharge, DEPRECIATION_RATES } from '../services/depreciation'

const CONDITIONS = ['Good', 'Damaged', 'Missing']
const ROOM_CONDITIONS = ['Good', 'Minor Issues', 'Major Issues']

function fmt(n) { return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—' }

function MoveOutAssetCard({ asset, agreementId, moveOutDate, tenureStart, onUpdate }) {
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
    const url = await uploadPhoto(file, agreementId, `moveout/assets/${asset.id}`)
    const photos = [...(local.move_out_photos ?? []), url]
    await update('move_out_photos', photos)
    setSaving(false)
  }

  const rate = local.depreciation_rate_percent ?? DEPRECIATION_RATES[asset.category] ?? 10
  const estimatedCharge = local.condition_at_moveout !== 'Good' && local.replacement_cost
    ? calculateCharge({ replacementCost: local.replacement_cost, depreciationRate: rate, moveInDate: tenureStart, moveOutDate })
    : 0

  return (
    <div className="card">
      <p className="font-semibold text-ink mb-1">{asset.item_name}</p>
      {saving && <span className="text-xs text-gray-400">Saving…</span>}

      {/* Move-in reference */}
      <div className="p-2.5 bg-gray-50 rounded border border-gray-100 mb-3 text-xs">
        <span className="font-semibold text-gray-500">Move-In: </span>
        <span className={asset.condition_at_movein === 'Good' ? 'text-[#2E9E6B]' : 'text-[#E05252]'}>{asset.condition_at_movein ?? '—'}</span>
        <span className="text-gray-400 mx-2">·</span>
        <span className="mono-amount font-semibold">{fmt(asset.replacement_cost)}</span>
        {(asset.move_in_photos?.length ?? 0) > 0 && (
          <div className="flex gap-1 mt-1.5">
            {asset.move_in_photos.slice(0, 3).map((src, i) => (
              <img key={i} src={src} alt="" className="w-10 h-10 object-cover rounded border border-gray-200" />
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1.5">Current Condition</p>
        <div className="flex gap-2">
          {CONDITIONS.map(c => (
            <button key={c} onClick={() => update('condition_at_moveout', c)}
              className={`text-xs px-3 py-1.5 rounded border font-medium transition-all
                ${local.condition_at_moveout === c
                  ? c === 'Good' ? 'bg-[#2E9E6B] border-[#2E9E6B] text-white' : 'bg-[#E05252] border-[#E05252] text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1.5">Move-Out Photos (min 1)</p>
        <PhotoGrid
          photos={local.move_out_photos ?? []}
          onAdd={addPhoto}
          onRemove={(i) => {
            const photos = (local.move_out_photos ?? []).filter((_, idx) => idx !== i)
            update('move_out_photos', photos)
          }}
          minPhotos={1}
        />
      </div>

      {local.condition_at_moveout && local.condition_at_moveout !== 'Good' && local.replacement_cost && (
        <div className="p-2.5 bg-[#E05252]/5 border border-[#E05252]/20 rounded text-xs">
          <span className="font-semibold text-[#E05252]">Estimated charge: </span>
          <span className="mono-amount font-bold text-ink">{fmt(estimatedCharge)}</span>
          <span className="text-gray-400 ml-1">(depreciation {rate}%/yr applied)</span>
        </div>
      )}
    </div>
  )
}

export default function MoveOut() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [rooms, setRooms] = useState([])
  const [tab, setTab] = useState('items')
  const moveOutDate = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id), getRooms(id)]).then(([ag, items, rms]) => {
      setAgreement(ag)
      setAssets(items)
      setRooms(rms)
    })
  }, [id])

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>
    </div>
  )

  const itemsDone = assets.filter(a => a.tier <= 2 && a.condition_at_moveout && (a.move_out_photos?.length ?? 0) >= 1).length
  const itemsTotal = assets.filter(a => a.tier <= 2).length
  const roomsDone = rooms.filter(r => r.condition_at_moveout).length

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="page-title mb-2">Move-Out Audit</h1>
        <p className="page-subtitle mb-6">Re-photograph each item and room. Settlement will be calculated automatically.</p>

        <div className="flex gap-1 bg-gray-100 p-1 rounded mb-6">
          {['items', 'rooms'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded capitalize transition-all
                ${tab === t ? 'bg-white text-navy shadow-low' : 'text-gray-500 hover:text-navy'}`}>
              {t === 'items' ? `Items (${itemsDone}/${itemsTotal})` : `Rooms (${roomsDone}/${rooms.length})`}
            </button>
          ))}
        </div>

        {tab === 'items' && (
          <div className="space-y-4">
            {assets.filter(a => a.tier <= 2).map(a => (
              <MoveOutAssetCard key={a.id} asset={a} agreementId={id} moveOutDate={moveOutDate}
                tenureStart={agreement.tenure_start_date}
                onUpdate={u => setAssets(p => p.map(x => x.id === u.id ? u : x))} />
            ))}
          </div>
        )}

        {tab === 'rooms' && (
          <div className="space-y-4">
            {rooms.map(r => (
              <div key={r.id} className="card">
                <p className="font-semibold text-ink mb-2">{r.room_name}</p>
                <div className="p-2.5 bg-gray-50 rounded border border-gray-100 mb-3 text-xs">
                  <span className="font-semibold text-gray-500">Move-In: </span>
                  <span>{r.condition_at_movein ?? '—'}</span>
                  {(r.move_in_photos?.length ?? 0) > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {r.move_in_photos.slice(0, 3).map((src, i) => <img key={i} src={src} alt="" className="w-10 h-10 object-cover rounded" />)}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1.5">Current Condition</p>
                  <div className="flex gap-2">
                    {ROOM_CONDITIONS.map(c => (
                      <button key={c} onClick={() => upsertRoom({ ...r, condition_at_moveout: c }).then(u => setRooms(p => p.map(x => x.id === u.id ? u : x)))}
                        className={`text-xs px-3 py-1.5 rounded border font-medium transition-all
                          ${r.condition_at_moveout === c
                            ? c === 'Good' ? 'bg-[#2E9E6B] border-[#2E9E6B] text-white'
                              : 'bg-[#E8A020] border-[#E8A020] text-white'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate(`/settlement?id=${id}`)} className="btn-primary w-full justify-center py-3 mt-8">
          Calculate Settlement →
        </button>
      </div>
    </div>
  )
}
