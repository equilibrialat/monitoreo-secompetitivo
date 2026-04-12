
-- Create status enum
CREATE TYPE public.trimestre_status AS ENUM ('cerrado', 'activo', 'planificacion', 'futuro');

-- Create trimestres table
CREATE TABLE public.trimestres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anio INTEGER NOT NULL,
  trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  mes_inicio INTEGER NOT NULL,
  mes_fin INTEGER NOT NULL,
  estado trimestre_status NOT NULL DEFAULT 'futuro',
  activated_by UUID REFERENCES public.perfiles(id),
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(anio, trimestre)
);

-- Enable RLS
ALTER TABLE public.trimestres ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "public_read" ON public.trimestres FOR SELECT USING (true);

-- Authenticated users can update (role check done in app layer)
CREATE POLICY "public_update" ON public.trimestres FOR UPDATE USING (true) WITH CHECK (true);

-- Insert for seeding
CREATE POLICY "public_insert" ON public.trimestres FOR INSERT WITH CHECK (true);

-- Seed data
INSERT INTO public.trimestres (anio, trimestre, mes_inicio, mes_fin, estado) VALUES
  (2025, 4, 10, 12, 'cerrado'),
  (2026, 1, 1, 3, 'planificacion'),
  (2026, 2, 4, 6, 'futuro'),
  (2026, 3, 7, 9, 'futuro'),
  (2026, 4, 10, 12, 'futuro');
