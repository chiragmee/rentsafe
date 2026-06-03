import { getAgreement, getAssets, getRooms, getSignature } from './supabase'

function fmt(n) {
  return n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
function fmtTs(d) {
  return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

export async function downloadRegistryPdf(agreementId) {
  const [agreement, assets, rooms, sig] = await Promise.all([
    getAgreement(agreementId),
    getAssets(agreementId),
    getRooms(agreementId),
    getSignature(agreementId),
  ])

  const totalAssetValue = assets.reduce((s, a) => s + (a.replacement_cost ?? 0), 0)
  const isGhostRule = sig?.registry_status === 'Owner Non-Responsive'

  const tier1 = assets.filter(a => a.tier === 1)
  const tier2 = assets.filter(a => a.tier === 2)
  const tier3 = assets.filter(a => a.tier === 3)

  function itemRows(items) {
    return items.map(a => `
      <tr>
        <td>${a.item_name}</td>
        <td>${a.quantity ?? 1}</td>
        <td>${a.category ?? '—'}</td>
        <td>${a.condition_at_movein ?? '—'}</td>
        <td style="text-align:right">${fmt(a.replacement_cost)}</td>
        <td style="text-align:center">${a.depreciation_rate_percent ?? '—'}%</td>
        <td style="text-align:center">${a.tenant_approved ? '✓' : a.tenant_disputed ? 'Disputed' : '—'}</td>
      </tr>`).join('')
  }

  function roomRows(rms) {
    return rms.map(r => `
      <tr>
        <td>${r.room_name}</td>
        <td>${r.condition_at_movein ?? '—'}</td>
        <td>${r.move_in_notes ?? '—'}</td>
        <td>${(r.move_in_photos?.length ?? 0)} photo(s)</td>
      </tr>`).join('')
  }

  const ghostBanner = isGhostRule ? `
    <div style="background:#fff8e6;border:1px solid #e8a020;border-radius:4px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#7a5000;">
        <strong>⚠ Certified Pending — Owner Non-Responsive</strong><br/>
        This registry was prepared by <strong>${agreement.tenant_name}</strong> on ${fmtDate(sig?.created_at)}
        for ${agreement.property_address}. The owner <strong>${agreement.owner_name}</strong>
        was notified on ${fmtTs(sig?.owner_notified_at)} and did not respond within 72 hours.
        Under Indian Contract Act principles, absence of objection to a communicated document
        constitutes non-dispute of its contents.
      </p>
    </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>RentSafe — Signed Asset Registry</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-family: 'Literata', serif; font-size: 26px; color: #0f1b2d; margin-bottom: 4px; }
    h2 { font-family: 'Literata', serif; font-size: 15px; color: #0f1b2d; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #0f1b2d; }
    .logo { font-family: 'Literata', serif; font-size: 20px; color: #0f1b2d; font-weight: 700; }
    .logo span { color: #d4a853; }
    .badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.05em; text-transform: uppercase; }
    .badge-locked { background: #e6f7ef; color: #2e9e6b; border: 1px solid #2e9e6b55; }
    .badge-pending { background: #fff8e6; color: #e8a020; border: 1px solid #e8a02055; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
    .field label { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 2px; }
    .field p { font-size: 13px; color: #1a1a1a; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
    th { background: #0f1b2d; color: #fff; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.04em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #fafafa; }
    .tier-head td { background: #f9f7f4; font-weight: 600; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #e5e7eb; }
    .total-row td { font-weight: 700; font-size: 13px; border-top: 2px solid #0f1b2d; }
    .sig-block { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 8px; }
    .sig-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 14px; }
    .sig-box .role { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .sig-box .name { font-family: 'Literata', serif; font-size: 18px; color: #0f1b2d; font-style: italic; }
    .sig-box .ts { font-size: 11px; color: #6b7280; margin-top: 6px; }
    .sig-box.signed { border-color: #2e9e6b55; background: #f0fdf6; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Rent<span>Safe</span></div>
      <p style="font-size:11px;color:#6b7280;margin-top:2px;">Guardian Protocol — Asset Registry</p>
    </div>
    <div style="text-align:right">
      <span class="badge ${isGhostRule ? 'badge-pending' : 'badge-locked'}">
        ${isGhostRule ? '⚠ Certified Pending' : '🔒 Locked'}
      </span>
      <p style="font-size:11px;color:#6b7280;margin-top:6px;">Locked: ${fmtTs(sig?.registry_locked_at)}</p>
      <p style="font-size:10px;color:#9ca3af;margin-top:2px;font-family:monospace">${agreementId}</p>
    </div>
  </div>

  ${ghostBanner}

  <h2>Agreement Details</h2>
  <div class="grid-2">
    <div class="field"><label>Tenant</label><p>${agreement.tenant_name ?? '—'}</p></div>
    <div class="field"><label>Owner</label><p>${agreement.owner_name ?? '—'}</p></div>
    <div class="field"><label>Property</label><p>${agreement.property_address ?? '—'}</p></div>
    <div class="field"><label>State</label><p>${agreement.property_state ?? '—'}</p></div>
    <div class="field"><label>Monthly Rent</label><p>${fmt(agreement.monthly_rent)}</p></div>
    <div class="field"><label>Security Deposit</label><p>${fmt(agreement.deposit_amount)}</p></div>
    <div class="field"><label>Tenure Start</label><p>${fmtDate(agreement.tenure_start_date)}</p></div>
    <div class="field"><label>Duration</label><p>${agreement.tenure_months ?? '—'} months</p></div>
    <div class="field"><label>Rent Escalation</label><p>${agreement.rent_escalation_percent ?? 0}%</p></div>
    <div class="field"><label>Notice Period</label><p>${agreement.notice_period_days ?? '—'} days</p></div>
  </div>

  <h2>Asset Registry</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th><th>Qty</th><th>Category</th><th>Condition</th>
        <th style="text-align:right">Replacement Cost</th>
        <th style="text-align:center">Depreciation</th>
        <th style="text-align:center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tier1.length ? `<tr class="tier-head"><td colspan="7">Tier 1 — High Value</td></tr>${itemRows(tier1)}` : ''}
      ${tier2.length ? `<tr class="tier-head"><td colspan="7">Tier 2 — Frequently Disputed</td></tr>${itemRows(tier2)}` : ''}
      ${tier3.length ? `<tr class="tier-head"><td colspan="7">Tier 3 — Additional Items</td></tr>${itemRows(tier3)}` : ''}
      <tr class="total-row">
        <td colspan="4">Total Asset Value</td>
        <td style="text-align:right">${fmt(totalAssetValue)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>

  ${rooms.length ? `
  <h2>Room Conditions</h2>
  <table>
    <thead><tr><th>Room</th><th>Condition</th><th>Notes</th><th>Evidence</th></tr></thead>
    <tbody>${roomRows(rooms)}</tbody>
  </table>` : ''}

  <h2>Signatures</h2>
  <div class="sig-block">
    <div class="sig-box ${sig?.tenant_signed ? 'signed' : ''}">
      <div class="role">Tenant</div>
      <div class="name">${agreement.tenant_name ?? '—'}</div>
      <div class="ts">
        ${sig?.tenant_signed
          ? `✓ Signed on ${fmtTs(sig.tenant_signed_at)}`
          : 'Not yet signed'}
      </div>
    </div>
    <div class="sig-box ${sig?.owner_signed ? 'signed' : isGhostRule ? '' : ''}">
      <div class="role">Owner</div>
      <div class="name">${agreement.owner_name ?? '—'}</div>
      <div class="ts">
        ${sig?.owner_signed
          ? `✓ Signed on ${fmtTs(sig.owner_signed_at)}`
          : isGhostRule
            ? `Non-responsive — notified ${fmtTs(sig?.owner_notified_at)}`
            : 'Not yet signed'}
      </div>
    </div>
  </div>

  <div class="footer">
    <span>RentSafe Guardian Protocol · rentsafe.app</span>
    <span>Generated ${fmtDate(new Date().toISOString())} · Agreement ID: ${agreementId}</span>
  </div>

  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="background:#0f1b2d;color:#fff;border:none;padding:10px 28px;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  // Trigger print dialog after fonts load
  win.onload = () => setTimeout(() => win.print(), 500)
}
