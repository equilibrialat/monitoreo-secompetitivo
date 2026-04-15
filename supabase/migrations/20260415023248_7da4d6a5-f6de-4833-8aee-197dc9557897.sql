ALTER TABLE reportes_trimestrales
ADD COLUMN IF NOT EXISTS fecha_desde DATE,
ADD COLUMN IF NOT EXISTS fecha_hasta DATE;

UPDATE reportes_trimestrales SET
  fecha_desde = CASE trimestre
    WHEN '2025-T1' THEN '2025-01-01'::date
    WHEN '2025-T2' THEN '2025-04-01'::date
    WHEN '2025-T3' THEN '2025-07-01'::date
    WHEN '2025-T4' THEN '2025-10-01'::date
    WHEN '2026-T1' THEN '2026-01-01'::date
    WHEN '2026-T2' THEN '2026-04-01'::date
  END,
  fecha_hasta = CASE trimestre
    WHEN '2025-T1' THEN '2025-03-31'::date
    WHEN '2025-T2' THEN '2025-06-30'::date
    WHEN '2025-T3' THEN '2025-09-30'::date
    WHEN '2025-T4' THEN '2025-12-31'::date
    WHEN '2026-T1' THEN '2026-03-31'::date
    WHEN '2026-T2' THEN '2026-06-30'::date
  END
WHERE fecha_desde IS NULL;