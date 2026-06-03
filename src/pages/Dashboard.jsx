import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import RegistryStatusBadge from '../components/RegistryStatusBadge'
import { getAgreement, getAssets, getSignature } from '../services/supabase'
import { downloadRegistryPdf } from '../services/generatePdf'
import { checkGhostRule, hoursUntilGhostRule } from '../services/ghostRule'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24))
}

function addMonths(dateStr, months) {
  if (!dateStr || !months) return null
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d
}

function getMonthList(startDate, endDate) {
  const months = []
  const d = new Date(startDate)
  const end = new Date(endDate)
  while (d <= end) {
    months.push(d.toISOString().slice(0, 7))
    d.setMonth(d.getMonth() + 1)
  }
  return months
}

export default function Dashboard() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [sig, setSig] = useState(null)
  const [paidMonths, setPaidMonths] = useState({})

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id), checkGhostRule(id)]).then(([ag, items, s]) => {
      setAgreement(ag)
      setAssets(items)
      setSig(s)
    })
  }, [id])

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>
    </div>
  )

  const endDate = addMonths(agreement.tenure_start_date, agreement.tenure_months)
  const daysLeft = daysUntil(endDate?.toISOString())
  const nextEscalation = addMonths(agreement.tenure_start_date, 12)
  const newRent = agreement.monthly_rent * (1 + (agreement.rent_escalation_percent ?? 0) / 100)
  const totalAssetValue = assets.reduce((s, a) => s + (a.replacement_cost ?? 0), 0)
  const months = getMonthList(agreement.tenure_start_date, endDate?.toISOString())
  const hoursLeft = sig?.owner_notified_at ? hoursUntilGhostRule(sig.owner_notified_at) : null

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Dashboard</h1>
          <span className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}…</span>
        </div>

        {/* Property Card */}
        <div className="card mb-4">
          <p className="section-label mb-3">Property</p>
          <p className="font-semibold text-ink mb-1">{agreement.property_address}</p>
          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
            <div><p className="text-xs text-gray-400">Monthly Rent</p><p className="font-semibold mono-amount">₹{Number(agreement.monthly_rent).toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-gray-400">Deposit</p><p className="font-semibold mono-amount">₹{Number(agreement.deposit_amount).toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-gray-400">Tenure</p><p className="font-semibold">{agreement.tenure_start_date} → {endDate?.toLocaleDateString('en-IN')}</p></div>
            <div>
              <p className="text-xs text-gray-400">Days Remaining</p>
              <p className={`font-semibold ${daysLeft != null && daysLeft < 45 ? 'text-[#E8A020]' : 'text-ink'}`}>{daysLeft ?? '—'} days</p>
            </div>
          </div>
          {agreement.rent_escalation_percent > 0 && nextEscalation && (
            <div className="mt-3 amber-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-xs text-ink/80">
                Next escalation: {nextEscalation.toLocaleDateString('en-IN')} → new rent ₹{Math.round(newRent).toLocaleString('en-IN')}/mo ({agreement.rent_escalation_percent}% increase)
              </p>
            </div>
          )}
        </div>

        {/* Registry Status */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Registry Status</p>
            <RegistryStatusBadge status={sig?.registry_status ?? 'Draft'} />
          </div>

          {sig?.registry_status === 'Owner Non-Responsive' && (
            <div className="amber-banner mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-ink/80">
                Your registry is locked with a timestamp and photo trail. This gives you significant leverage in any deposit dispute.
              </p>
            </div>
          )}

          {hoursLeft != null && hoursLeft > 0 && sig?.registry_status !== 'Locked' && (
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Auto-locks in {Math.round(hoursLeft)}h if owner doesn't sign
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total items: {assets.length} · Asset value: <span className="mono-amount font-semibold text-ink">₹{totalAssetValue.toLocaleString('en-IN')}</span></span>
            <Link to={`/registry?id=${id}`} className="text-navy text-xs font-semibold hover:underline">View Registry →</Link>
          </div>
        </div>

        {/* Rent Log */}
        <div className="card mb-4">
          <p className="section-label mb-3">Rent Log</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {months.map(month => {
              const isPaid = !!paidMonths[month]
              const isCurrent = month === new Date().toISOString().slice(0, 7)
              return (
                <div key={month} className={`flex items-center justify-between p-2.5 rounded border transition-all
                  ${isCurrent ? 'border-navy/30 bg-navy/5' : 'border-gray-100'}
                `}>
                  <span className={`text-sm ${isCurrent ? 'font-semibold text-navy' : 'text-ink'}`}>
                    {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    {isCurrent && <span className="text-xs text-navy/60 ml-1">(current)</span>}
                  </span>
                  <button
                    onClick={() => setPaidMonths(p => ({ ...p, [month]: !p[month] }))}
                    className={`text-xs font-semibold px-2.5 py-1 rounded transition-all
                      ${isPaid ? 'bg-[#2E9E6B]/15 text-[#2E9E6B]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {isPaid ? 'Paid ✓' : 'Mark Paid'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {daysLeft != null && daysLeft <= 45 && (
            <button onClick={() => navigate(`/moveout?id=${id}`)} className="btn-primary justify-center py-3 col-span-2">
              Initiate Move-Out →
            </button>
          )}
          <button onClick={() => downloadRegistryPdf(id)} className="btn-secondary justify-center py-2.5 text-sm">
            Download Registry PDF
          </button>
          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/owner-review/${id}`)}
            className="btn-ghost justify-center py-2.5 text-sm border border-gray-200">
            Copy Registry Link
          </button>
        </div>
      </div>
    </div>
  )
}
