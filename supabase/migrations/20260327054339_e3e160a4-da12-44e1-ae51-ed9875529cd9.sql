CREATE TABLE public.resumenes_regionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinador_id UUID REFERENCES public.perfiles(id),
  region TEXT NOT NULL,
  anio INT NOT NULL,
  mes INT NOT NULL,
  contenido TEXT,
  analisis_ia TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resumenes_regionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public.resumenes_regionales FOR SELECT TO public USING (true);
CREATE POLICY "public_insert" ON public.resumenes_regionales FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.resumenes_regionales FOR UPDATE TO public USING (true) WITH CHECK (true);