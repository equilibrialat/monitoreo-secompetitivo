
-- 6. PROCESOS ADMINISTRATIVOS (fixed: removed immutable generated column)
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  actividad_id UUID REFERENCES actividades(id),
  tipo tipo_contrato NOT NULL,
  estado estado_contrato DEFAULT 'en_proceso',
  numero_contrato TEXT,
  nombre_contratado TEXT NOT NULL,
  ruc_dni TEXT,
  objeto TEXT,
  monto DECIMAL,
  moneda TEXT DEFAULT 'USD',
  fecha_inicio DATE,
  fecha_fin DATE,
  fuente fuente_financiamiento,
  tipo_seleccion TEXT,
  fecha_adjudicacion DATE,
  registrado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE desembolsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  numero_remesa INT NOT NULL,
  monto_usd DECIMAL NOT NULL,
  tipo_cambio DECIMAL,
  monto_pen DECIMAL,
  fecha_desembolso DATE,
  fecha_rendicion DATE,
  trimestre_vinculado TEXT,
  estado TEXT DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, numero_remesa)
);

CREATE TABLE viaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  actividad_id UUID REFERENCES actividades(id),
  nombre_viajero TEXT NOT NULL,
  destino TEXT,
  motivo TEXT,
  fecha_salida DATE,
  fecha_retorno DATE,
  monto_solicitado DECIMAL,
  alojamiento_diario DECIMAL,
  alimentacion_diaria DECIMAL,
  transporte_local DECIMAL,
  monto_liquidado DECIMAL,
  fecha_liquidacion DATE,
  estado TEXT DEFAULT 'solicitado',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reasignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  solicitado_por UUID REFERENCES perfiles(id),
  fecha_solicitud DATE DEFAULT CURRENT_DATE,
  motivo TEXT NOT NULL,
  movimientos JSONB NOT NULL,
  estado TEXT DEFAULT 'solicitado',
  aprobado_por UUID REFERENCES perfiles(id),
  fecha_aprobacion DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE escala_viaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad TEXT NOT NULL,
  departamento TEXT,
  alojamiento DECIMAL NOT NULL,
  alimentacion DECIMAL NOT NULL,
  transporte_local DECIMAL NOT NULL,
  vigente BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE historial_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES perfiles(id),
  accion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE config_indicadores_entidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  trama_codigo TEXT NOT NULL,
  trama_nombre TEXT NOT NULL,
  frecuencia frecuencia_indicador NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, trama_codigo)
);

CREATE TABLE config_gatillos_actividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL,
  tabla_destino TEXT NOT NULL,
  formulario_label TEXT NOT NULL,
  aplica_mecanismo mecanismo_tipo[],
  aplica_tipo_entidad tipo_entidad[],
  campos_requeridos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
