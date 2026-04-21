-- ============================================================
-- MECANISMO A — Tablas de Ingreso de Data
-- Implementación puramente aditiva. No modifica nada de Mec B.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. mec_a_iniciativas
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_iniciativas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               TEXT NOT NULL,
  epb_nombre           TEXT NOT NULL,
  epb_siglas           TEXT,
  fecha_inicio         DATE NOT NULL,
  fecha_fin            DATE NOT NULL,
  presupuesto_seco_usd NUMERIC(12,2),
  estado               TEXT NOT NULL DEFAULT 'activa'
                         CHECK (estado IN ('activa','cerrada','suspendida')),
  gestor_user_id       UUID REFERENCES auth.users(id),
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_ini_gestor ON public.mec_a_iniciativas(gestor_user_id);
CREATE INDEX idx_mec_a_ini_estado ON public.mec_a_iniciativas(estado);

ALTER TABLE public.mec_a_iniciativas ENABLE ROW LEVEL SECURITY;

-- RLS permisiva para demo (se ajusta a user_id real en producción)
CREATE POLICY "mec_a_ini_select" ON public.mec_a_iniciativas FOR SELECT USING (true);
CREATE POLICY "mec_a_ini_insert" ON public.mec_a_iniciativas FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_ini_update" ON public.mec_a_iniciativas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mec_a_ini_delete" ON public.mec_a_iniciativas FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 2. mec_a_resultados
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_resultados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciativa_id     UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  numero            TEXT NOT NULL,
  nombre            TEXT NOT NULL,
  indicador_nombre  TEXT,
  indicador_unidad  TEXT,
  indicador_meta    NUMERIC(10,2),
  orden             INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_res_ini ON public.mec_a_resultados(iniciativa_id);

ALTER TABLE public.mec_a_resultados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_res_select" ON public.mec_a_resultados FOR SELECT USING (true);
CREATE POLICY "mec_a_res_insert" ON public.mec_a_resultados FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_res_update" ON public.mec_a_resultados FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mec_a_res_delete" ON public.mec_a_resultados FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3. mec_a_productos
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_productos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_id  UUID NOT NULL REFERENCES public.mec_a_resultados(id) ON DELETE CASCADE,
  iniciativa_id UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  numero        TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  orden         INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_prod_res ON public.mec_a_productos(resultado_id);
CREATE INDEX idx_mec_a_prod_ini ON public.mec_a_productos(iniciativa_id);

ALTER TABLE public.mec_a_productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_prod_select" ON public.mec_a_productos FOR SELECT USING (true);
CREATE POLICY "mec_a_prod_insert" ON public.mec_a_productos FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_prod_update" ON public.mec_a_productos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mec_a_prod_delete" ON public.mec_a_productos FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 4. mec_a_actividades
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_actividades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id          UUID NOT NULL REFERENCES public.mec_a_productos(id) ON DELETE CASCADE,
  iniciativa_id        UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  codigo               TEXT NOT NULL,
  descripcion          TEXT NOT NULL,
  unidad_medida        TEXT NOT NULL,
  meta_total           NUMERIC(10,2),
  -- Presupuesto SECO planificado por tipo de recurso (USD)
  seco_honorarios_usd  NUMERIC(12,2) NOT NULL DEFAULT 0,
  seco_viaticos_usd    NUMERIC(12,2) NOT NULL DEFAULT 0,
  seco_servicios_usd   NUMERIC(12,2) NOT NULL DEFAULT 0,
  seco_materiales_usd  NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Contrapartida monetaria planificada (USD)
  cm_honorarios_usd    NUMERIC(12,2) NOT NULL DEFAULT 0,
  cm_viaticos_usd      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cm_servicios_usd     NUMERIC(12,2) NOT NULL DEFAULT 0,
  cm_materiales_usd    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Contrapartida no monetaria planificada (USD)
  cnm_total_usd        NUMERIC(12,2) NOT NULL DEFAULT 0,
  orden                INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_act_prod ON public.mec_a_actividades(producto_id);
