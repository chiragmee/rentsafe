// State compliance rules — Karnataka first, more states in V2
const RULES = {
  Karnataka: [
    {
      id: 'NON_COMPLIANT_DEPOSIT',
      check: ({ deposit_amount, monthly_rent }) =>
        deposit_amount > monthly_rent * 2,
      message: (a) =>
        `Your deposit of ₹${fmt(a.deposit_amount)} exceeds the legal cap of ₹${fmt(a.monthly_rent * 2)} (2 months × ₹${fmt(a.monthly_rent)}) under the Karnataka Rent Amendment Act 2025. Any excess is unenforceable in a Rent Tribunal.`,
      severity: 'error',
    },
  ],
}

function fmt(n) {
  return Number(n).toLocaleString('en-IN')
}

/**
 * Returns array of compliance flags for the given agreement.
 * Each flag: { id, message, severity: 'error' | 'warning' }
 */
export function checkCompliance(agreement) {
  const state = agreement.property_state
  const rules = RULES[state] ?? []
  return rules
    .filter((r) => r.check(agreement))
    .map((r) => ({ id: r.id, message: r.message(agreement), severity: r.severity }))
}
