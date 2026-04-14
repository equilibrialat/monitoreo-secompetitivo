
-- Create reportes_trimestrales table
CREATE TABLE public.reportes_trimestrales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo text NOT NULL,
  actividad_codigo text NOT NULL,
  resultado_intermedio_codigo text,
  trimestre text NOT NULL, -- YYYY-T1, YYYY-T2, etc.
  resumen_tecnico_ri text,
  avance_tecnico_acumulado numeric DEFAULT 0,
  presupuesto_seco_programado numeric DEFAULT 0,
  ejecutado_seco_consultorias numeric DEFAULT 0,
  ejecutado_seco_terceros numeric DEFAULT 0,
  ejecutado_seco_bienes numeric DEFAULT 0,
  ejecutado_seco_viaticos numeric DEFAULT 0,
  ejecutado_seco_total numeric DEFAULT 0,
  ejecutado_contrapartida numeric DEFAULT 0,
  justificacion_variacion text,
  estado text NOT NULL DEFAULT 'borrador',
  enviado_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(entidad_codigo, actividad_codigo, trimestre)
);

CREATE INDEX idx_reportes_trimestrales_entidad ON public.reportes_trimestrales(entidad_codigo);
CREATE INDEX idx_reportes_trimestrales_trimestre ON public.reportes_trimestrales(entidad_codigo, trimestre);

ALTER TABLE public.reportes_trimestrales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public.reportes_trimestrales FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.reportes_trimestrales FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.reportes_trimestrales FOR UPDATE USING (true) WITH CHECK (true);
