// Platform-enforced depreciation rates by category (% per year)
export const DEPRECIATION_RATES = {
  Electrical: 15,
  Furniture: 10,
  Plumbing: 20,
  Fixtures: 10,
  Keys: 0,
  Other: 10,
}

// Owner can adjust rate ±5% but not below 1% (except Keys which stay 0%)
export function clampDepreciationRate(category, ownerRate) {
  const standard = DEPRECIATION_RATES[category] ?? 10
  if (category === 'Keys') return 0
  const min = Math.max(1, standard - 5)
  const max = standard + 5
  return Math.min(max, Math.max(min, ownerRate))
}

/**
 * Calculate the charge for a damaged/missing item.
 * final_charge = max(replacement_cost - depreciation, 0.10 × replacement_cost)
 */
export function calculateCharge({ replacementCost, depreciationRate, moveInDate, moveOutDate }) {
  if (!replacementCost || replacementCost <= 0) return 0

  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44
  const monthsElapsed = Math.max(
    0,
    (new Date(moveOutDate) - new Date(moveInDate)) / msPerMonth
  )

  const depreciation = (depreciationRate / 100) * (monthsElapsed / 12) * replacementCost
  const calculated = replacementCost - depreciation
  const salvageFloor = 0.10 * replacementCost

  return Math.round(Math.max(calculated, salvageFloor))
}

/**
 * Calculate total settlement from assets and agreement terms.
 */
export function calculateSettlement({ assets, agreement, moveOutDate }) {
  const lineItems = []
  let totalDamageCharges = 0

  for (const asset of assets) {
    if (asset.condition_at_moveout === 'Good') continue

    const rate = asset.depreciation_rate_percent ?? DEPRECIATION_RATES[asset.category] ?? 10
    const charge = asset.agreed_cost != null
      ? asset.agreed_cost
      : calculateCharge({
          replacementCost: asset.replacement_cost,
          depreciationRate: rate,
          moveInDate: agreement.tenure_start_date,
          moveOutDate,
        })

    lineItems.push({ asset_id: asset.id, item_name: asset.item_name, charge })
    totalDamageCharges += charge
  }

  const deposit = agreement.deposit_amount ?? 0
  const lastMonthRent = agreement.monthly_rent ?? 0
  const refundable = Math.max(0, deposit - lastMonthRent - totalDamageCharges)
  const owedByTenant = Math.max(0, lastMonthRent + totalDamageCharges - deposit)

  return {
    total_deposit: deposit,
    last_month_rent_deducted: lastMonthRent,
    total_damage_charges: totalDamageCharges,
    refundable_amount: refundable,
    amount_owed_beyond_deposit: owedByTenant,
    line_items: lineItems,
  }
}
