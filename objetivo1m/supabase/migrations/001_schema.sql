-- Monthly snapshots
CREATE TABLE IF NOT EXISTS snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  year int NOT NULL,
  month int NOT NULL,

  inv_mastercard_shares numeric DEFAULT 0,
  inv_meli_shares numeric DEFAULT 0,
  inv_vusa_vanguard_gbp numeric DEFAULT 0,
  inv_vusa_isa_gbp numeric DEFAULT 0,
  inv_bonds_usd numeric DEFAULT 0,
  inv_litg_gbp numeric DEFAULT 0,

  pension_lg_gbp numeric DEFAULT 0,
  pension_vanguard_gbp numeric DEFAULT 0,

  savings_marcus_gbp numeric DEFAULT 0,
  savings_revolut_gbp numeric DEFAULT 0,
  savings_revolut_usd numeric DEFAULT 0,
  savings_revolut_eur numeric DEFAULT 0,

  bonus_gbp numeric DEFAULT 0,
  ltips_gbp numeric DEFAULT 0,

  salary_gbp numeric DEFAULT 7000,
  total_needs_gbp numeric DEFAULT 0,
  total_wants_gbp numeric DEFAULT 0,
  total_pots_usd numeric DEFAULT 0,
  left_to_save_gbp numeric DEFAULT 0,
  monthly_contribution_gbp numeric DEFAULT 0,

  notes text,
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, year, month)
);

-- Budget buckets
CREATE TABLE IF NOT EXISTS buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  year int NOT NULL,
  bucket_name text NOT NULL,
  annual_budget_usd numeric DEFAULT 0,
  monthly_contribution_usd numeric DEFAULT 0,
  UNIQUE(user_id, year, bucket_name)
);

-- Bucket transactions
CREATE TABLE IF NOT EXISTS bucket_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  bucket_id uuid REFERENCES buckets ON DELETE CASCADE,
  transaction_date date NOT NULL,
  amount_usd numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- AI analysis history
CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  snapshot_id uuid REFERENCES snapshots ON DELETE SET NULL,
  prompt_context jsonb,
  analysis_text text,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own snapshots" ON snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own buckets" ON buckets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own bucket transactions" ON bucket_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own analyses" ON ai_analyses FOR ALL USING (auth.uid() = user_id);
