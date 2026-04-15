
CREATE TABLE IF NOT EXISTS public.observaciones_coordinador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo text NOT NULL,
  actividad_codigo text NOT NULL,
  mes text NOT NULL,
  texto text NOT NULL,
  autor text NOT NULL DEFAULT 'Coordinador Regional',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.observaciones_coordinador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public.observaciones_coordinador FOR SELECT TO public USING (true);
CREATE POLICY "public_insert" ON public.observaciones_coordinador FOR INSERT TO public WITH CHECK (true);
