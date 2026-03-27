
-- 5. FORMULARIO SEMESTRAL DE IMPACTO
CREATE TABLE reporte_empleo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  cadena_valor TEXT NOT NULL,
  total_empleos INT DEFAULT 0,
  empleos_creados_total INT DEFAULT 0,
  empleos_creados_manejo_finca INT DEFAULT 0,
  empleos_creados_post_cosecha INT DEFAULT 0,
  empleos_creados_agroindustria INT DEFAULT 0,
  empleos_creados_turismo INT DEFAULT 0,
  region_empleo_creado TEXT,
  empleos_creados_femenino INT DEFAULT 0,
  empleos_creados_masculino INT DEFAULT 0,
  empleos_retenidos_total INT DEFAULT 0,
  empleos_retenidos_manejo_finca INT DEFAULT 0,
  empleos_retenidos_turismo INT DEFAULT 0,
  region_empleo_retenido TEXT,
  empleos_retenidos_femenino INT DEFAULT 0,
  empleos_retenidos_masculino INT DEFAULT 0,
  empleos_mejorados_total INT DEFAULT 0,
  region_empleo_mejorado TEXT,
  empleos_mejorados_femenino INT DEFAULT 0,
  empleos_mejorados_masculino INT DEFAULT 0,
  ingreso_promedio_lb DECIMAL,
  ingreso_promedio_intermedia DECIMAL,
  ingreso_promedio_final DECIMAL,
  variacion_ingresos DECIMAL,
  temporada TEXT,
  estado_registro estado_registro DEFAULT 'borrador',
  validado_por UUID REFERENCES perfiles(id),
  fecha_validacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, anio, periodo, cadena_valor)
);

CREATE TABLE reporte_productividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  cadena_valor TEXT NOT NULL,
  genero_productores TEXT,
  num_productores INT,
  superficie_has DECIMAL,
  produccion_campo_tn DECIMAL,
  productividad_tn_ha DECIMAL GENERATED ALWAYS AS (
    CASE WHEN superficie_has > 0 THEN produccion_campo_tn / superficie_has ELSE 0 END
  ) STORED,
  region TEXT,
  descarte_campo_tn DECIMAL DEFAULT 0,
  descarte_proceso_tn DECIMAL DEFAULT 0,
  total_descarte_tn DECIMAL GENERATED ALWAYS AS (
    COALESCE(descarte_campo_tn, 0) + COALESCE(descarte_proceso_tn, 0)
  ) STORED,
  produccion_exportable_tn DECIMAL GENERATED ALWAYS AS (
    COALESCE(produccion_campo_tn, 0) - COALESCE(descarte_campo_tn, 0) - COALESCE(descarte_proceso_tn, 0)
  ) STORED,
  organizacion_productores TEXT,
  estado_registro estado_registro DEFAULT 'borrador',
  validado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, anio, cadena_valor, genero_productores)
);

