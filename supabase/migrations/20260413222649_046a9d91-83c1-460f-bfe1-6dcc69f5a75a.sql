
CREATE TABLE public.planificacion_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo text NOT NULL,
  entidad_nombre text,
  proyecto_codigo text,
  proyecto_nombre text,
  mecanismo text,
  resultado_intermedio text,
  producto text,
  actividad_codigo text NOT NULL,
  actividad_descripcion text,
  unidad_medida text,
  medio_verificacion text,
  meta_total numeric,
  presupuesto_seco_usd numeric,
  meses_programados jsonb,
  responsable text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_planif_entidad_actividad ON public.planificacion_actividades (entidad_codigo, actividad_codigo);
CREATE INDEX idx_planif_entidad ON public.planificacion_actividades (entidad_codigo);

ALTER TABLE public.planificacion_actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public.planificacion_actividades FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.planificacion_actividades FOR INSERT WITH CHECK (true);
