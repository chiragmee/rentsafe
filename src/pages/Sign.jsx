import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import ProgressStepper from '../components/ProgressStepper'
import SignatureBlock from '../components/SignatureBlock'
import { getAgreement, getAssets, getSignature, upsertSignature } from '../services/supabase'
import { downloadRegistryPdf } from '../services/generatePdf'

export default function Sign() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [sig, setSig] = useState(null)
  const [confetti, setConfetti] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id), getSignature(id)]).then(([ag, items, s]) => {
      setAgreement(ag)
      setAssets(items)
      setSig(s ?? { agreement_id: id, registry_status: 'Draft' })
    })
  }, [id])

  async function handleSign(role) {
    const now = new Date().toISOString()
    const updates = role === 'Tenant'
      ? { tenant_signed: true, tenant_signed_at: now }
      : { owner_signed: true, owner_signed_at: now }

    const current = sig ?? {}
    const bothSigned = role === 'Tenant'
      ? current.owner_signed
      : current.tenant_signed

    const newSig = await upsertSignature({
      agreement_id: id,
      ...current,
      ...updates,
      registry_status: bothSigned ? 'Locked' : 'Pending Owner',
      ...(bothSigned ? { registry_locked_at: now } : {}),
    })
    setSig(newSig)
    if (bothSigned) setConfetti(true)
  }

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>
    </div>
  )

  const isLocked = sig?.registry_status === 'Locked'
  const totalAssetValue = assets.reduce((s, a) => s + (a.replacement_cost ?? 0), 0)

  if (confetti || isLocked) {
    return (
      <div className="min-h-screen bg-paper">
        <TopAppBar agreementId={id} />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="page-title mb-3">Registry Locked</h1>
          <p className="page-subtitle mb-2">Your asset registry is locked and documented.</p>
          <p className="text-sm text-gray-500 mb-8">Both parties have a permanent record. Settlement at move-out is now arithmetic, not a fight.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(`/dashboard?id=${id}`)} className="btn-primary py-3 px-6">
              Go to Dashboard →
            </button>
            <button onClick={() => downloadRegistryPdf(id)} className="btn-secondary py-3 px-6">
              Download Signed Registry PDF
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProgressStepper currentStep={5} />
        <h1 className="page-title mb-2">Sign the Asset Registry</h1>
        <p className="page-subtitle mb-6">Both parties must sign to lock the registry. Costs cannot change after signing.</p>

        {/* Summary */}
        <div className="card mb-6">
          <p className="section-label mb-3">Agreement Summary</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Tenant</p><p className="font-semibold">{agreement.tenant_name}</p></div>
            <div><p className="text-xs text-gray-400">Owner</p><p className="font-semibold">{agreement.owner_name}</p></div>
            <div><p className="text-xs text-gray-400">Deposit</p><p className="font-semibold mono-amount">₹{Number(agreement.deposit_amount).toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-gray-400">Total Asset Value</p><p className="font-semibold mono-amount">₹{totalAssetValue.toLocaleString('en-IN')}</p></div>
          </div>
        </div>

        {/* Items */}
        <div className="card mb-6">
          <p className="section-label mb-3">Agreed Items ({assets.filter(a => a.replacement_cost > 0).length})</p>
          <div className="space-y-1.5">
            {assets.filter(a => a.replacement_cost > 0).map(a => (
              <div key={a.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="text-ink">{a.item_name}</span>
                <span className="font-mono font-semibold text-ink">₹{Number(a.replacement_cost).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <SignatureBlock
            role="Tenant"
            name={agreement.tenant_name}
            phone={agreement.tenant_phone}
            alreadySigned={sig?.tenant_signed}
            signedAt={sig?.tenant_signed_at}
            onSigned={() => handleSign('Tenant')}
          />
          <SignatureBlock
            role="Owner"
            name={agreement.owner_name}
            phone={agreement.owner_phone}
            alreadySigned={sig?.owner_signed}
            signedAt={sig?.owner_signed_at}
            onSigned={() => handleSign('Owner')}
          />
        </div>

        <div className="card mt-6 bg-gray-50 border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Share owner link: <span className="font-mono text-navy break-all">
              {window.location.origin}/owner-review/{id}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