CREATE INDEX idx_mec_a_act_ini  ON public.mec_a_actividades(iniciativa_id);

ALTER TABLE public.mec_a_actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_act_select" ON public.mec_a_actividades FOR SELECT USING (true);
CREATE POLICY "mec_a_act_insert" ON public.mec_a_actividades FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_act_update" ON public.mec_a_actividades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mec_a_act_delete" ON public.mec_a_actividades FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 5. mec_a_avance_operativo
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_avance_operativo (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id     UUID NOT NULL REFERENCES public.mec_a_actividades(id) ON DELETE CASCADE,
  iniciativa_id    UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  anio             INTEGER NOT NULL,
  mes              INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  unidades_planif  NUMERIC(10,2),
  unidades_ejecut  NUMERIC(10,2) NOT NULL DEFAULT 0,
  logros           TEXT,
  comentarios      TEXT,
  registrado_por   UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (actividad_id, anio, mes)
);

CREATE INDEX idx_mec_a_avo_act ON public.mec_a_avance_operativo(actividad_id);
CREATE INDEX idx_mec_a_avo_ini ON public.mec_a_avance_operativo(iniciativa_id);
CREATE INDEX idx_mec_a_avo_per ON public.mec_a_avance_operativo(anio, mes);

ALTER TABLE public.mec_a_avance_operativo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_avo_select" ON public.mec_a_avance_operativo FOR SELECT USING (true);
CREATE POLICY "mec_a_avo_insert" ON public.mec_a_avance_operativo FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_avo_update" ON public.mec_a_avance_operativo FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER trg_mec_a_avo_updated
  BEFORE UPDATE ON public.mec_a_avance_operativo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────