CREATE TABLE reporte_comercial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  cadena_valor TEXT NOT NULL,
  ruc TEXT,
  nombre_organizacion TEXT NOT NULL,
  tipo TEXT,
  partida_arancelaria TEXT,
  nombre_partida TEXT,
  valor_fob_primarios DECIMAL DEFAULT 0,
  valor_fob_derivados DECIMAL DEFAULT 0,
  valor_fob_total DECIMAL GENERATED ALWAYS AS (
    COALESCE(valor_fob_primarios, 0) + COALESCE(valor_fob_derivados, 0)
  ) STORED,
  kg_primarios DECIMAL DEFAULT 0,
  kg_derivados DECIMAL DEFAULT 0,
  kg_total DECIMAL GENERATED ALWAYS AS (
    COALESCE(kg_primarios, 0) + COALESCE(kg_derivados, 0)
  ) STORED,
  region_origen TEXT,
  mercados_destino_intl TEXT,
  ventas_nac_primarios DECIMAL DEFAULT 0,
  ventas_nac_derivados DECIMAL DEFAULT 0,
  ventas_nac_total DECIMAL GENERATED ALWAYS AS (
    COALESCE(ventas_nac_primarios, 0) + COALESCE(ventas_nac_derivados, 0)
  ) STORED,
  ventas_terceros_primarios DECIMAL DEFAULT 0,
  ventas_terceros_derivados DECIMAL DEFAULT 0,
  vol_nac_primarios DECIMAL DEFAULT 0,
  vol_nac_derivados DECIMAL DEFAULT 0,
  vol_terceros_primarios DECIMAL DEFAULT 0,
  vol_terceros_derivados DECIMAL DEFAULT 0,
  mercados_destino_nac TEXT,
  cooperativa_exportadora TEXT,
  observaciones TEXT,
  estado_registro estado_registro DEFAULT 'borrador',
  validado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reporte_nuevos_mercados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  ruc TEXT,
  nombre_organizacion TEXT NOT NULL,
  tipo_organizacion TEXT,
  tipo_org_productiva TEXT,
  dni_representante TEXT,
  nombre_representante TEXT,
  genero_representante TEXT,
  acceso_mercado TEXT,
  fecha_primer_envio DATE,
  tipo_mercado TEXT,
  pais_destino TEXT,
  departamento_destino TEXT,
  producto_nuevo_existente TEXT,
  cadena_valor TEXT,
  nombre_producto TEXT,
  tipo_producto TEXT,
  mes_primera_venta TEXT,
  conclusion TEXT,
  estado_registro estado_registro DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reporte_turismo_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  ruc TEXT,
  nombre_empresa TEXT NOT NULL,
  tipo_empresa TEXT,
  region TEXT,
  provincia TEXT,
  clasificacion TEXT,
  ventas_alta_biodiversidad DECIMAL DEFAULT 0,
  ventas_baja_biodiversidad DECIMAL DEFAULT 0,
  ventas_alta_aventura DECIMAL DEFAULT 0,
  ventas_baja_aventura DECIMAL DEFAULT 0,
  ventas_alta_bienestar DECIMAL DEFAULT 0,
  ventas_baja_bienestar DECIMAL DEFAULT 0,
  ventas_alta_general DECIMAL DEFAULT 0,
  ventas_baja_general DECIMAL DEFAULT 0,
  ventas_alta_otros DECIMAL DEFAULT 0,
  ventas_baja_otros DECIMAL DEFAULT 0,
  total_ventas DECIMAL GENERATED ALWAYS AS (
    COALESCE(ventas_alta_biodiversidad,0) + COALESCE(ventas_baja_biodiversidad,0) +
    COALESCE(ventas_alta_aventura,0) + COALESCE(ventas_baja_aventura,0) +
    COALESCE(ventas_alta_bienestar,0) + COALESCE(ventas_baja_bienestar,0) +
    COALESCE(ventas_alta_general,0) + COALESCE(ventas_baja_general,0) +
    COALESCE(ventas_alta_otros,0) + COALESCE(ventas_baja_otros,0)
  ) STORED,
  estado_registro estado_registro DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reporte_turismo_atractivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  ruc_empresa TEXT,
  nombre_empresa TEXT,
  clasificacion TEXT,
  codigo_atractivo TEXT,
  nombre_atractivo TEXT NOT NULL,
  destino TEXT,
  tours_alta INT DEFAULT 0,
  visitantes_alta INT DEFAULT 0,
  ventas_alta DECIMAL DEFAULT 0,
  tours_baja INT DEFAULT 0,
  visitantes_baja INT DEFAULT 0,
  ventas_baja DECIMAL DEFAULT 0,
  estado_registro estado_registro DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reporte_gobernanza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  ruc TEXT,
  nombre_organizacion TEXT NOT NULL,
  tipo_organizacion TEXT,
  tipo_org_productiva TEXT,
  departamento TEXT,
  cadena_valor TEXT,
  fort_institucional BOOLEAN DEFAULT false,
  estructura_org_eficiente BOOLEAN DEFAULT false,
  acceso_mercado_financiamiento BOOLEAN DEFAULT false,
  articulacion_representacion BOOLEAN DEFAULT false,
  buenas_practicas_sostenibilidad BOOLEAN DEFAULT false,
  estado_registro estado_registro DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reporte_diversificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  ruc TEXT,
  nombre_organizacion TEXT NOT NULL,
  tipo_organizacion TEXT,
  tipo_org_productiva TEXT,
  genero_representante TEXT,
  cumple_criterio_1 BOOLEAN DEFAULT false,
  tipo_criterio_1 TEXT,
  nombre_nuevo_producto TEXT,
  fecha_primera_venta DATE,
  cumple_criterio_2 BOOLEAN DEFAULT false,
  tipo_criterio_2 TEXT,
  cumple_criterio_3 BOOLEAN DEFAULT false,
  nombre_proceso TEXT,
  tipo_criterio_3 TEXT,
  resultado_esperado TEXT,
  fecha_adopcion DATE,
  cadena_valor TEXT,
  estado_registro estado_registro DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registro_certificacion_laboral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  tipo_documento TEXT DEFAULT 'DNI',
  num_documento TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  nombres TEXT NOT NULL,
  pais_origen TEXT DEFAULT 'Perú',
  departamento TEXT,
  fecha_nacimiento DATE,
  genero TEXT,
  perfil_ocupacional TEXT,
  ccl_evaluador TEXT,
  sede_ccl TEXT,
  departamento_ccl TEXT,
  fecha_evaluacion DATE,
  aprobo BOOLEAN,
  fecha_aprobacion DATE,
  cadena_valor TEXT,
  ruc_organizacion TEXT,
  nombre_organizacion TEXT,
  estado_registro estado_registro DEFAULT 'borrador',
  created_at TIMESTAMPTZ DEFAULT now()
);
