
CREATE OR REPLACE VIEW v_reporte_financiero_trimestral
WITH (security_invoker = true) AS
SELECT
  entidad_codigo,
  actividad_codigo,
  trimestre,
  fuente,
  SUM(CASE WHEN tipo_gasto = 'consultoría' THEN monto_usd ELSE 0 END) AS ejecutado_seco_consultorias,
  SUM(CASE WHEN tipo_gasto = 'terceros' THEN monto_usd ELSE 0 END) AS ejecutado_seco_terceros,
  SUM(CASE WHEN tipo_gasto = 'bienes' THEN monto_usd ELSE 0 END) AS ejecutado_seco_bienes,
  SUM(CASE WHEN tipo_gasto IN ('viáticos','honorarios') THEN monto_usd ELSE 0 END) AS ejecutado_seco_otros,
  SUM(monto_usd) AS ejecutado_total_usd,
  COUNT(*) AS numero_comprobantes
FROM comprobantes
GROUP BY entidad_codigo, actividad_codigo, trimestre, fuente;
