import type { Snapshot, FxRates, StockPrices, NetWorthBreakdown } from "@/types/database"

export function calcNetWorth(
  snap: Snapshot,
  prices: StockPrices,
  fx: FxRates
): NetWorthBreakdown {
  const { usdToGbp, eurToGbp } = fx

  const maGbp = snap.inv_mastercard_shares * prices.ma * usdToGbp
  const meliGbp = snap.inv_meli_shares * prices.meli * usdToGbp
  const bondsGbp = snap.inv_bonds_usd * usdToGbp

  const investments_gbp =
    maGbp +
    meliGbp +
    snap.inv_vusa_vanguard_gbp +
    snap.inv_vusa_isa_gbp +
    bondsGbp +
    snap.inv_litg_gbp

  const pension_gbp = snap.pension_lg_gbp + snap.pension_vanguard_gbp

  const savings_gbp =
    snap.savings_marcus_gbp +
    snap.savings_revolut_gbp +
    snap.savings_revolut_usd * usdToGbp +
    snap.savings_revolut_eur * eurToGbp

  const bonus_gbp = snap.bonus_gbp + snap.ltips_gbp

  const total_gbp = investments_gbp + pension_gbp + savings_gbp + bonus_gbp

  return { investments_gbp, pension_gbp, savings_gbp, bonus_gbp, total_gbp }
}

export function projectToGoal(
  currentValue: number,
  monthlyContribution: number,
  annualRate: number,
  targetValue = 1_000_000
): { months: number; years: number; finalValue: number } {
  const monthlyRate = annualRate / 12
  let value = currentValue
  let months = 0
  while (value < targetValue && months < 360) {
    value = value * (1 + monthlyRate) + monthlyContribution
    months++
  }
  return { months, years: months / 12, finalValue: value }
}
