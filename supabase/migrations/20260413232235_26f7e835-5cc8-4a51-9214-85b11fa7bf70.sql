
-- Add new hierarchy columns to planificacion_actividades
ALTER TABLE public.planificacion_actividades
  ADD COLUMN IF NOT EXISTS resultado_impacto text,
  ADD COLUMN IF NOT EXISTS resultado_final text,
  ADD COLUMN IF NOT EXISTS resultado_intermedio_codigo text,
  ADD COLUMN IF NOT EXISTS resultado_intermedio_descripcion text,
  ADD COLUMN IF NOT EXISTS producto_codigo text,
  ADD COLUMN IF NOT EXISTS producto_descripcion text;

-- Add UPDATE and DELETE policies so we can manage seed data
CREATE POLICY "public_update" ON public.planificacion_actividades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.planificacion_actividades FOR DELETE USING (true);
