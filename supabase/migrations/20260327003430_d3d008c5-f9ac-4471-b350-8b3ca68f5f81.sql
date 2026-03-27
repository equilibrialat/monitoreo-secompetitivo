
-- TRIGGERS AND FUNCTIONS
CREATE OR REPLACE FUNCTION fn_actualizar_acumulados_actividad()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE actividades SET
    ejecutado_seco_acum = COALESCE((
      SELECT SUM(ef.monto) FROM ejecucion_financiera ef
      JOIN registros_mensuales rm ON ef.registro_mensual_id = rm.id
      WHERE ef.actividad_id = COALESCE(NEW.actividad_id, OLD.actividad_id)
      AND ef.fuente = 'cofinanciamiento_seco'
      AND rm.estado_registro IN ('aprobado', 'en_revision_financiera', 'en_revision_tecnica')
    ), 0),
    ejecutado_cm_acum = COALESCE((
      SELECT SUM(ef.monto) FROM ejecucion_financiera ef
      JOIN registros_mensuales rm ON ef.registro_mensual_id = rm.id
      WHERE ef.actividad_id = COALESCE(NEW.actividad_id, OLD.actividad_id)
      AND ef.fuente = 'contrapartida_monetaria'
      AND rm.estado_registro IN ('aprobado', 'en_revision_financiera', 'en_revision_tecnica')
    ), 0),
    ejecutado_cnm_acum = COALESCE((
      SELECT SUM(ef.monto) FROM ejecucion_financiera ef
      JOIN registros_mensuales rm ON ef.registro_mensual_id = rm.id
      WHERE ef.actividad_id = COALESCE(NEW.actividad_id, OLD.actividad_id)
      AND ef.fuente = 'contrapartida_no_monetaria'
      AND rm.estado_registro IN ('aprobado', 'en_revision_financiera', 'en_revision_tecnica')
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.actividad_id, OLD.actividad_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_actualizar_acumulados
AFTER INSERT OR UPDATE OR DELETE ON ejecucion_financiera
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_acumulados_actividad();

-- Historial trigger
CREATE OR REPLACE FUNCTION fn_registrar_historial()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO historial_cambios (tabla, registro_id, accion, usuario_id)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_hist_registros AFTER INSERT OR UPDATE ON registros_mensuales
FOR EACH ROW EXECUTE FUNCTION fn_registrar_historial();
CREATE TRIGGER trg_hist_ejecucion AFTER INSERT OR UPDATE ON ejecucion_financiera
FOR EACH ROW EXECUTE FUNCTION fn_registrar_historial();
CREATE TRIGGER trg_hist_contratos AFTER INSERT OR UPDATE ON contratos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_historial();

-- Budget validation trigger
CREATE OR REPLACE FUNCTION fn_validar_presupuesto()
RETURNS TRIGGER AS $$
DECLARE
  v_presupuesto DECIMAL;
  v_ejecutado DECIMAL;
  v_nuevo_total DECIMAL;
BEGIN
  IF NEW.fuente = 'cofinanciamiento_seco' THEN
    SELECT presupuesto_seco, ejecutado_seco_acum INTO v_presupuesto, v_ejecutado
    FROM actividades WHERE id = NEW.actividad_id;
  ELSIF NEW.fuente = 'contrapartida_monetaria' THEN
    SELECT presupuesto_contrapartida_monetaria, ejecutado_cm_acum INTO v_presupuesto, v_ejecutado
    FROM actividades WHERE id = NEW.actividad_id;
  ELSE
    SELECT presupuesto_contrapartida_no_monetaria, ejecutado_cnm_acum INTO v_presupuesto, v_ejecutado
    FROM actividades WHERE id = NEW.actividad_id;
  END IF;
  v_nuevo_total := v_ejecutado + NEW.monto;
  IF v_nuevo_total > v_presupuesto AND v_presupuesto > 0 THEN
    INSERT INTO historial_cambios (tabla, registro_id, campo, valor_anterior, valor_nuevo, accion)
    VALUES ('ejecucion_financiera', NEW.id, 'ALERTA_SOBREGIRO',
            v_presupuesto::TEXT, v_nuevo_total::TEXT, 'alerta');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validar_presupuesto
BEFORE INSERT ON ejecucion_financiera
FOR EACH ROW EXECUTE FUNCTION fn_validar_presupuesto();

-- INDEXES
CREATE INDEX idx_registros_entidad_periodo ON registros_mensuales(entidad_id, anio, mes);
CREATE INDEX idx_registros_actividad ON registros_mensuales(actividad_id);
CREATE INDEX idx_registros_estado ON registros_mensuales(estado_registro);
CREATE INDEX idx_ejecucion_actividad ON ejecucion_financiera(actividad_id);
CREATE INDEX idx_ejecucion_fuente ON ejecucion_financiera(fuente);
CREATE INDEX idx_actividades_entidad ON actividades(entidad_id);
CREATE INDEX idx_actividades_tags ON actividades USING GIN(tags);
CREATE INDEX idx_contratos_entidad ON contratos(entidad_id);
CREATE INDEX idx_historial_registro ON historial_cambios(registro_id);
CREATE INDEX idx_historial_tabla ON historial_cambios(tabla);
