
CREATE TABLE public.metas_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  entidad_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  anio integer NOT NULL,
  mes integer NOT NULL,
  meta_valor numeric,
  meta_unidad_medida text,
  estado text NOT NULL DEFAULT 'sin_meta',
  comentario_coordinador text,
  propuesta_por uuid REFERENCES public.perfiles(id),
  revisado_por uuid REFERENCES public.perfiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(actividad_id, anio, mes)
);

ALTER TABLE public.metas_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public.metas_mensuales FOR SELECT TO public USING (true);
CREATE POLICY "public_insert" ON public.metas_mensuales FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.metas_mensuales FOR UPDATE TO public USING (true) WITH CHECK (true);
