ALTER TABLE registros_mensuales 
ADD COLUMN IF NOT EXISTS prioridades_proximo_mes TEXT,
ADD COLUMN IF NOT EXISTS limitaciones TEXT,
ADD COLUMN IF NOT EXISTS compromisos TEXT;

CREATE TABLE IF NOT EXISTS reuniones_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES entidades(id),
  fecha DATE NOT NULL,
  participantes TEXT,
  temas_tratados TEXT,
  acuerdos JSONB DEFAULT '[]'::jsonb,
  proxima_reunion DATE,
  registrado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reuniones_seguimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON reuniones_seguimiento FOR SELECT TO public USING (true);
CREATE POLICY "public_insert" ON reuniones_seguimiento FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON reuniones_seguimiento FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON reuniones_seguimiento FOR DELETE TO public USING (true);