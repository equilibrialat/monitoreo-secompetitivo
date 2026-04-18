-- Función auxiliar para timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tabla para reasignaciones presupuestales del Anexo B
CREATE TABLE public.reasignaciones_presupuestales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_codigo TEXT NOT NULL,
  mecanismo TEXT NOT NULL,
  actividad_origen_codigo TEXT NOT NULL,
  actividad_destino_codigo TEXT NOT NULL,
  monto_usd NUMERIC NOT NULL,
  tipo_reasignacion TEXT NOT NULL,
  pct_variacion NUMERIC,
  alerta_nivel TEXT,
  alerta_mensaje TEXT,
  justificacion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_coordinador',
  solicitado_por TEXT,
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
  comentario_coordinador TEXT,
  coordinador_nombre TEXT,
  fecha_coordinador TIMESTAMPTZ,
  comentario_ivan TEXT,
  ivan_nombre TEXT,
  fecha_aprobacion TIMESTAMPTZ,
  numero_reasignacion INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reasig_pres_entidad ON public.reasignaciones_presupuestales(entidad_codigo);
CREATE INDEX idx_reasig_pres_estado ON public.reasignaciones_presupuestales(estado);
CREATE INDEX idx_reasig_pres_actividades ON public.reasignaciones_presupuestales(actividad_origen_codigo, actividad_destino_codigo);

ALTER TABLE public.reasignaciones_presupuestales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_reasig_pres" ON public.reasignaciones_presupuestales FOR SELECT USING (true);
CREATE POLICY "public_insert_reasig_pres" ON public.reasignaciones_presupuestales FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_reasig_pres" ON public.reasignaciones_presupuestales FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER trg_reasig_pres_updated
BEFORE UPDATE ON public.reasignaciones_presupuestales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();