-- Add 'gestor' to rol_usuario enum
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'gestor';

-- Create gestor_entidades assignment table
CREATE TABLE IF NOT EXISTS public.gestor_entidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id uuid NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  entidad_id uuid NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(gestor_id, entidad_id)
);

ALTER TABLE public.gestor_entidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public.gestor_entidades FOR SELECT TO public USING (true);
CREATE POLICY "public_insert" ON public.gestor_entidades FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_delete" ON public.gestor_entidades FOR DELETE TO public USING (true);