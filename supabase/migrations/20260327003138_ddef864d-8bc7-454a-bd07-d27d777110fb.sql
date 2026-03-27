
-- Indicadores del Marco Lógico
CREATE TABLE indicadores_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  resultado_id UUID REFERENCES resultados(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL,
  unidad_medida TEXT,
  linea_base DECIMAL,
  meta DECIMAL,
  medio_verificacion TEXT,
  standard_indicator_seco TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, codigo)
);

-- 3. REGISTRO MENSUAL
CREATE TABLE registros_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  avance_valor DECIMAL,
  avance_unidad_medida TEXT,
  estado estado_actividad,
  descripcion_avance TEXT,
  fecha_ejecucion DATE,
  estado_registro estado_registro DEFAULT 'borrador',
  registrado_por UUID REFERENCES perfiles(id),
  fecha_registro TIMESTAMPTZ DEFAULT now(),
  revisado_por UUID REFERENCES perfiles(id),
  fecha_revision TIMESTAMPTZ,
  observaciones_revision TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(actividad_id, anio, mes)
);

CREATE TABLE ejecucion_financiera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  fuente fuente_financiamiento NOT NULL,
  monto DECIMAL NOT NULL CHECK (monto >= 0),
  tipo_gasto TEXT,
  detalle_gasto TEXT,
  comprobante_ref TEXT,
  fecha_gasto DATE,
  entidad_aportante TEXT,
  tipo_valorizacion TEXT,
  moneda TEXT DEFAULT 'USD',
  tipo_cambio DECIMAL,
  monto_usd DECIMAL,
  incluye_igv BOOLEAN DEFAULT false,
  monto_igv DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(registro_mensual_id, fuente, tipo_gasto, fecha_gasto)
);
