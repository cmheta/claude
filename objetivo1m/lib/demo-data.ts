import type { Snapshot, Bucket, BucketTransaction, FxRates, NetWorthBreakdown } from "@/types/database"
import { calcNetWorth } from "@/lib/net-worth"

export const DEMO_FX: FxRates = { usdToGbp: 0.79, eurToGbp: 0.86 }
export const DEMO_PRICES = { ma: 435, meli: 1580 }

export const DEMO_SNAPSHOT: Snapshot = {
  id: "demo-snap-may",
  user_id: "demo",
  snapshot_date: "2026-05-01",
  year: 2026,
  month: 5,
  inv_mastercard_shares: 0,
  inv_meli_shares: 0,
  inv_mastercard_gbp: 8200,
  inv_meli_gbp: 14800,
  inv_vusa_vanguard_gbp: 44500,
  inv_vusa_isa_gbp: 83200,
  inv_bonds_usd: 25000,
  inv_litg_gbp: 0,
  pension_lg_gbp: 11800,
  pension_vanguard_gbp: 72400,
  savings_lloyds_gbp: 5200,
  savings_marcus_gbp: 21800,
  savings_revolut_gbp: 650,
  savings_revolut_usd: 420,
  savings_revolut_eur: 200,
  bonus_gbp: 4800,
  ltips_gbp: 0,
  salary_gbp: 6500,
  total_needs_gbp: 2800,
  total_wants_gbp: 950,
  total_pots_usd: 840,
  left_to_save_gbp: 2085,
  monthly_contribution_gbp: 800,
  notes: "Demo — Sofia Reyes",
  created_at: "2026-05-01T00:00:00Z",
}

export const DEMO_PREV_SNAPSHOT: Snapshot = {
  ...DEMO_SNAPSHOT,
  id: "demo-snap-apr",
  snapshot_date: "2026-04-01",
  year: 2026,
  month: 4,
  inv_mastercard_gbp: 7900,
  inv_meli_gbp: 13200,
  inv_vusa_vanguard_gbp: 43200,
  inv_vusa_isa_gbp: 81400,
  savings_lloyds_gbp: 4800,
  savings_marcus_gbp: 21200,
  left_to_save_gbp: 1950,
  created_at: "2026-04-01T00:00:00Z",
}

export const DEMO_BUCKETS: Bucket[] = [
  { id: "demo-b1", user_id: "demo", year: 2026, bucket_name: "vacaciones", annual_budget_usd: 5040, monthly_contribution_usd: 420 },
  { id: "demo-b2", user_id: "demo", year: 2026, bucket_name: "educacion", annual_budget_usd: 1800, monthly_contribution_usd: 150 },
  { id: "demo-b3", user_id: "demo", year: 2026, bucket_name: "fun", annual_budget_usd: 2664, monthly_contribution_usd: 222 },
  { id: "demo-b4", user_id: "demo", year: 2026, bucket_name: "navidad", annual_budget_usd: 576, monthly_contribution_usd: 48 },
]

export const DEMO_BUCKET_TRANSACTIONS: BucketTransaction[] = [
  { id: "demo-t1", user_id: "demo", bucket_id: "demo-b1", transaction_date: "2026-03-15", amount_usd: -890, description: "Vuelo Roma ida y vuelta", created_at: "2026-03-15T00:00:00Z" },
  { id: "demo-t2", user_id: "demo", bucket_id: "demo-b1", transaction_date: "2026-04-20", amount_usd: -320, description: "Hotel 3 noches", created_at: "2026-04-20T00:00:00Z" },
  { id: "demo-t3", user_id: "demo", bucket_id: "demo-b2", transaction_date: "2026-02-10", amount_usd: -299, description: "Curso de Python", created_at: "2026-02-10T00:00:00Z" },
  { id: "demo-t4", user_id: "demo", bucket_id: "demo-b3", transaction_date: "2026-04-05", amount_usd: -180, description: "Cena cumpleaños", created_at: "2026-04-05T00:00:00Z" },
  { id: "demo-t5", user_id: "demo", bucket_id: "demo-b3", transaction_date: "2026-05-01", amount_usd: -95, description: "Concierto", created_at: "2026-05-01T00:00:00Z" },
]

export const DEMO_NW: NetWorthBreakdown = calcNetWorth(DEMO_SNAPSHOT, DEMO_PRICES, DEMO_FX)
export const DEMO_PREV_NW: NetWorthBreakdown = calcNetWorth(DEMO_PREV_SNAPSHOT, DEMO_PRICES, DEMO_FX)
