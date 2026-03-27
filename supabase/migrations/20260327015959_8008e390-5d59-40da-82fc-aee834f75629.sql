CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remitente_id UUID REFERENCES perfiles(id),
  tipo TEXT NOT NULL,
  asunto TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  destinatarios JSONB NOT NULL DEFAULT '{}',
  entidad_destino_id UUID REFERENCES entidades(id),
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_read" ON notificaciones FOR SELECT USING (true);
CREATE POLICY "notif_insert" ON notificaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notificaciones FOR UPDATE USING (true);