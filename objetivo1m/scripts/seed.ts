import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID = process.env.SEED_USER_ID

if (!url || !key || !USER_ID) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID")
  process.exit(1)
}

const supabase = createClient(url, key)

async function seed() {
  console.log("Seeding historical snapshots...")

  const { error: e1 } = await supabase.from("snapshots").upsert({
    user_id: USER_ID,
    snapshot_date: "2024-12-01",
    year: 2024,
    month: 12,
    inv_mastercard_gbp: 875,
    inv_meli_gbp: 0,
    inv_vusa_vanguard_gbp: 51761,
    inv_vusa_isa_gbp: 108806,
    inv_bonds_usd: 39967,
    inv_litg_gbp: 1297,
    pension_lg_gbp: 3986,
    pension_vanguard_gbp: 88964,
    savings_marcus_gbp: 28661,
    bonus_gbp: 9555,
    salary_gbp: 7000,
    monthly_contribution_gbp: 0,
    notes: "2024 year-end — spreadsheet",
  }, { onConflict: "user_id,year,month" })

  if (e1) console.error("Error 2024:", e1.message)
  else console.log("✓ 2024 snapshot inserted")

  const { error: e2 } = await supabase.from("snapshots").upsert({
    user_id: USER_ID,
    snapshot_date: "2026-01-01",
    year: 2026,
    month: 1,
    inv_mastercard_gbp: 3400,
    inv_meli_gbp: 9870,
    inv_vusa_vanguard_gbp: 50623,
    inv_vusa_isa_gbp: 105779,
    inv_bonds_usd: 39995,
    inv_litg_gbp: 0,
    pension_lg_gbp: 15941,
    pension_vanguard_gbp: 90326,
    savings_marcus_gbp: 28926,
    bonus_gbp: 14107,
    ltips_gbp: 5000,
    salary_gbp: 7000,
    monthly_contribution_gbp: 500,
    notes: "2025 year-end / 2026 starting point — spreadsheet",
  }, { onConflict: "user_id,year,month" })

  if (e2) console.error("Error 2026 Jan:", e2.message)
  else console.log("✓ 2026 Jan snapshot inserted")

  const buckets = [
    { user_id: USER_ID, year: 2026, bucket_name: "vacaciones", annual_budget_usd: 5040, monthly_contribution_usd: 420 },
    { user_id: USER_ID, year: 2026, bucket_name: "educacion", annual_budget_usd: 1800, monthly_contribution_usd: 150 },
    { user_id: USER_ID, year: 2026, bucket_name: "fun", annual_budget_usd: 2664, monthly_contribution_usd: 222 },
    { user_id: USER_ID, year: 2026, bucket_name: "navidad", annual_budget_usd: 576, monthly_contribution_usd: 48 },
  ]

  const { error: e3 } = await supabase.from("buckets").upsert(buckets, { onConflict: "user_id,year,bucket_name" })
  if (e3) console.error("Error buckets:", e3.message)
  else console.log("✓ 2026 buckets inserted")

  console.log("\nDone!")
}

seed()
