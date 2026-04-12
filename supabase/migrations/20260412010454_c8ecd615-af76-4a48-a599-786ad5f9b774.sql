ALTER TABLE public.resultados
  ADD COLUMN IF NOT EXISTS summary_presupuesto_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary_ejecutado_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary_saldo_usd numeric DEFAULT 0;