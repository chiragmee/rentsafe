function fmt(n) {
  return n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
}

export default function MarketRangeBadge({ min, max, ownerCost, sourceNote }) {
  if (min == null || max == null) return null

  const withinRange = ownerCost == null || (ownerCost >= min && ownerCost <= max)
  const color = withinRange ? 'text-[#2E9E6B]' : 'text-[#E8A020]'
  const icon = withinRange ? '✓' : '⚠'

  return (
    <div className={`text-xs flex items-center gap-1.5 ${color}`}>
      <span className="font-semibold">{icon}</span>
      <span>
        Market rate: {fmt(min)} – {fmt(max)}
        {!withinRange && ' · Outside typical range'}
      </span>
      {sourceNote && <span className="text-gray-400 ml-1">({sourceNote})</span>}
    </div>
  )
}
