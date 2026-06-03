import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import { getAgreement, getAssets, upsertSettlement } from '../services/supabase'
import { calculateSettlement } from '../services/depreciation'

function fmt(n) { return `₹${Math.abs(Number(n)).toLocaleString('en-IN')}` }
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function Settlement() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [agreement, setAgreement] = useState(null)
  const [assets, setAssets] = useState([])
  const [settled, setSettled] = useState(false)
  const [settledAt, setSettledAt] = useState(null)
  const moveOutDate = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!id) return
    Promise.all([getAgreement(id), getAssets(id)]).then(([ag, items]) => {
      setAgreement(ag)
      setAssets(items)
    })
  }, [id])

  if (!agreement) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-navy rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
    </div>
  )

  const settlement = calculateSettlement({ assets, agreement, moveOutDate })
  const paintingCharge = agreement.painting_charges_agreed ? (agreement.painting_charges_amount ?? agreement.monthly_rent ?? 0) : 0
  const totalDeductions = settlement.last_month_rent_deducted + paintingCharge + settlement.total_damage_charges
  const refundable = Math.max(0, settlement.total_deposit - totalDeductions)
  const owedByTenant = Math.max(0, totalDeductions - settlement.total_deposit)

  async function handleMarkSettled() {
    const now = new Date().toISOString()
    await upsertSettlement({
      agreement_id: id,
      total_deposit: settlement.total_deposit,
      last_month_rent_deducted: settlement.last_month_rent_deducted,
      total_damage_charges: settlement.total_damage_charges + paintingCharge,
      refundable_amount: refundable,
      amount_owed_beyond_deposit: owedByTenant,
      line_items: settlement.line_items,
      settled_at: now,
      generated_at: now,
    })
    setSettled(true)
    setSettledAt(now)
  }

  function handleDownloadPdf() {
    const html = buildSettlementHtml({ agreement, settlement, paintingCharge, refundable, owedByTenant, moveOutDate, settled, settledAt })
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.onload = () => setTimeout(() => win.print(), 500)
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopAppBar agreementId={id} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="page-title mb-2">Deposit Settlement</h1>
        <p className="page-subtitle mb-8">Based on the pre-agreed registry — here is your settlement.</p>

        {settled && (
          <div className="card border-[#2E9E6B]/40 bg-[#2E9E6B]/5 mb-6 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E9E6B" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <p className="font-semibold text-[#2E9E6B] text-sm">Settlement Marked as Complete</p>
              <p className="text-xs text-gray-500">Both parties confirmed on {fmtDate(settledAt)}</p>
            </div>
          </div>
        )}

        <div className="card mb-6">
          <p className="section-label mb-4 text-center">Deposit Settlement</p>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Security Deposit Paid</span>
              <span className="mono-amount font-semibold text-ink">{fmt(settlement.total_deposit)}</span>
            </div>

            <div className="border-t border-gray-100 pt-2.5">
              <p className="text-xs text-gray-400 mb-2">Deductions</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="text-[#E05252]">└</span> Last Month Rent
                  </span>
                  <span className="mono-amount font-semibold text-[#E05252]">−{fmt(settlement.last_month_rent_deducted)}</span>
                </div>

                {paintingCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <span className="text-[#E05252]">└</span> Painting / Whitewash Charges
                      <span className="text-[10px] text-gray-400 ml-1">(pre-agreed)</span>
                    </span>
                    <span className="mono-amount font-semibold text-[#E05252]">−{fmt(paintingCharge)}</span>
                  </div>
                )}

                {settlement.line_items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <span className="text-[#E05252]">└</span> {item.item_name} (damaged)
                    </span>
                    <span className="mono-amount font-semibold text-[#E05252]">−{fmt(item.charge)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              {refundable > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink">Amount Refundable</span>
                  <span className="font-display font-bold text-2xl text-[#2E9E6B] mono-amount">{fmt(refundable)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink">Amount Owed by Tenant</span>
                  <span className="font-display font-bold text-2xl text-[#E05252] mono-amount">{fmt(owedByTenant)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {settlement.line_items.length === 0 && paintingCharge === 0 && (
          <div className="card border-[#2E9E6B]/30 bg-[#2E9E6B]/5 text-center py-6 mb-6">
            <div className="text-3xl mb-2">✓</div>
            <p className="font-semibold text-[#2E9E6B]">No damage deductions</p>
            <p className="text-sm text-gray-500 mt-1">All items returned in good condition</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleDownloadPdf} className="btn-primary flex-1 justify-center py-3 gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Settlement PDF
          </button>
          {!settled && (
            <button onClick={handleMarkSettled} className="btn-secondary flex-1 justify-center py-3 gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark as Settled
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function buildSettlementHtml({ agreement, settlement, paintingCharge, refundable, owedByTenant, moveOutDate, settled, settledAt }) {
  const fmt2 = n => `₹${Math.abs(Number(n)).toLocaleString('en-IN')}`
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const totalDeductions = settlement.last_month_rent_deducted + paintingCharge + settlement.total_damage_charges

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>RentSafe — Deposit Settlement</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'DM Sans',sans-serif; font-size:13px; color:#1a1a1a; padding:40px; max-width:700px; margin:0 auto; }
    h1 { font-family:'Literata',serif; font-size:24px; color:#0f1b2d; margin-bottom:4px; }
    h2 { font-family:'Literata',serif; font-size:14px; color:#0f1b2d; margin:20px 0 8px; border-bottom:1px solid #e5e7eb; padding-bottom:5px; }
    .header { display:flex; justify-content:space-between; margin-bottom:24px; padding-bottom:14px; border-bottom:2px solid #0f1b2d; }
    .logo { font-family:'Literata',serif; font-size:18px; font-weight:700; color:#0f1b2d; }
    .logo span { color:#d4a853; }
    .badge { font-size:10px; font-weight:600; padding:3px 8px; border-radius:3px; text-transform:uppercase; letter-spacing:.05em; }
    .badge-settled { background:#e6f7ef; color:#2e9e6b; border:1px solid #2e9e6b55; }
    .badge-pending { background:#fff8e6; color:#e8a020; border:1px solid #e8a02055; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; margin-bottom:14px; }
    .field label { font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:.08em; display:block; margin-bottom:1px; }
    .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f3f4f6; font-size:13px; }
    .row.total { border-top:2px solid #0f1b2d; border-bottom:none; padding-top:10px; margin-top:4px; font-weight:700; }
    .deduct { color:#e05252; font-weight:600; font-family:monospace; }
    .refund { color:#2e9e6b; font-weight:700; font-size:18px; font-family:monospace; }
    .owed { color:#e05252; font-weight:700; font-size:18px; font-family:monospace; }
    .tag { font-size:10px; color:#9ca3af; margin-left:6px; }
    .footer { margin-top:28px; padding-top:12px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; font-size:10px; color:#9ca3af; }
    @media print { .no-print { display:none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Rent<span>Safe</span></div>
      <p style="font-size:11px;color:#6b7280;margin-top:2px;">Deposit Settlement Statement</p>
    </div>
    <div style="text-align:right">
      <span class="badge ${settled ? 'badge-settled' : 'badge-pending'}">${settled ? '✓ Settled' : 'Pending Settlement'}</span>
      ${settled ? `<p style="font-size:11px;color:#6b7280;margin-top:4px;">Settled: ${fmtD(settledAt)}</p>` : ''}
      <p style="font-size:10px;color:#9ca3af;margin-top:2px;font-family:monospace">${agreement.id}</p>
    </div>
  </div>

  <h2>Parties & Property</h2>
  <div class="grid-2">
    <div class="field"><label>Tenant</label><p>${agreement.tenant_name ?? '—'}</p></div>
    <div class="field"><label>Owner</label><p>${agreement.owner_name ?? '—'}</p></div>
    <div class="field"><label>Property</label><p>${agreement.property_address ?? '—'}</p></div>
    <div class="field"><label>Move-Out Date</label><p>${fmtD(moveOutDate)}</p></div>
  </div>

  <h2>Settlement Breakdown</h2>
  <div class="row">
    <span style="color:#6b7280">Security Deposit Paid</span>
    <span style="font-weight:600;font-family:monospace">${fmt2(settlement.total_deposit)}</span>
  </div>
  <div class="row">
    <span style="color:#6b7280">└ Last Month Rent</span>
    <span class="deduct">−${fmt2(settlement.last_month_rent_deducted)}</span>
  </div>
  ${paintingCharge > 0 ? `
  <div class="row">
    <span style="color:#6b7280">└ Painting / Whitewash Charges <span class="tag">(pre-agreed)</span></span>
    <span class="deduct">−${fmt2(paintingCharge)}</span>
  </div>` : ''}
  ${settlement.line_items.map(item => `
  <div class="row">
    <span style="color:#6b7280">└ ${item.item_name} (damaged)</span>
    <span class="deduct">−${fmt2(item.charge)}</span>
  </div>`).join('')}
  <div class="row total">
    <span>${refundable > 0 ? 'Amount Refundable to Tenant' : 'Amount Owed by Tenant'}</span>
    <span class="${refundable > 0 ? 'refund' : 'owed'}">${fmt2(refundable > 0 ? refundable : owedByTenant)}</span>
  </div>

  <div class="footer">
    <span>RentSafe Guardian Protocol · rentsafe.app</span>
    <span>Generated ${fmtD(new Date().toISOString())}</span>
  </div>

  <div class="no-print" style="margin-top:28px;text-align:center">
    <button onclick="window.print()" style="background:#0f1b2d;color:#fff;border:none;padding:10px 28px;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`
}
