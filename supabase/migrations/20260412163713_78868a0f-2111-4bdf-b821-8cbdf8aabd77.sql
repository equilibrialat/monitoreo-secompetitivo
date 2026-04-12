
-- Create plan_trimestral table replacing metas_mensuales
CREATE TABLE public.plan_trimestral (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidad_id UUID NOT NULL REFERENCES public.entidades(id),
  actividad_id UUID NOT NULL REFERENCES public.actividades(id),
  trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  anio INTEGER NOT NULL,
  meta_mes_1 NUMERIC DEFAULT 0,
  meta_mes_2 NUMERIC DEFAULT 0,
  meta_mes_3 NUMERIC DEFAULT 0,
  ejecutado_mes_1 NUMERIC DEFAULT 0,
  ejecutado_mes_2 NUMERIC DEFAULT 0,
  ejecutado_mes_3 NUMERIC DEFAULT 0,
  meta_trimestral NUMERIC DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','propuesta_coordinador','en_disputa','aprobada')),
  comentario_coordinador TEXT,
  comentario_entidad TEXT,
  solicitudes_ajuste JSONB DEFAULT '[]'::jsonb,
  propuesto_por UUID REFERENCES public.perfiles(id),
  aprobado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (entidad_id, actividad_id, trimestre, anio)
);

-- Enable RLS
ALTER TABLE public.plan_trimestral ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "public_read" ON public.plan_trimestral FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.plan_trimestral FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.plan_trimestral FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.plan_trimestral FOR DELETE USING (true);
