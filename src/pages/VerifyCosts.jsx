import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import ProgressStepper from '../components/ProgressStepper'
import MarketRangeBadge from '../components/MarketRangeBadge'
import { getAssets, upsertAsset } from '../services/supabase'

function fmt(n) { return `₹${Number(n).toLocaleString('en-IN')}` }

export default function VerifyCosts() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [disputing, setDisputing] = useState({})

  useEffect(() => {
    if (!id) return
    getAssets(id).then(setAssets)
  }, [id])

  async function approve(assetId) {
    await upsertAsset({ id: assetId, agreement_id: id, tenant_approved: true, tenant_disputed: false })
    setAssets(p => p.map(a => a.id === assetId ? { ...a, tenant_approved: true, tenant_disputed: false } : a))
  }

  async function dispute(assetId, note, suggestedCost) {
    await upsertAsset({ id: assetId, agreement_id: id, tenant_disputed: true, tenant_approved: false, dispute_note: note, agreed_cost: suggestedCost || null })
    setAssets(p => p.map(a => a.id === assetId ? { ...a, tenant_disputed: true, tenant_approved: false, dispute_note: note } : a))
    setDisputing(p => ({ ...p, [assetId]: false }))
  }

  const verifiableAssets = assets.filter(a => a.replacement_cost > 0)
  const approved = verifiableAssets.filter(a => a.tenant_approved).length
  const disputed = verifiableAssets.filter(a => a.tenant_disputed).length
  const totalAssetValue = verifiableAssets.reduce((s, a) => s + (a.replacement_cost ?? 0), 0)
  const canProceed = disputed === 0 && approved === verifiableAssets.length

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProgressStepper currentStep={4} />
        <h1 className="page-title mb-2">Verify Item Costs</h1>
        <p className="page-subtitle mb-2">Your owner has filled in the costs. Review each item — approve if fair, dispute if not.</p>
        <p className="text-lg font-display font-semibold text-navy mb-6">
          Total Asset Value: <span className="mono-amount">₹{totalAssetValue.toLocaleString('en-IN')}</span>
        </p>

        <div className="space-y-4">
          {verifiableAssets.map(a => (
            <div key={a.id} className={`card transition-all
              ${a.tenant_approved ? 'border-[#2E9E6B]/40 bg-[#2E9E6B]/3' : ''}
              ${a.tenant_disputed ? 'border-[#E05252]/40 bg-[#E05252]/3' : ''}
            `}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-ink">{a.item_name}</p>
                {a.tenant_approved && <span className="status-locked text-xs">Approved</span>}
                {a.tenant_disputed && <span className="status-dispute text-xs">Under Dispute</span>}
              </div>

              <p className="text-sm text-ink mb-1">
                Owner's Cost: <span className="font-semibold mono-amount">{fmt(a.replacement_cost)}</span>
              </p>
              {a.market_rate_min && (
                <div className="mb-3">
                  <MarketRangeBadge min={a.market_rate_min} max={a.market_rate_max} ownerCost={a.replacement_cost} />
                </div>
              )}
              <p className="text-xs text-gray-500 mb-3">
                Depreciation: {a.depreciation_rate_percent ?? 10}%/yr · Category: {a.category}
              </p>

              {!a.tenant_approved && !disputing[a.id] && !a.tenant_disputed && (
                <div className="flex gap-2">
                  <button onClick={() => approve(a.id)} className="btn-primary text-sm py-1.5 gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    Approve
                  </button>
                  <button onClick={() => setDisputing(p => ({ ...p, [a.id]: { note: '', cost: '' } }))}
                    className="btn-secondary text-sm py-1.5 gap-1.5 text-[#E8A020] border-[#E8A020] hover:bg-[#E8A020] hover:text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    Dispute
                  </button>
                </div>
              )}

              {disputing[a.id] && (
                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Why are you disputing?</label>
                    <textarea rows={2} className="input-field resize-none text-sm"
                      value={disputing[a.id].note} onChange={e => setDisputing(p => ({ ...p, [a.id]: { ...p[a.id], note: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Your suggested cost (₹)</label>
                    <input type="number" className="input-field"
                      value={disputing[a.id].cost} onChange={e => setDisputing(p => ({ ...p, [a.id]: { ...p[a.id], cost: e.target.value } }))} />
                    {a.market_rate_min && <MarketRangeBadge min={a.market_rate_min} max={a.market_rate_max} />}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => dispute(a.id, disputing[a.id].note, disputing[a.id].cost)} className="btn-danger text-sm py-1.5">Submit Dispute</button>
                    <button onClick={() => setDisputing(p => ({ ...p, [a.id]: false }))} className="btn-ghost text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 border border-gray-200 rounded bg-white">
          <p className="text-sm text-gray-500 mb-4">Approved: {approved}/{verifiableAssets.length} · Under Dispute: {disputed}</p>
          <button onClick={() => navigate(`/sign?id=${id}`)} disabled={!canProceed}
            className={`btn-primary w-full justify-center py-3 ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}>
            Proceed to Sign →
          </button>
          {!canProceed && <p className="text-xs text-gray-400 text-center mt-2">Resolve all disputes to proceed</p>}
        </div>
      </div>
    </div>
  )
}