-- 6. mec_a_entregables_consultores
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_entregables_consultores (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id             UUID REFERENCES public.mec_a_actividades(id),
  iniciativa_id            UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  -- Datos del consultor/contrato (Claudia los crea)
  consultor_nombre         TEXT NOT NULL,
  consultor_dni_ruc        TEXT,
  objetivo_consultoria     TEXT,
  numero_contrato          TEXT,
  fecha_inicio_contrato    DATE,
  fecha_fin_contrato       DATE,
  -- Datos del entregable
  numero_producto          TEXT NOT NULL,
  descripcion_producto     TEXT,
  presupuesto_soles        NUMERIC(12,2),
  presupuesto_usd          NUMERIC(12,2),
  plazo_entrega            DATE,
  -- Gestión técnica (gestor)
  fecha_recepcion          DATE,
  estado_producto          TEXT NOT NULL DEFAULT 'pendiente'
                             CHECK (estado_producto IN ('pendiente','conforme','con_observaciones','rechazado')),
  observaciones_tecnicas   TEXT,
  medidas_correctivas      TEXT,
  -- Gestión de pago (Carmen)
  fecha_no_objecion        DATE,
  fecha_pago               DATE,
  monto_comprobante_soles  NUMERIC(12,2),
  tipo_cambio              NUMERIC(6,4),
  pago_usd                 NUMERIC(12,2),
  numero_comprobante       TEXT,
  registrado_por           UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_ent_ini   ON public.mec_a_entregables_consultores(iniciativa_id);
CREATE INDEX idx_mec_a_ent_act   ON public.mec_a_entregables_consultores(actividad_id);
CREATE INDEX idx_mec_a_ent_est   ON public.mec_a_entregables_consultores(estado_producto);

ALTER TABLE public.mec_a_entregables_consultores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_ent_select" ON public.mec_a_entregables_consultores FOR SELECT USING (true);
CREATE POLICY "mec_a_ent_insert" ON public.mec_a_entregables_consultores FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_ent_update" ON public.mec_a_entregables_consultores FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER trg_mec_a_ent_updated
  BEFORE UPDATE ON public.mec_a_entregables_consultores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────
-- 7. mec_a_contrapartida_monetaria
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_contrapartida_monetaria (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id        UUID REFERENCES public.mec_a_actividades(id),
  iniciativa_id       UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  tipo_recurso        TEXT NOT NULL
                        CHECK (tipo_recurso IN ('honorarios','viajes_viaticos','servicios_terceros','materiales')),
  fecha_comprobante   DATE NOT NULL,
  nombre_proveedor    TEXT,
  numero_comprobante  TEXT,
  concepto            TEXT NOT NULL,
  monto_soles         NUMERIC(12,2) NOT NULL CHECK (monto_soles > 0),
  tipo_cambio         NUMERIC(6,4),
  monto_usd           NUMERIC(12,2),
  registrado_por      UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_cm_ini ON public.mec_a_contrapartida_monetaria(iniciativa_id);
CREATE INDEX idx_mec_a_cm_act ON public.mec_a_contrapartida_monetaria(actividad_id);

ALTER TABLE public.mec_a_contrapartida_monetaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_cm_select" ON public.mec_a_contrapartida_monetaria FOR SELECT USING (true);
CREATE POLICY "mec_a_cm_insert" ON public.mec_a_contrapartida_monetaria FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_cm_update" ON public.mec_a_contrapartida_monetaria FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mec_a_cm_delete" ON public.mec_a_contrapartida_monetaria FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 8. mec_a_contrapartida_no_monetaria
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_contrapartida_no_monetaria (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id          UUID REFERENCES public.mec_a_actividades(id),
  iniciativa_id         UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  fecha_actividad       DATE NOT NULL,
  nombre_funcionario    TEXT NOT NULL,
  cargo_funcionario     TEXT NOT NULL,
  concepto              TEXT NOT NULL,
  unidad_medida         TEXT NOT NULL DEFAULT 'Hora',
  cantidad              NUMERIC(8,2) NOT NULL CHECK (cantidad > 0),
  costo_unitario_soles  NUMERIC(10,2) NOT NULL CHECK (costo_unitario_soles > 0),
  total_soles           NUMERIC(12,2),
  tipo_cambio           NUMERIC(6,4),
  total_usd             NUMERIC(12,2),
  registrado_por        UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_cnm_ini ON public.mec_a_contrapartida_no_monetaria(iniciativa_id);
CREATE INDEX idx_mec_a_cnm_act ON public.mec_a_contrapartida_no_monetaria(actividad_id);

ALTER TABLE public.mec_a_contrapartida_no_monetaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_cnm_select" ON public.mec_a_contrapartida_no_monetaria FOR SELECT USING (true);
CREATE POLICY "mec_a_cnm_insert" ON public.mec_a_contrapartida_no_monetaria FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_cnm_update" ON public.mec_a_contrapartida_no_monetaria FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mec_a_cnm_delete" ON public.mec_a_contrapartida_no_monetaria FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 9. mec_a_reasignaciones
-- ─────────────────────────────────────────
CREATE TABLE public.mec_a_reasignaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciativa_id         UUID NOT NULL REFERENCES public.mec_a_iniciativas(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL
                          CHECK (tipo IN ('entre_resultados','entre_productos')),
  actividad_origen_id   UUID REFERENCES public.mec_a_actividades(id),
  actividad_destino_id  UUID REFERENCES public.mec_a_actividades(id),
  monto_usd             NUMERIC(12,2) NOT NULL CHECK (monto_usd > 0),
  porcentaje            NUMERIC(5,2),
  justificacion         TEXT NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','aprobado','rechazado')),
  comentario_claudia    TEXT,
  fecha_solicitud       TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_resolucion      TIMESTAMPTZ,
  solicitado_por        UUID REFERENCES auth.users(id),
  resuelto_por          UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mec_a_reas_ini    ON public.mec_a_reasignaciones(iniciativa_id);
CREATE INDEX idx_mec_a_reas_estado ON public.mec_a_reasignaciones(estado);

ALTER TABLE public.mec_a_reasignaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mec_a_reas_select" ON public.mec_a_reasignaciones FOR SELECT USING (true);
CREATE POLICY "mec_a_reas_insert" ON public.mec_a_reasignaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "mec_a_reas_update" ON public.mec_a_reasignaciones FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER trg_mec_a_reas_updated
  BEFORE UPDATE ON public.mec_a_reasignaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
