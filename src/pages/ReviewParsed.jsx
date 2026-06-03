import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import ProgressStepper from '../components/ProgressStepper'
import ComplianceBanner from '../components/ComplianceBanner'
import { getAgreement, getAssets, updateAgreement, upsertAsset, deleteAsset } from '../services/supabase'
import { checkCompliance } from '../services/compliance'
import { DEPRECIATION_RATES } from '../services/depreciation'

const STATES = ['Karnataka','Maharashtra','Delhi','Tamil Nadu','West Bengal','Telangana','Gujarat','Rajasthan','Other']
const CATEGORIES = ['Furniture','Electrical','Fixtures','Plumbing','Other']

function fmt(n) { return n ? new Date(n).toLocaleDateString('en-IN') : '—' }
function addMonths(date, months) {
  if (!date || !months) return null
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

export default function ReviewParsed() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [flags, setFlags] = useState([])
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id)]).then(([ag, items]) => {
      setAgreement(ag)
      setAssets(items)
      setFlags(checkCompliance(ag))
    })
  }, [id])

  function updateField(field, value) {
    const updated = { ...agreement, [field]: value }
    setAgreement(updated)
    setFlags(checkCompliance(updated))
  }

  async function save() {
    setSaving(true)
    await updateAgreement(id, agreement)
    navigate(`/bhk-setup?id=${id}`)
  }

  async function removeItem(assetId) {
    await deleteAsset(assetId)
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
  }

  async function addItem() {
    if (!newItem?.item_name) return
    const asset = await upsertAsset({ agreement_id: id, ...newItem, tier: newItem.tier ?? 3, quantity: newItem.quantity ?? 1 })
    setAssets((prev) => [...prev, asset])
    setNewItem(null)
  }

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">
        {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
      </div>
    </div>
  )

  const tier1 = assets.filter(a => a.tier === 1)
  const tier2 = assets.filter(a => a.tier === 2)
  const tier3 = assets.filter(a => a.tier === 3)
  const endDate = addMonths(agreement.tenure_start_date, agreement.tenure_months)

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProgressStepper currentStep={1} />
        <h1 className="page-title mb-2">Review Your Agreement Details</h1>
        <p className="page-subtitle mb-6">We've read your agreement. Check if everything looks right before continuing.</p>

        <ComplianceBanner flags={flags} />

        <div className="space-y-4">
          {/* Parties */}
          <div className="card">
            <p className="section-label mb-4">Parties</p>
            <div className="grid grid-cols-2 gap-4">
              {[['Tenant Name','tenant_name'],['Owner Name','owner_name'],['Tenant Phone','tenant_phone'],['Owner Phone','owner_phone']].map(([label, field]) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input className="input-field" value={agreement[field] ?? ''} onChange={e => updateField(field, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Property */}
          <div className="card">
            <p className="section-label mb-4">Property</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Property Address</label>
                <textarea rows={2} className="input-field resize-none" value={agreement.property_address ?? ''} onChange={e => updateField('property_address', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Property State</label>
                <select className="input-field" value={agreement.property_state ?? ''} onChange={e => updateField('property_state', e.target.value)}>
                  <option value="">— Select state —</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div className="card">
            <p className="section-label mb-4">Financial Terms</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monthly Rent (₹)</label>
                <input type="number" className="input-field" value={agreement.monthly_rent ?? ''} onChange={e => updateField('monthly_rent', +e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Security Deposit (₹)</label>
                <input type="number" className="input-field" value={agreement.deposit_amount ?? ''} onChange={e => updateField('deposit_amount', +e.target.value)} />
                {flags.find(f => f.id === 'NON_COMPLIANT_DEPOSIT') && (
                  <p className="text-xs text-[#E05252] mt-1">Exceeds state legal cap</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Rent Escalation (%)</label>
                <input type="number" className="input-field" value={agreement.rent_escalation_percent ?? ''} onChange={e => updateField('rent_escalation_percent', +e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notice Period (days)</label>
                <input type="number" className="input-field" value={agreement.notice_period_days ?? ''} onChange={e => updateField('notice_period_days', +e.target.value)} />
              </div>
            </div>
          </div>

          {/* Tenure */}
          <div className="card">
            <p className="section-label mb-4">Tenure</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <input type="date" className="input-field" value={agreement.tenure_start_date ?? ''} onChange={e => updateField('tenure_start_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Duration (months)</label>
                <input type="number" className="input-field" value={agreement.tenure_months ?? ''} onChange={e => updateField('tenure_months', +e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                <input className="input-field bg-gray-50 text-gray-500" readOnly value={endDate ? fmt(endDate) : '—'} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <p className="section-label mb-4">Items Found</p>
            {tier1.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">Tier 1 — High Value</p>
                {tier1.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="badge-tier1">High Value</span>
                      <span className="text-sm text-ink">{a.item_name}</span>
                      <span className="text-xs text-gray-400">×{a.quantity}</span>
                    </div>
                    <button onClick={() => removeItem(a.id)} className="text-gray-300 hover:text-[#E05252] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tier2.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">Tier 2 — Frequently Disputed</p>
                {tier2.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="badge-tier2">Disputed</span>
                      <span className="text-sm text-ink">{a.item_name}</span>
                      <span className="text-xs text-gray-400">×{a.quantity}</span>
                    </div>
                    <button onClick={() => removeItem(a.id)} className="text-gray-300 hover:text-[#E05252] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tier3.length > 0 && (
              <details className="mb-4">
                <summary className="text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600 mb-2">Additional Items (optional) — {tier3.length}</summary>
                {tier3.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 pl-4">
                    <div className="flex items-center gap-2">
                      <span className="badge-tier3">Optional</span>
                      <span className="text-sm text-ink">{a.item_name}</span>
                      <span className="text-xs text-gray-400">×{a.quantity}</span>
                    </div>
                    <button onClick={() => removeItem(a.id)} className="text-gray-300 hover:text-[#E05252] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </details>
            )}

            {newItem !== null ? (
              <div className="mt-4 p-4 border border-gray-200 rounded bg-gray-50 space-y-3">
                <p className="text-sm font-semibold text-navy">Add Item</p>
                <input className="input-field" placeholder="Item name" value={newItem.item_name ?? ''} onChange={e => setNewItem(p => ({...p, item_name: e.target.value}))} />
                <div className="grid grid-cols-3 gap-2">
                  <select className="input-field" value={newItem.category ?? 'Other'} onChange={e => setNewItem(p => ({...p, category: e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select className="input-field" value={newItem.tier ?? 3} onChange={e => setNewItem(p => ({...p, tier: +e.target.value}))}>
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                  <input type="number" className="input-field" placeholder="Qty" min={1} value={newItem.quantity ?? 1} onChange={e => setNewItem(p => ({...p, quantity: +e.target.value}))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addItem} className="btn-primary text-sm">Add</button>
                  <button onClick={() => setNewItem(null)} className="btn-ghost text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewItem({ item_name: '', category: 'Other', tier: 3, quantity: 1 })} className="btn-ghost text-sm mt-2 gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add item manually
              </button>
            )}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full justify-center mt-6 py-3 text-base">
          {saving ? 'Saving…' : 'Looks Good — Document the Flat →'}
        </button>
      </div>
    </div>
  )
}
