
-- Table: contratos_financieros (new, does NOT touch existing contratos table)
CREATE TABLE IF NOT EXISTS contratos_financieros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo TEXT NOT NULL,
  actividad_codigo TEXT NOT NULL,
  numero_contrato TEXT,
  tipo TEXT,
  ruc TEXT,
  proveedor_nombre TEXT NOT NULL,
  objeto_contrato TEXT NOT NULL,
  tipo_gasto TEXT,
  moneda TEXT DEFAULT 'USD',
  monto_contrato_moneda_origen NUMERIC,
  tipo_cambio NUMERIC,
  monto_contrato_usd NUMERIC,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT DEFAULT 'vigente',
  documento_url TEXT,
  trimestre_inicio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_fin_entidad 
  ON contratos_financieros (entidad_codigo, actividad_codigo);

ALTER TABLE contratos_financieros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON contratos_financieros FOR SELECT USING (true);
CREATE POLICY "public_insert" ON contratos_financieros FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON contratos_financieros FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON contratos_financieros FOR DELETE USING (true);

-- Table: comprobantes
CREATE TABLE IF NOT EXISTS comprobantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo TEXT NOT NULL,
  actividad_codigo TEXT NOT NULL,
  contrato_id UUID REFERENCES contratos_financieros(id),
  fecha_documento DATE NOT NULL,
  clase_documento TEXT,
  numero_documento TEXT,
  ruc TEXT,
  proveedor_nombre TEXT,
  concepto TEXT NOT NULL,
  moneda TEXT DEFAULT 'USD',
  monto_moneda_origen NUMERIC NOT NULL,
  tipo_cambio NUMERIC DEFAULT 1,
  monto_usd NUMERIC NOT NULL,
  tipo_gasto TEXT,
  trimestre TEXT NOT NULL,
  mes TEXT NOT NULL,
  fuente TEXT DEFAULT 'seco',
  igv_usd NUMERIC DEFAULT 0,
  documento_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_entidad_act 
  ON comprobantes (entidad_codigo, actividad_codigo, trimestre);
CREATE INDEX IF NOT EXISTS idx_comprobantes_trimestre 
  ON comprobantes (entidad_codigo, trimestre);

ALTER TABLE comprobantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON comprobantes FOR SELECT USING (true);
CREATE POLICY "public_insert" ON comprobantes FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON comprobantes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON comprobantes FOR DELETE USING (true);

-- View: aggregated financial report per trimester
CREATE OR REPLACE VIEW v_reporte_financiero_trimestral AS
SELECT
  entidad_codigo,
  actividad_codigo,
  trimestre,
  fuente,
  SUM(CASE WHEN tipo_gasto = 'consultoría' THEN monto_usd ELSE 0 END) AS ejecutado_seco_consultorias,
  SUM(CASE WHEN tipo_gasto = 'terceros' THEN monto_usd ELSE 0 END) AS ejecutado_seco_terceros,
  SUM(CASE WHEN tipo_gasto = 'bienes' THEN monto_usd ELSE 0 END) AS ejecutado_seco_bienes,
  SUM(CASE WHEN tipo_gasto IN ('viáticos','honorarios') THEN monto_usd ELSE 0 END) AS ejecutado_seco_otros,
  SUM(monto_usd) AS ejecutado_total_usd,
  COUNT(*) AS numero_comprobantes
FROM comprobantes
GROUP BY entidad_codigo, actividad_codigo, trimestre, fuente;
