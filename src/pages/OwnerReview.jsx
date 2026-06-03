import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import MarketRangeBadge from '../components/MarketRangeBadge'
import { getAgreement, getAssets, getRooms, upsertAsset } from '../services/supabase'
import { getMarketRate } from '../services/claude'
import { DEPRECIATION_RATES } from '../services/depreciation'

function extractCity(address) {
  if (!address) return 'India'
  const words = address.split(/[,\s]+/)
  return words[words.length - 2] || words[0] || 'India'
}

function CostEntryCard({ asset, city, onUpdate }) {
  const [local, setLocal] = useState(asset)
  const [marketRate, setMarketRate] = useState(null)
  const [loadingRate, setLoadingRate] = useState(false)
  const [saving, setSaving] = useState(false)

  const standardRate = DEPRECIATION_RATES[asset.category] ?? 10
  const rates = [standardRate - 2, standardRate - 1, standardRate, standardRate + 1, standardRate + 2].filter(r => r >= 1)

  useEffect(() => {
    setLoadingRate(true)
    getMarketRate(asset.item_name, city)
      .then(setMarketRate)
      .finally(() => setLoadingRate(false))
  }, [asset.item_name, city])

  async function update(field, value) {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    setSaving(true)
    await upsertAsset({ ...updated, owner_cost_filled: true })
    setSaving(false)
    onUpdate(updated)
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-ink">{asset.item_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tenant noted: <span className={asset.condition_at_movein === 'Good' ? 'text-[#2E9E6B]' : 'text-[#E05252]'}>{asset.condition_at_movein ?? 'Not documented'}</span>
          </p>
        </div>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>

      {(asset.move_in_photos?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {asset.move_in_photos.map((src, i) => (
            <img key={i} src={src} alt="" className="w-14 h-14 object-cover rounded border border-gray-200" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Full Replacement Cost (₹)</label>
          <input type="number" className="input-field" placeholder="e.g. 35000"
            value={local.replacement_cost ?? ''}
            onChange={e => update('replacement_cost', +e.target.value)} />
          {loadingRate ? (
            <p className="text-xs text-gray-400 mt-1">Loading market rate…</p>
          ) : marketRate && (
            <div className="mt-1">
              <MarketRangeBadge min={marketRate.market_rate_min} max={marketRate.market_rate_max} ownerCost={local.replacement_cost} sourceNote={marketRate.source_note} />
            </div>
          )}
        </div>

        {asset.condition_at_movein === 'Damaged' && (
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Repair Cost if Damaged (₹)</label>
            <input type="number" className="input-field" placeholder="e.g. 2000"
              value={local.repair_cost ?? ''}
              onChange={e => update('repair_cost', +e.target.value)} />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Depreciation Rate — {standardRate}%/year standard for {asset.category}
          </label>
          <div className="flex gap-1.5">
            {rates.map(r => (
              <button key={r} onClick={() => update('depreciation_rate_percent', r)}
                className={`text-xs px-2.5 py-1.5 rounded border font-mono font-semibold transition-all
                  ${(local.depreciation_rate_percent ?? standardRate) === r
                    ? 'bg-navy text-white border-navy'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                {r}%
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Adjustable ±2% only</p>
        </div>
      </div>
    </div>
  )
}

export default function OwnerReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    if (!id || id === 'enter') return
    Promise.all([getAgreement(id), getAssets(id), getRooms(id)]).then(([ag, items, rms]) => {
      setAgreement(ag)
      setAssets(items)
      setRooms(rms)
    })
  }, [id])

  const [codeInput, setCodeInput] = useState('')

  if (id === 'enter') {
    return (
      <div className="min-h-screen bg-paper">
        <TopAppBar />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <h1 className="page-title mb-3">Owner Review</h1>
          <p className="page-subtitle mb-8">Enter the code from the link your tenant sent you.</p>
          <input className="input-field mb-4" placeholder="Paste agreement code here…" value={codeInput} onChange={e => setCodeInput(e.target.value)} />
          <button onClick={() => navigate(`/owner-review/${codeInput.trim()}`)} disabled={!codeInput.trim()} className="btn-primary w-full justify-center">
            Open Registry
          </button>
        </div>
      </div>
    )
  }

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>
    </div>
  )

  const city = extractCity(agreement.property_address)
  const totalAssetValue = assets.reduce((sum, a) => sum + (a.replacement_cost ?? 0), 0)
  const allFilled = assets.filter(a => a.tier <= 2).every(a => a.replacement_cost > 0)

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="page-title mb-2">Review Asset Registry</h1>
        <p className="page-subtitle mb-6">
          {agreement.tenant_name} has documented your flat at {agreement.property_address}. Add the replacement cost for each item and sign to confirm.
        </p>

        {/* Agreement summary banner */}
        <div className="card bg-navy text-white mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-400 text-xs mb-0.5">Tenant</p><p className="font-semibold">{agreement.tenant_name}</p></div>
            <div><p className="text-gray-400 text-xs mb-0.5">Property</p><p className="font-semibold truncate">{agreement.property_address}</p></div>
            <div><p className="text-gray-400 text-xs mb-0.5">Rent</p><p className="font-semibold mono-amount">₹{Number(agreement.monthly_rent).toLocaleString('en-IN')}/mo</p></div>
            <div><p className="text-gray-400 text-xs mb-0.5">Deposit</p><p className="font-semibold mono-amount">₹{Number(agreement.deposit_amount).toLocaleString('en-IN')}</p></div>
          </div>
        </div>

        <div className="space-y-4">
          {assets.filter(a => a.tier <= 2).map(a => (
            <CostEntryCard key={a.id} asset={a} city={city}
              onUpdate={u => setAssets(p => p.map(x => x.id === u.id ? u : x))} />
          ))}
        </div>

        {rooms.length > 0 && (
          <div className="mt-8">
            <p className="section-label mb-4">Room Condition — Your Notes</p>
            <div className="space-y-3">
              {rooms.map(r => (
                <div key={r.id} className="card">
                  <p className="font-semibold text-ink mb-2">{r.room_name}</p>
                  {(r.move_in_photos?.length ?? 0) > 0 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {r.move_in_photos.map((src, i) => <img key={i} src={src} alt="" className="w-14 h-14 object-cover rounded border border-gray-200" />)}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mb-1">Tenant's notes: {r.move_in_notes || 'None'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 border border-gray-200 rounded bg-white">
          <div className="flex justify-between items-center mb-4">
            <p className="font-semibold text-ink">Total Asset Value</p>
            <p className="font-display text-xl font-bold text-navy mono-amount">₹{totalAssetValue.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={() => navigate(`/verify-costs?id=${id}`)} disabled={!allFilled}
            className={`btn-primary w-full justify-center py-3 ${!allFilled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            Review Complete — Send Back to Tenant →
          </button>
          {!allFilled && <p className="text-xs text-gray-400 text-center mt-2">Fill replacement cost for all Tier 1 & 2 items to continue</p>}
        </div>
      </div>
    </div>
  )
}
