
DROP VIEW IF EXISTS v_dashboard_entidad;

CREATE VIEW v_dashboard_entidad AS
SELECT
  e.id AS entidad_id,
  e.codigo,
  e.nombre_corto,
  e.mecanismo,
  e.tipo_entidad,
  e.region,
  e.cadena_valor,
  COUNT(a.id) AS total_actividades,
  COUNT(a.id) FILTER (WHERE a.estado_actual = 'culminado_100') AS actividades_completadas,
  COALESCE(SUM(a.presupuesto_seco), 0) AS presupuesto_seco_total,
  COALESCE(SUM(a.ejecutado_seco_acum), 0) AS ejecutado_seco_total,
  CASE WHEN COALESCE(SUM(a.presupuesto_seco), 0) > 0
    THEN ROUND(COALESCE(SUM(a.ejecutado_seco_acum), 0) / SUM(a.presupuesto_seco) * 100, 1)
    ELSE 0 END AS pct_ejecucion_seco,
  COALESCE(SUM(a.presupuesto_contrapartida_monetaria), 0) AS presupuesto_cm_total,
  COALESCE(SUM(a.ejecutado_cm_acum), 0) AS ejecutado_cm_total,
  COALESCE(SUM(a.presupuesto_contrapartida_no_monetaria), 0) AS presupuesto_cnm_total,
  COALESCE(SUM(a.ejecutado_cnm_acum), 0) AS ejecutado_cnm_total,
  COUNT(a.id) FILTER (WHERE a.ejecutado_seco_acum > a.presupuesto_seco AND a.presupuesto_seco > 0) AS sobregiros_seco,
  COUNT(a.id) FILTER (WHERE a.avance_operativo_pct > 0 AND a.presupuesto_seco > 0
    AND ABS(a.avance_operativo_pct - (a.ejecutado_seco_acum / a.presupuesto_seco * 100)) > 30) AS desfases_tecnico_financiero
FROM entidades e
LEFT JOIN actividades a ON a.entidad_id = e.id
WHERE e.activo = true
GROUP BY e.id, e.codigo, e.nombre_corto, e.mecanismo, e.tipo_entidad, e.region, e.cadena_valor;

ALTER VIEW v_dashboard_entidad OWNER TO postgres;
GRANT SELECT ON v_dashboard_entidad TO anon, authenticated;
