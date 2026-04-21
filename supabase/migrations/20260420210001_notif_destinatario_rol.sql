-- ============================================================
-- Extensión de tabla notificaciones para Mecanismo A
-- Añade columna destinatario_rol para notificar a Carmen/Claudia
-- ============================================================
ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS destinatario_rol TEXT;

CREATE INDEX IF NOT EXISTS idx_notif_dest_rol
  ON public.notificaciones(destinatario_rol)
  WHERE destinatario_rol IS NOT NULL;
