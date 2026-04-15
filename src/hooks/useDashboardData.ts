import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MESES_NOMBRE: Record<number, string> = {
  1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
};

export interface DashboardEntidad {
  entidad_id: string;
  codigo: string;
  nombre_corto: string;
  mecanismo: string;
  tipo_entidad: string;
  region: string;
  cadena_valor: string;
  total_actividades: number;
  actividades_completadas: number;
  presupuesto_seco_total: number;
  ejecutado_seco_total: number;
  pct_ejecucion_seco: number;
  presupuesto_cm_total: number;
  ejecutado_cm_total: number;
  presupuesto_cnm_total: number;
  ejecutado_cnm_total: number;
  sobregiros_seco: number;
  desfases_tecnico_financiero: number;
  avance_operativo_promedio: number | null;
  pendientes_revision: number;
  actividades_sin_iniciar: number;
  registros_observados: number;
  registros_borrador: number;
  tiene_observado: boolean;
  meses_sin_reporte: string[];
  registros_en_revision: number;
  observaciones_detalle: string[];
  // Whether entity has any data (actividades OR reportes_trimestrales)
  has_data: boolean;
  // Whether data comes from reportes_trimestrales only (no actividades table)
  solo_reportes_trimestrales: boolean;
  // Whether entity has planificacion_actividades (Anexo B) loaded
  sin_planificacion: boolean;
}

export interface SobregirosDetalle {
  entidad_nombre: string;
  actividad_codigo: string;
  actividad_nombre: string;
  presupuesto: number;
  ejecutado: number;
  pct: number;
}

