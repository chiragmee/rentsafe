import { getAgreement, getAssets, getRooms, getSignature } from './supabase'
import { calculateScore } from './protectionScore'

function openPrint(html) {
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.onload = () => setTimeout(() => win.print(), 500)
}

const BASE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',sans-serif; font-size:13px; color:#1a1a1a; background:#fff; padding:40px; max-width:900px; margin:0 auto; }
  h1 { font-family:'Literata',serif; font-size:26px; color:#0f1b2d; margin-bottom:4px; }
  h2 { font-family:'Literata',serif; font-size:15px; color:#0f1b2d; margin:24px 0 10px; border-bottom:1px solid #e5e7eb; padding-bottom:6px; }
  .logo { font-family:'Literata',serif; font-size:20px; font-weight:700; color:#0f1b2d; }
  .logo span { color:#d4a853; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin-bottom:16px; }
  .field label { font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:.08em; display:block; margin-bottom:2px; }
  table { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:12px; }
  th { background:#0f1b2d; color:#fff; padding:7px 10px; text-align:left; font-weight:600; font-size:11px; }
  td { padding:7px 10px; border-bottom:1px solid #f3f4f6; }
  tr:nth-child(even) td { background:#fafafa; }
  .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; font-size:10px; color:#9ca3af; }
  @media print { .no-print { display:none !important; } }
`

export async function downloadProtectionReport(agreementId, scoreData) {
  const [agreement, assets, rooms, sig] = await Promise.all([
    getAgreement(agreementId),
    getAssets(agreementId),
    getRooms(agreementId),
    getSignature(agreementId),
  ])

  const score = scoreData ?? calculateScore({ assets, rooms, hasVideo: !!agreement.walkthrough_video_url })
  const totalPhotos = assets.reduce((s, a) => s + (a.move_in_photos?.length ?? 0), 0)

  // Pre-existing issues grouped by room
  const issuesByRoom = rooms
    .filter(r => r.move_in_notes || r.condition_at_movein !== 'Good')
    .map(r => `<tr><td><strong>${r.room_name}</strong></td><td>${r.condition_at_movein ?? '—'}</td><td>${r.move_in_notes ?? '—'}</td></tr>`)
    .join('')

  // Asset register
  const assetRows = assets.map(a => `
    <tr>
      <td>${a.room_name ?? '—'}</td>
      <td>${a.item_name}</td>
      <td>${a.condition_at_movein ?? '—'}</td>
      <td>${(a.move_in_photos?.length ?? 0)} photo(s)</td>
      <td>${a.move_in_notes ?? '—'}</td>
    </tr>`).join('')

  const confColor = score.estimated_recovery_confidence === 'HIGH' ? '#2E9E6B'
    : score.estimated_recovery_confidence === 'MEDIUM' ? '#E8A020' : '#E05252'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>RentSafe Deposit Protection Report</title>
  <style>
    ${BASE_STYLES}
    .cover { text-align:center; padding:40px 0 32px; border-bottom:2px solid #0f1b2d; margin-bottom:28px; }
    .score-circle { width:100px; height:100px; border-radius:50%; border:6px solid ${confColor}; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; margin:16px auto; }
    .score-num { font-family:'Literata',serif; font-size:28px; font-weight:700; color:#0f1b2d; line-height:1; }
    .conf-badge { display:inline-block; font-size:11px; font-weight:700; padding:4px 14px; border-radius:20px; text-transform:uppercase; letter-spacing:.08em; background:${confColor}22; color:${confColor}; border:1px solid ${confColor}44; margin-top:6px; }
    .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:20px 0; }
    .stat-box { border:1px solid #e5e7eb; border-radius:4px; padding:12px; text-align:center; }
    .stat-num { font-family:'Literata',serif; font-size:22px; font-weight:700; color:#0f1b2d; }
    .stat-label { font-size:10px; color:#9ca3af; margin-top:2px; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <div class="logo">Rent<span>Safe</span></div>
    <p style="font-size:11px;color:#6b7280;margin:4px 0 16px">Deposit Protection Report · Guardian Protocol</p>
    <h1>${agreement.property_address ?? 'Property'}</h1>
    <p style="color:#6b7280;margin-top:6px">${agreement.tenant_name} · ${agreement.owner_name}</p>
    <div class="score-circle">
      <span class="score-num">${score.score}</span>
      <span style="font-size:10px;color:#9ca3af">/100</span>
    </div>
    <div class="conf-badge">${score.estimated_recovery_confidence} Protection</div>
    <p style="font-size:11px;color:#9ca3af;margin-top:12px">Generated ${fmtDate(new Date().toISOString())} · ID: ${agreementId.slice(0,8)}</p>
  </div>

  <!-- Summary Stats -->
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-num">${fmt(agreement.deposit_amount)}</div><div class="stat-label">Deposit</div></div>
    <div class="stat-box"><div class="stat-num">${fmt(agreement.monthly_rent)}/mo</div><div class="stat-label">Rent</div></div>
    <div class="stat-box"><div class="stat-num">${assets.length}</div><div class="stat-label">Items Documented</div></div>
    <div class="stat-box"><div class="stat-num">${totalPhotos}</div><div class="stat-label">Photos Uploaded</div></div>
  </div>

  <h2>Agreement Summary</h2>
  <div class="grid-2">
    <div class="field"><label>Tenant</label><p>${agreement.tenant_name ?? '—'} · ${agreement.tenant_phone ?? '—'}</p></div>
    <div class="field"><label>Owner</label><p>${agreement.owner_name ?? '—'} · ${agreement.owner_phone ?? '—'}</p></div>
    <div class="field"><label>Property</label><p>${agreement.property_address ?? '—'}</p></div>
    <div class="field"><label>State</label><p>${agreement.property_state ?? '—'}</p></div>
    <div class="field"><label>Deposit</label><p>${fmt(agreement.deposit_amount)}</p></div>
    <div class="field"><label>Monthly Rent</label><p>${fmt(agreement.monthly_rent)}</p></div>
    <div class="field"><label>Tenure</label><p>${fmtDate(agreement.tenure_start_date)} · ${agreement.tenure_months ?? '—'} months</p></div>
    <div class="field"><label>Notice Period</label><p>${agreement.notice_period_days ?? '—'} days</p></div>
  </div>

  <h2>Property Documentation Summary</h2>
  <div class="grid-2" style="margin-bottom:8px">
    <div class="field"><label>Rooms Documented</label><p>${rooms.filter(r=>r.condition_at_movein).length} / ${rooms.length}</p></div>
    <div class="field"><label>Assets Documented</label><p>${assets.filter(a=>a.condition_at_movein).length} / ${assets.length}</p></div>
    <div class="field"><label>Photos Uploaded</label><p>${totalPhotos} photos across ${assets.filter(a=>(a.move_in_photos?.length??0)>0).length} items</p></div>
    <div class="field"><label>Walkthrough Video</label><p>${agreement.walkthrough_video_url ? 'Recorded ✓' : 'Not recorded'}</p></div>
  </div>

  ${issuesByRoom ? `
  <h2>Pre-Existing Issues</h2>
  <table>
    <thead><tr><th>Room</th><th>Condition</th><th>Notes</th></tr></thead>
    <tbody>${issuesByRoom}</tbody>
  </table>` : ''}

  <h2>Asset Register</h2>
  <table>
    <thead><tr><th>Room</th><th>Item</th><th>Condition</th><th>Evidence</th><th>Notes</th></tr></thead>
    <tbody>${assetRows}</tbody>
  </table>

  <h2>Registry Status</h2>
  <p style="font-size:13px;margin-bottom:8px">
    ${sig?.registry_status === 'Locked'
      ? `<strong style="color:#2E9E6B">✓ Registry Signed By Both Parties</strong> — Locked on ${fmtTs(sig.registry_locked_at)}`
      : sig?.registry_status === 'Owner Non-Responsive'
      ? `<strong style="color:#E8A020">⚠ Certified Pending</strong> — Owner notified on ${fmtTs(sig?.owner_notified_at)}. No response recorded.`
      : `Pending — Registry status: ${sig?.registry_status ?? 'Draft'}`}
  </p>

  ${agreement.walkthrough_video_url ? `
  <h2>Evidence Appendix</h2>
  <p style="font-size:13px">Walkthrough Video: <a href="${agreement.walkthrough_video_url}">${agreement.walkthrough_video_url}</a></p>` : ''}

  <div class="footer">
    <span>RentSafe Guardian Protocol · rentsafe-two.vercel.app</span>
    <span>Report generated ${fmtDate(new Date().toISOString())} · Agreement ${agreementId.slice(0,8)}</span>
  </div>

  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="background:#0f1b2d;color:#fff;border:none;padding:10px 28px;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`

  openPrint(html)
}

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

  openPrint(html)
}
