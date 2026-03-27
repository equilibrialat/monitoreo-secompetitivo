
-- 0. ENUMS
CREATE TYPE mecanismo_tipo AS ENUM ('A', 'B', 'C');

CREATE TYPE rol_usuario AS ENUM (
  'entidad',
  'coordinador_regional',
  'gestor_mec_a',
  'coordinador_mec_b',
  'monitoreo',
  'administracion',
  'direccion',
  'admin_sistema'
);

CREATE TYPE estado_registro AS ENUM (
  'borrador',
  'enviado',
  'en_revision_coordinador',
  'en_revision_tecnica',
  'en_revision_financiera',
  'observado',
  'aprobado'
);

CREATE TYPE fuente_financiamiento AS ENUM (
  'cofinanciamiento_seco',
  'contrapartida_monetaria',
  'contrapartida_no_monetaria'
);

CREATE TYPE estado_actividad AS ENUM (
  'no_iniciada',
  'iniciado_1_35',
  'en_proceso_36_65',
  'proceso_avanzado_66_99',
  'culminado_100'
);

CREATE TYPE tipo_contrato AS ENUM (
  'persona_natural',
  'persona_juridica'
);

CREATE TYPE estado_contrato AS ENUM (
  'en_proceso',
  'adjudicado',
  'vigente',
  'finalizado',
  'cancelado'
);

CREATE TYPE frecuencia_indicador AS ENUM (
  'mensual',
  'trimestral',
  'semestral',
  'anual',
  'por_evento',
  'por_campana'
);

CREATE TYPE tipo_entidad AS ENUM (
  'mec_b_agro',
  'mec_b_turismo',
  'mec_b_mixto',
  'mec_a'
);

-- 1. USUARIOS
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol rol_usuario NOT NULL DEFAULT 'entidad',
  entidad_id UUID,
  region TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ESTRUCTURA DEL PROGRAMA
CREATE TABLE entidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  nombre_corto TEXT NOT NULL,
  mecanismo mecanismo_tipo NOT NULL,
  tipo_entidad tipo_entidad NOT NULL,
  region TEXT,
  cadena_valor TEXT,
  coordinador_regional_id UUID REFERENCES perfiles(id),
  titulo_proyecto TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, codigo)
);

CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_id UUID NOT NULL REFERENCES resultados(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, codigo)
);

CREATE TABLE actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  es_hito BOOLEAN DEFAULT false,
  meta_valor DECIMAL,
  meta_unidad_medida TEXT,
  medio_verificacion TEXT,
  supuestos TEXT,
  fecha_inicio_prog DATE,
  fecha_fin_prog DATE,
  presupuesto_seco DECIMAL DEFAULT 0,
  presupuesto_contrapartida_monetaria DECIMAL DEFAULT 0,
  presupuesto_contrapartida_no_monetaria DECIMAL DEFAULT 0,
  ejecutado_seco_acum DECIMAL DEFAULT 0,
  ejecutado_cm_acum DECIMAL DEFAULT 0,
  ejecutado_cnm_acum DECIMAL DEFAULT 0,
  avance_operativo_pct DECIMAL DEFAULT 0,
  estado_actual estado_actividad DEFAULT 'no_iniciada',
  tags TEXT[] DEFAULT '{}',
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entidad_id, codigo)
);

-- Add FK from perfiles to entidades
ALTER TABLE perfiles ADD CONSTRAINT perfiles_entidad_id_fkey FOREIGN KEY (entidad_id) REFERENCES entidades(id);
