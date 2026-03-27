
-- 4. INDICADORES CONTEXTUALES
CREATE TABLE registro_capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  nombre_accion_formativa TEXT NOT NULL,
  tipo_accion_formativa TEXT,
  tema TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  departamento TEXT,
  modalidad TEXT,
  total_participantes INT DEFAULT 0,
  participantes_masculino INT DEFAULT 0,
  participantes_femenino INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE participantes_capacitacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capacitacion_id UUID NOT NULL REFERENCES registro_capacitaciones(id) ON DELETE CASCADE,
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  tipo_documento TEXT DEFAULT 'DNI',
  num_documento TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  nombres TEXT NOT NULL,
  fecha_nacimiento DATE,
  genero TEXT CHECK (genero IN ('M', 'F')),
  pais_origen TEXT DEFAULT 'Perú',
  aplico_aprendizaje BOOLEAN,
  ruc_organizacion TEXT,
  nombre_organizacion TEXT,
  tipo_organizacion TEXT,
  tipo_org_productiva TEXT,
  cadena_valor TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registro_innovaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  nombre_innovacion TEXT NOT NULL,
  optimizacion_recursos BOOLEAN DEFAULT false,
  optimizacion_procesos BOOLEAN DEFAULT false,
  tecnificacion_mecanizacion BOOLEAN DEFAULT false,
  digitalizacion_trazabilidad BOOLEAN DEFAULT false,
  sostenibilidad_certificaciones BOOLEAN DEFAULT false,
  valor_agregado_calidad BOOLEAN DEFAULT false,
  cadena_valor TEXT,
  ruc_organizacion TEXT,
  nombre_organizacion TEXT,
  tipo_organizacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registro_gei (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  tipo_accion TEXT,
  nombre_practica TEXT NOT NULL,
  categoria TEXT,
  cadena_valor TEXT,
  etapa_implementacion TEXT,
  fecha_prog_culminacion DATE,
  ruc_organizacion TEXT,
  nombre_organizacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registro_nuevos_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  nombre_producto TEXT NOT NULL,
  cadena_valor TEXT,
  transformacion_primario BOOLEAN DEFAULT false,
  mejora_empaque BOOLEAN DEFAULT false,
  diferenciacion_origen BOOLEAN DEFAULT false,
  incorpora_innovacion BOOLEAN DEFAULT false,
  tipo_tecnologia TEXT,
  tipo_procesamiento TEXT,
  etapa_cadena_valor TEXT,
  ruc_organizacion TEXT,
  nombre_organizacion TEXT,
  tipo_organizacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registro_normativo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  tipo_marco TEXT NOT NULL,
  nombre_documento TEXT NOT NULL,
  subtipo TEXT,
  estado TEXT NOT NULL,
  numero_documento TEXT,
  fecha_aprobacion DATE,
  descripcion TEXT,
  contribucion TEXT,
  categoria_tramite TEXT,
  detalle_simplificado TEXT,
  monto_financiamiento DECIMAL,
  sectores_beneficiarios TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registro_financiamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_mensual_id UUID NOT NULL REFERENCES registros_mensuales(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  fondo_instrumento TEXT NOT NULL,
  tipo_financiamiento TEXT,
  fecha_desembolso DATE,
  tipo_organizacion_financiada TEXT,
  monto_total DECIMAL,
  monto_san_martin DECIMAL DEFAULT 0,
  monto_piura DECIMAL DEFAULT 0,
  monto_la_libertad DECIMAL DEFAULT 0,
  num_organizaciones_total INT DEFAULT 0,
  num_organizaciones_sm INT DEFAULT 0,
  num_organizaciones_piura INT DEFAULT 0,
  num_organizaciones_ll INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
