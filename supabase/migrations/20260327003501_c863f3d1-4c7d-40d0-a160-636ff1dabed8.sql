
-- Vista: Trama Físico-Financiera
CREATE OR REPLACE VIEW v_trama_fisico_financiera AS
SELECT
  ROW_NUMBER() OVER (ORDER BY e.codigo, a.codigo) AS item,
  CURRENT_DATE AS fecha_corte,
  e.codigo AS cod_proy_e_iniciativa,
  e.mecanismo,
  r.codigo AS cod_resultado,
  e.codigo || e.mecanismo AS id_h2,
  r.nombre AS nombre_resultado,
  p.codigo AS cod_producto,
  p.nombre AS nombre_producto,
  a.codigo AS c_actividad,
  a.nombre AS n_actividad,
  a.es_hito AS actividad_hito,
  a.meta_valor AS meta,
  a.meta_unidad_medida AS unidad_de_medida,
  a.medio_verificacion,
  a.fecha_inicio_prog AS mes_anio_inicio_prog,
  a.fecha_fin_prog AS mes_anio_fin_prog,
  COALESCE(rm_agg.avance_acum, 0) AS valor_de_avance,
  a.estado_actual AS estado,
  COALESCE(rm_agg.descripcion_ultimo, '') AS descripcion_de_avance,
  a.presupuesto_seco + a.presupuesto_contrapartida_monetaria + a.presupuesto_contrapartida_no_monetaria AS presupuesto_total,
  a.presupuesto_seco AS presupuesto_cofinanc_seco_p,
  a.presupuesto_contrapartida_monetaria AS aporte_contrapartida_monetaria_p,
  a.presupuesto_contrapartida_no_monetaria AS aporte_contrapartida_no_monetaria_p,
  a.ejecutado_seco_acum AS ejecucion_presupuesto_cof_seco,
  a.ejecutado_cm_acum AS ejecucion_presupuesto_contrapartida_monetaria,
  a.ejecutado_cnm_acum AS ejecucion_presupuesto_contrapartida_no_monetaria,
  CASE WHEN a.presupuesto_seco > 0 
    THEN ROUND(a.ejecutado_seco_acum / a.presupuesto_seco * 100, 1) 
    ELSE 0 END AS pct_avance_cof_seco,
  CASE WHEN a.presupuesto_contrapartida_monetaria > 0 
    THEN ROUND(a.ejecutado_cm_acum / a.presupuesto_contrapartida_monetaria * 100, 1) 
    ELSE 0 END AS pct_avance_cm,
  CASE WHEN a.presupuesto_contrapartida_no_monetaria > 0 
    THEN ROUND(a.ejecutado_cnm_acum / a.presupuesto_contrapartida_no_monetaria * 100, 1) 
    ELSE 0 END AS pct_avance_cnm
FROM actividades a
JOIN productos p ON a.producto_id = p.id
JOIN resultados r ON p.resultado_id = r.id
JOIN entidades e ON a.entidad_id = e.id
LEFT JOIN LATERAL (
  SELECT 
    SUM(avance_valor) AS avance_acum,
    (SELECT descripcion_avance FROM registros_mensuales 
     WHERE actividad_id = a.id AND estado_registro = 'aprobado'
     ORDER BY anio DESC, mes DESC LIMIT 1) AS descripcion_ultimo
  FROM registros_mensuales 
  WHERE actividad_id = a.id AND estado_registro = 'aprobado'
) rm_agg ON true
ORDER BY e.codigo, r.codigo, p.codigo, a.codigo;

-- Vista: Dashboard ejecutivo por entidad
CREATE OR REPLACE VIEW v_dashboard_entidad AS
SELECT
  e.id AS entidad_id,
  e.codigo,
  e.nombre_corto,
  e.mecanismo,
  e.tipo_entidad,
  COUNT(DISTINCT a.id) AS total_actividades,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado_actual = 'culminado_100') AS actividades_completadas,
  SUM(a.presupuesto_seco) AS presupuesto_seco_total,
  SUM(a.ejecutado_seco_acum) AS ejecutado_seco_total,
  CASE WHEN SUM(a.presupuesto_seco) > 0 
    THEN ROUND(SUM(a.ejecutado_seco_acum) / SUM(a.presupuesto_seco) * 100, 1) 
    ELSE 0 END AS pct_ejecucion_seco,
  SUM(a.presupuesto_contrapartida_monetaria) AS presupuesto_cm_total,
  SUM(a.ejecutado_cm_acum) AS ejecutado_cm_total,
  SUM(a.presupuesto_contrapartida_no_monetaria) AS presupuesto_cnm_total,
  SUM(a.ejecutado_cnm_acum) AS ejecutado_cnm_total,
  COUNT(*) FILTER (WHERE a.ejecutado_seco_acum > a.presupuesto_seco AND a.presupuesto_seco > 0) AS sobregiros_seco,
  COUNT(*) FILTER (WHERE a.avance_operativo_pct - 
    CASE WHEN a.presupuesto_seco > 0 THEN a.ejecutado_seco_acum / a.presupuesto_seco * 100 ELSE 0 END > 20) AS desfases_tecnico_financiero
FROM entidades e
LEFT JOIN actividades a ON a.entidad_id = e.id
GROUP BY e.id, e.codigo, e.nombre_corto, e.mecanismo, e.tipo_entidad;
