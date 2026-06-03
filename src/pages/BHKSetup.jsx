import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import ProgressStepper from '../components/ProgressStepper'
import { getAgreement, getAssets, insertAssets, deleteAsset, updateAgreement } from '../services/supabase'
import { BHK_CONFIGS, ROOM_ITEM_TEMPLATES, buildRoomItems, detectBHK } from '../config/roomTemplates'

function templateKey(roomName) {
  if (roomName.startsWith('Bedroom')) return 'Bedroom'
  if (roomName.startsWith('Bathroom')) return 'Bathroom'
  return roomName
}

export default function BHKSetup() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()

  const [agreement, setAgreement] = useState(null)
  const [parsedAssets, setParsedAssets] = useState([])
  const [selectedBHK, setSelectedBHK] = useState(null)
  const [detectedBHK, setDetectedBHK] = useState(null)
  const [roomData, setRoomData] = useState([])
  const [step, setStep] = useState('select') // 'select' | 'configure'
  const [saving, setSaving] = useState(false)
  const [newItemRoom, setNewItemRoom] = useState(null)
  const [paintingAgreed, setPaintingAgreed] = useState(false)
  const [paintingAmount, setPaintingAmount] = useState(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id)]).then(([ag, assets]) => {
      setAgreement(ag)
      setParsedAssets(assets)
      setPaintingAmount(ag.monthly_rent ?? null)
      const detected = detectBHK(ag.raw_agreement_text ?? '')
      setDetectedBHK(detected)
      if (detected) setSelectedBHK(detected)
    })
  }, [id])

  function handleBHKSelect(bhk) {
    setSelectedBHK(bhk)
    const rooms = buildRoomItems(bhk, parsedAssets)
    setRoomData(rooms)
    setStep('configure')
  }

  function updateItem(roomIdx, itemIdx, field, value) {
    setRoomData(prev => prev.map((r, ri) =>
      ri !== roomIdx ? r : {
        ...r,
        items: r.items.map((it, ii) =>
          ii !== itemIdx ? it : { ...it, [field]: value }
        )
      }
    ))
  }

  function removeItem(roomIdx, itemIdx) {
    setRoomData(prev => prev.map((r, ri) =>
      ri !== roomIdx ? r : { ...r, items: r.items.filter((_, ii) => ii !== itemIdx) }
    ))
  }

  function addCustomItem(roomIdx, item) {
    setRoomData(prev => prev.map((r, ri) =>
      ri !== roomIdx ? r : { ...r, items: [...r.items, item] }
    ))
    setNewItemRoom(null)
  }

  async function handleConfirm() {
    setSaving(true)
    // Save painting charges agreement to agreement record
    await updateAgreement(id, {
      painting_charges_agreed: paintingAgreed,
      painting_charges_amount: paintingAgreed ? (paintingAmount ?? agreement.monthly_rent) : null,
    })
    // Delete old parsed assets (no room_name) — replaced with room-structured ones
    for (const a of parsedAssets) {
      await deleteAsset(a.id)
    }
    const toInsert = roomData.flatMap(({ room, items }) =>
      items
        .filter(it => it.item_name?.trim())
        .map(it => ({
          agreement_id: id,
          room_name: room,
          item_name: it.item_name,
          quantity: it.quantity ?? 1,
          category: it.category ?? 'Other',
          tier: it.tier ?? 2,
          replacement_cost: it.replacement_cost || null,
        }))
    )
    await insertAssets(toInsert)
    navigate(`/registry?id=${id}`)
  }

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

        {step === 'select' && (
          <>
            <h1 className="page-title mb-2">What type of flat is this?</h1>
            <p className="page-subtitle mb-2">
              We'll set up the standard rooms and items for your flat type.
            </p>
            {detectedBHK && (
              <div className="amber-banner mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-ink/80">
                  We detected <strong>{detectedBHK}</strong> from your agreement. Confirm or choose a different type.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(BHK_CONFIGS).map(bhk => (
                <button
                  key={bhk}
                  onClick={() => handleBHKSelect(bhk)}
                  className={`card text-left p-4 transition-all hover:border-navy hover:shadow-low cursor-pointer
                    ${selectedBHK === bhk ? 'border-navy bg-navy/5' : ''}`}
                >
                  <p className="font-display font-semibold text-navy text-lg mb-1">{bhk}</p>
                  <p className="text-xs text-gray-400">
                    {BHK_CONFIGS[bhk].length} rooms
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {BHK_CONFIGS[bhk].slice(0, 3).map(r => (
                      <span key={r} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{r}</span>
                    ))}
                    {BHK_CONFIGS[bhk].length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">+{BHK_CONFIGS[bhk].length - 3} more</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'configure' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep('select')} className="btn-ghost text-sm px-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div>
                <h1 className="page-title">Configure Your Flat</h1>
                <p className="page-subtitle">
                  {selectedBHK} · Adjust quantities, add asset values, remove items not present.
                </p>
              </div>
            </div>

            {parsedAssets.length > 0 && (
              <div className="amber-banner mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-ink/80">
                  <strong>{parsedAssets.length} items</strong> from your agreement have been pre-filled and merged into the rooms below.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {roomData.map((room, roomIdx) => (
                <div key={room.room} className="card p-0 overflow-hidden">
                  {/* Room header */}
                  <div className="bg-navy px-4 py-3 flex items-center justify-between">
                    <p className="font-display font-semibold text-white text-sm">{room.room}</p>
                    <span className="text-xs text-white/50">{room.items.length} items</span>
                  </div>

                  {/* Column headers */}
                  <div className="flex items-center gap-3 px-4 pt-3 pb-1">
                    <span className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Item</span>
                    <span className="w-14 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Qty</span>
                    <span className="w-28 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Value (₹)</span>
                    <span className="w-6" />
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {room.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-3 px-4 py-2.5">
                        {/* Item name */}
                        <input
                          className="input-field text-sm flex-1 py-2"
                          value={item.item_name}
                          onChange={e => updateItem(roomIdx, itemIdx, 'item_name', e.target.value)}
                          placeholder="Item name"
                        />

                        {/* Quantity */}
                        <input
                          type="number" min={1}
                          className="input-field text-sm w-14 text-center py-2 px-1"
                          value={item.quantity}
                          onChange={e => updateItem(roomIdx, itemIdx, 'quantity', +e.target.value)}
                        />

                        {/* Asset value */}
                        <input
                          type="number"
                          className="input-field text-sm w-28 py-2"
                          placeholder="e.g. 2000"
                          value={item.replacement_cost ?? ''}
                          onChange={e => updateItem(roomIdx, itemIdx, 'replacement_cost', e.target.value ? +e.target.value : null)}
                        />

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(roomIdx, itemIdx)}
                          className="w-6 flex-shrink-0 text-gray-300 hover:text-[#E05252] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add custom item */}
                  {newItemRoom === roomIdx ? (
                    <AddItemForm
                      onAdd={item => addCustomItem(roomIdx, item)}
                      onCancel={() => setNewItemRoom(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setNewItemRoom(roomIdx)}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-navy hover:bg-navy/5 transition-colors flex items-center gap-1.5 border-t border-gray-100"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add item to {room.room}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Painting Charges Agreement */}
            <div className="card mt-4 border-[#E8A020]/40 bg-[#E8A020]/5">
              <div className="flex items-start gap-3 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <div>
                  <p className="font-semibold text-sm text-ink">Painting / Whitewash Charges</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Standard practice in Bangalore — painting charges are deducted from the deposit at move-out. Agreeing now makes the deduction pre-approved and dispute-free.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={paintingAgreed}
                  onChange={e => setPaintingAgreed(e.target.checked)}
                  className="mt-0.5 accent-navy w-4 h-4 flex-shrink-0"
                />
                <span className="text-sm text-ink">
                  I agree that painting/whitewash charges will be deducted from my security deposit at move-out.
                </span>
              </label>

              {paintingAgreed && (
                <div className="flex items-center gap-3 mt-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Agreed amount (₹)</label>
                  <input
                    type="number"
                    className="input-field text-sm w-36 py-1.5"
                    value={paintingAmount ?? ''}
                    onChange={e => setPaintingAmount(+e.target.value)}
                    placeholder={agreement?.monthly_rent ?? ''}
                  />
                  <p className="text-xs text-gray-400">
                    Default: 1 month's rent (₹{Number(agreement?.monthly_rent ?? 0).toLocaleString('en-IN')})
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="btn-primary w-full justify-center py-3 mt-4 text-base"
            >
              {saving ? 'Setting up…' : 'Confirm & Document Flat →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AddItemForm({ onAdd, onCancel }) {
  const [item, setItem] = useState({ item_name: '', quantity: 1, category: 'Other', tier: 2, replacement_cost: null })
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      <p className="text-xs font-semibold text-navy mb-2">Add Custom Item</p>
      <div className="flex items-center gap-3 mb-2">
        <input className="input-field text-sm flex-1 py-2" placeholder="Item name"
          value={item.item_name} onChange={e => setItem(p => ({ ...p, item_name: e.target.value }))} />
        <input type="number" min={1} className="input-field text-sm w-14 text-center py-2 px-1"
          value={item.quantity} onChange={e => setItem(p => ({ ...p, quantity: +e.target.value }))} />
        <input type="number" className="input-field text-sm w-28 py-2" placeholder="Value ₹"
          value={item.replacement_cost ?? ''} onChange={e => setItem(p => ({ ...p, replacement_cost: e.target.value ? +e.target.value : null }))} />
        <span className="w-6" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => item.item_name.trim() && onAdd(item)} className="btn-primary text-xs py-1.5">Add</button>
        <button onClick={onCancel} className="btn-ghost text-xs">Cancel</button>
      </div>
    </div>
  )
}
