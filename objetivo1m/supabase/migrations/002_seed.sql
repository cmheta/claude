-- Seed historical snapshots for Cami
-- Run after creating user account. Replace USER_ID with actual auth.users UUID.

-- 2024 year-end snapshot
INSERT INTO snapshots (
  user_id, snapshot_date, year, month,
  inv_mastercard_shares, inv_meli_shares,
  inv_vusa_vanguard_gbp, inv_vusa_isa_gbp,
  inv_bonds_usd, inv_litg_gbp,
  pension_lg_gbp, pension_vanguard_gbp,
  savings_marcus_gbp, savings_revolut_gbp, savings_revolut_usd, savings_revolut_eur,
  bonus_gbp, ltips_gbp,
  salary_gbp, total_needs_gbp, total_wants_gbp, total_pots_usd, left_to_save_gbp,
  monthly_contribution_gbp, notes
) VALUES (
  'USER_ID_PLACEHOLDER', '2024-12-01', 2024, 12,
  0, 0,
  51761, 108806,
  39967, 1297,
  3986, 88964,
  28661, 0, 0, 0,
  9555, 0,
  7000, 0, 0, 0, 0,
  0, '2024 year-end from spreadsheet'
)
ON CONFLICT (user_id, year, month) DO NOTHING;

-- 2025 year-end / 2026 starting snapshot
INSERT INTO snapshots (
  user_id, snapshot_date, year, month,
  inv_mastercard_shares, inv_meli_shares,
  inv_vusa_vanguard_gbp, inv_vusa_isa_gbp,
  inv_bonds_usd, inv_litg_gbp,
  pension_lg_gbp, pension_vanguard_gbp,
  savings_marcus_gbp, savings_revolut_gbp, savings_revolut_usd, savings_revolut_eur,
  bonus_gbp, ltips_gbp,
  salary_gbp, total_needs_gbp, total_wants_gbp, total_pots_usd, left_to_save_gbp,
  monthly_contribution_gbp, notes
) VALUES (
  'USER_ID_PLACEHOLDER', '2026-01-01', 2026, 1,
  25, 5,
  50623, 105779,
  39995, 0,
  15941, 90326,
  28926, 0, 0, 0,
  14107, 5000,
  7000, 0, 0, 0, 0,
  500, '2025 year-end / 2026 starting snapshot from spreadsheet'
)
ON CONFLICT (user_id, year, month) DO NOTHING;

-- Default 2026 buckets
INSERT INTO buckets (user_id, year, bucket_name, annual_budget_usd, monthly_contribution_usd)
VALUES
  ('USER_ID_PLACEHOLDER', 2026, 'vacaciones', 5040, 420),
  ('USER_ID_PLACEHOLDER', 2026, 'educacion', 1800, 150),
  ('USER_ID_PLACEHOLDER', 2026, 'fun', 2664, 222),
  ('USER_ID_PLACEHOLDER', 2026, 'navidad', 576, 48)
ON CONFLICT (user_id, year, bucket_name) DO NOTHING;
