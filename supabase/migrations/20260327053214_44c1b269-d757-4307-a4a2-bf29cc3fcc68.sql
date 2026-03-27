ALTER TABLE historial_cambios ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE historial_cambios ADD COLUMN IF NOT EXISTS nombre_usuario TEXT;