async function fetchDashboardEntidades(): Promise<DashboardEntidad[]> {
  // Fetch view data and reportes_trimestrales aggregation in parallel
  const [viewRes, rtRes] = await Promise.all([
    (supabase as any).from("v_dashboard_entidad").select("*"),
    (supabase as any).from("reportes_trimestrales").select("entidad_codigo, ejecutado_seco_total, presupuesto_seco_programado, avance_tecnico_trimestre, resumen_tecnico_ri"),
  ]);

  if (viewRes.error) {
    console.error("Error fetching dashboard:", viewRes.error);
    return [];
  }

  const rows = viewRes.data || [];
  const rtData = rtRes.data || [];

  // Aggregate reportes_trimestrales by entidad_codigo
  const rtAgg = new Map<string, { ejecutado: number; presupuesto: number; count: number; avanceTec: number; avanceCount: number }>();
  for (const r of rtData) {
    const key = r.entidad_codigo;
    const cur = rtAgg.get(key) || { ejecutado: 0, presupuesto: 0, count: 0, avanceTec: 0, avanceCount: 0 };
    cur.ejecutado += Number(r.ejecutado_seco_total || 0);
    cur.presupuesto += Number(r.presupuesto_seco_programado || 0);
    cur.count += 1;
    if (r.avance_tecnico_trimestre != null) {
      cur.avanceTec += Number(r.avance_tecnico_trimestre);
      cur.avanceCount += 1;
    }
    rtAgg.set(key, cur);
  }

  const entidadIds = rows.map((d: any) => d.entidad_id).filter(Boolean);
  if (entidadIds.length === 0) return [];

  // Parallel fetches
  const [actResult, pendResult, regResult, noIniciadaResult, voucherResult, metasResult, planActResult] = await Promise.all([
    (supabase as any).from("actividades").select("id, entidad_id, avance_operativo_pct").in("entidad_id", entidadIds),
    (supabase as any).from("registros_mensuales").select("entidad_id").in("estado_registro", ["borrador", "en_revision_tecnica", "en_revision_financiera"]),
    (supabase as any).from("registros_mensuales").select("entidad_id, mes, anio, estado_registro, observaciones_revision").eq("anio", 2025).in("mes", [10, 11, 12]),
    (supabase as any).from("actividades").select("entidad_id, estado_actual").in("entidad_id", entidadIds).eq("estado_actual", "no_iniciada"),
    (supabase as any).from("vouchers_gasto").select("entidad_id, monto_usd"),
    (supabase as any).from("plan_trimestral").select("actividad_id, entidad_id, estado").in("entidad_id", entidadIds),
    (supabase as any).from("planificacion_actividades").select("entidad_codigo"),
  ]);

  // Track which entidad_codigo has planificacion_actividades (Anexo B)
  const entidadesConPlanificacion = new Set<string>();
  for (const pa of planActResult.data || []) {
    entidadesConPlanificacion.add(pa.entidad_codigo);
  }

  const approvedMetaActivities = new Set<string>();
  const metasByEntity = new Map<string, { total: number; approved: number }>();
  for (const m of metasResult.data || []) {
    const entry = metasByEntity.get(m.entidad_id) || { total: 0, approved: 0 };
    entry.total++;
    if (m.estado === "aprobada") { entry.approved++; approvedMetaActivities.add(m.actividad_id); }
    metasByEntity.set(m.entidad_id, entry);
  }

  const avanceMap = new Map<string, { sum: number; count: number }>();
  for (const a of actResult.data || []) {
    if (!approvedMetaActivities.has(a.id) && approvedMetaActivities.size > 0) {
      const entityMetas = metasByEntity.get(a.entidad_id);
      if (entityMetas && entityMetas.total > 0) continue;
    }
    const cur = avanceMap.get(a.entidad_id) || { sum: 0, count: 0 };
    cur.sum += Number(a.avance_operativo_pct || 0);
    cur.count += 1;
    avanceMap.set(a.entidad_id, cur);
  }

  const pendMap = new Map<string, number>();
  for (const p of pendResult.data || []) { pendMap.set(p.entidad_id, (pendMap.get(p.entidad_id) || 0) + 1); }

  const regByEntity = new Map<string, any[]>();
  for (const r of regResult.data || []) {
    const arr = regByEntity.get(r.entidad_id) || [];
    arr.push(r);
    regByEntity.set(r.entidad_id, arr);
  }

  const noIniciadaMap = new Map<string, number>();
  for (const a of noIniciadaResult.data || []) { noIniciadaMap.set(a.entidad_id, (noIniciadaMap.get(a.entidad_id) || 0) + 1); }

  const voucherMap = new Map<string, number>();
  for (const v of voucherResult.data || []) {
    if (v.entidad_id) voucherMap.set(v.entidad_id, (voucherMap.get(v.entidad_id) || 0) + Number(v.monto_usd || 0));
  }

  return rows.map((d: any) => {
    const av = avanceMap.get(d.entidad_id);
    const regs = regByEntity.get(d.entidad_id) || [];
    const totalAct = Number(d.total_actividades || 0);
    const rt = rtAgg.get(d.codigo);
    const hasActData = totalAct > 0;
    const hasRtData = rt != null && rt.count > 0;
    const soloRT = !hasActData && hasRtData;

    const mesesConRegistro = new Set(regs.map((r: any) => r.mes));
    const mesesFaltantes: string[] = [];
    for (const m of [10, 11, 12]) {
      if (!mesesConRegistro.has(m)) mesesFaltantes.push(`${MESES_NOMBRE[m]} 2025`);
    }

    const observados = regs.filter((r: any) => r.estado_registro === "observado");
    const borradores = regs.filter((r: any) => r.estado_registro === "borrador");
    const enRevision = regs.filter((r: any) =>
      ["enviado", "en_revision_tecnica", "en_revision_financiera", "en_revision_coordinador"].includes(r.estado_registro)
    );
    const obsDetalle: string[] = [];
    for (const o of observados) {
      if (o.observaciones_revision) obsDetalle.push(`${MESES_NOMBRE[o.mes]}: ${o.observaciones_revision}`);
    }

    // For entities with only RT data, use RT financials
    let presupuestoSeco = Number(d.presupuesto_seco_total || 0);
    let ejecutadoSeco = voucherMap.get(d.entidad_id) ?? Number(d.ejecutado_seco_total || 0);

    if (soloRT && rt) {
      presupuestoSeco = rt.presupuesto;
      ejecutadoSeco = rt.ejecutado;
    }

    const pctEjecucion = presupuestoSeco > 0 ? Math.round((ejecutadoSeco / presupuestoSeco) * 100) : 0;

    // Avance operativo: for RT-only entities, use RT avance if available
    let avanceOp: number | null = null;
    if (av && av.count > 0) {
      avanceOp = Math.round(av.sum / av.count);
    } else if (soloRT) {
      // No avance técnico calculable without planificación
      avanceOp = null;
    } else {
      const entityMetas = metasByEntity.get(d.entidad_id);
      if (entityMetas && entityMetas.total > 0 && entityMetas.approved === 0) {
        avanceOp = null;
      } else {
        avanceOp = presupuestoSeco > 0 ? Math.round((ejecutadoSeco / presupuestoSeco) * 100) : 0;
      }
    }

    return {
      entidad_id: d.entidad_id,
      codigo: d.codigo || "",
      nombre_corto: d.nombre_corto || "",
      mecanismo: d.mecanismo || "",
      tipo_entidad: d.tipo_entidad || "",
      region: d.region || "",
      cadena_valor: d.cadena_valor || "",
      total_actividades: soloRT ? rt!.count : totalAct,
      actividades_completadas: Number(d.actividades_completadas || 0),
      presupuesto_seco_total: presupuestoSeco,
      ejecutado_seco_total: ejecutadoSeco,
      pct_ejecucion_seco: pctEjecucion,
      presupuesto_cm_total: Number(d.presupuesto_cm_total || 0),
      ejecutado_cm_total: Number(d.ejecutado_cm_total || 0),
      presupuesto_cnm_total: Number(d.presupuesto_cnm_total || 0),
      ejecutado_cnm_total: Number(d.ejecutado_cnm_total || 0),
      sobregiros_seco: Number(d.sobregiros_seco || 0),
      desfases_tecnico_financiero: Number(d.desfases_tecnico_financiero || 0),
      avance_operativo_promedio: avanceOp,
      pendientes_revision: pendMap.get(d.entidad_id) || 0,
      actividades_sin_iniciar: noIniciadaMap.get(d.entidad_id) || 0,
      registros_observados: observados.length,
      registros_borrador: borradores.length,
      tiene_observado: observados.length > 0,
      meses_sin_reporte: mesesFaltantes,
      registros_en_revision: enRevision.length,
      observaciones_detalle: obsDetalle,
      has_data: hasActData || hasRtData,
      solo_reportes_trimestrales: soloRT,
      sin_planificacion: !entidadesConPlanificacion.has(d.codigo || ""),
    };
  });
}

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-entidades"],
    queryFn: fetchDashboardEntidades,
    staleTime: 30_000,
  });
}

export async function fetchSobregiroDetalle(): Promise<SobregirosDetalle[]> {
  const { data: actividades } = await (supabase as any)
    .from("actividades")
    .select("id, codigo, nombre, entidad_id, presupuesto_seco, ejecutado_seco_acum");
  if (!actividades) return [];
  const { data: entidades } = await (supabase as any).from("entidades").select("id, nombre_corto");
  const entMap = new Map((entidades || []).map((e: any) => [e.id, e.nombre_corto]));
  return actividades
    .filter((a: any) => {
      const ppto = Number(a.presupuesto_seco || 0);
      const ejec = Number(a.ejecutado_seco_acum || 0);
      return ppto > 0 && ejec > ppto;
    })
    .map((a: any) => ({
      entidad_nombre: entMap.get(a.entidad_id) || "",
      actividad_codigo: a.codigo,
      actividad_nombre: a.nombre,
      presupuesto: Number(a.presupuesto_seco || 0),
      ejecutado: Number(a.ejecutado_seco_acum || 0),
      pct: Math.round((Number(a.ejecutado_seco_acum || 0) / Number(a.presupuesto_seco || 1)) * 100),
    }));
}
