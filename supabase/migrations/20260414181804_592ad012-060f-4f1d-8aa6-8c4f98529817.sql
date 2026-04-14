
-- Drop existing table if it was created previously with different schema
DROP TABLE IF EXISTS reportes_trimestrales;

CREATE TABLE reportes_trimestrales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo TEXT NOT NULL,
  actividad_codigo TEXT NOT NULL,
  trimestre TEXT NOT NULL,
  meses_incluidos JSONB,
  resumen_tecnico_ri TEXT,
  avance_tecnico_trimestre NUMERIC DEFAULT 0,
  avance_tecnico_acumulado NUMERIC DEFAULT 0,
  presupuesto_seco_programado NUMERIC DEFAULT 0,
  ejecutado_seco_consultorias NUMERIC DEFAULT 0,
  ejecutado_seco_terceros NUMERIC DEFAULT 0,
  ejecutado_seco_bienes NUMERIC DEFAULT 0,
  ejecutado_seco_viaticos NUMERIC DEFAULT 0,
  ejecutado_seco_total NUMERIC GENERATED ALWAYS AS (
    COALESCE(ejecutado_seco_consultorias, 0) +
    COALESCE(ejecutado_seco_terceros, 0) +
    COALESCE(ejecutado_seco_bienes, 0) +
    COALESCE(ejecutado_seco_viaticos, 0)
  ) STORED,
  ejecutado_contrapartida NUMERIC DEFAULT 0,
  variacion_seco NUMERIC,
  justificacion_variacion TEXT,
  reportes_mensuales_origen JSONB,
  estado TEXT DEFAULT 'borrador',
  enviado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX idx_trim_unico 
  ON reportes_trimestrales (entidad_codigo, actividad_codigo, trimestre);

ALTER TABLE reportes_trimestrales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON reportes_trimestrales FOR SELECT USING (true);
CREATE POLICY "public_insert" ON reportes_trimestrales FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON reportes_trimestrales FOR UPDATE USING (true) WITH CHECK (true);
