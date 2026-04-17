export type Snapshot = {
  id: string
  user_id: string
  snapshot_date: string
  year: number
  month: number
  inv_mastercard_shares: number
  inv_meli_shares: number
  inv_mastercard_gbp: number
  inv_meli_gbp: number
  inv_vusa_vanguard_gbp: number
  inv_vusa_isa_gbp: number
  inv_bonds_usd: number
  inv_litg_gbp: number
  pension_lg_gbp: number
  pension_vanguard_gbp: number
  savings_marcus_gbp: number
  savings_revolut_gbp: number
  savings_revolut_usd: number
  savings_revolut_eur: number
  bonus_gbp: number
  ltips_gbp: number
  salary_gbp: number
  total_needs_gbp: number
  total_wants_gbp: number
  total_pots_usd: number
  left_to_save_gbp: number
  monthly_contribution_gbp: number
  notes: string | null
  created_at: string
}

export type Bucket = {
  id: string
  user_id: string
  year: number
  bucket_name: string
  annual_budget_usd: number
  monthly_contribution_usd: number
}

export type BucketTransaction = {
  id: string
  user_id: string
  bucket_id: string
  transaction_date: string
  amount_usd: number
  description: string | null
  created_at: string
}

export type AiAnalysis = {
  id: string
  user_id: string
  snapshot_id: string | null
  prompt_context: Record<string, unknown>
  analysis_text: string
  created_at: string
}

export type FxRates = {
  usdToGbp: number
  eurToGbp: number
  fetchedAt?: number
}

export type StockPrices = {
  ma: number    // GBP (already converted)
  meli: number  // GBP (already converted)
  fetchedAt?: number
}

export type NetWorthBreakdown = {
  investments_gbp: number
  pension_gbp: number
  savings_gbp: number
  bonus_gbp: number
  total_gbp: number
}
