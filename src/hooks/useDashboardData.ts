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
  avance_operativo_promedio: number;
  pendientes_revision: number;
  // New enriched fields
  actividades_sin_iniciar: number;
  registros_observados: number;
  registros_borrador: number;
  tiene_observado: boolean;
  meses_sin_reporte: string[];
  registros_en_revision: number;
  observaciones_detalle: string[];
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
  const { data, error } = await (supabase as any)
    .from("v_dashboard_entidad")
    .select("*");

  if (error) {
    console.error("Error fetching dashboard:", error);
    return [];
  }

  const rows = data || [];
  const entidadIds = rows.map((d: any) => d.entidad_id).filter(Boolean);
  if (entidadIds.length === 0) return [];

  // Parallel fetches
  const [actResult, pendResult, regResult, noIniciadaResult, voucherResult, metasResult] = await Promise.all([
    // Avg avance per entidad
    (supabase as any)
      .from("actividades")
      .select("id, entidad_id, avance_operativo_pct")
      .in("entidad_id", entidadIds),
    // Pending registros
    (supabase as any)
      .from("registros_mensuales")
      .select("entidad_id")
      .in("estado_registro", ["borrador", "en_revision_tecnica", "en_revision_financiera"]),
    // All registros for T4 2025 status analysis
    (supabase as any)
      .from("registros_mensuales")
      .select("entidad_id, mes, anio, estado_registro, observaciones_revision")
      .eq("anio", 2025)
      .in("mes", [10, 11, 12]),
    // Activities sin iniciar
    (supabase as any)
      .from("actividades")
      .select("entidad_id, estado_actual")
      .in("entidad_id", entidadIds)
      .eq("estado_actual", "no_iniciada"),
    // Vouchers for SECO execution
    (supabase as any)
      .from("vouchers_gasto")
      .select("entidad_id, monto_usd"),
    // Metas mensuales for current period
    (supabase as any)
      .from("metas_mensuales")
      .select("actividad_id, entidad_id, estado")
      .in("entidad_id", entidadIds),
  ]);

  // Build set of activity IDs with approved metas
  const approvedMetaActivities = new Set<string>();
  const metasByEntity = new Map<string, { total: number; approved: number }>();
  for (const m of metasResult.data || []) {
    const entry = metasByEntity.get(m.entidad_id) || { total: 0, approved: 0 };
    entry.total++;
    if (m.estado === "aprobada") {
      entry.approved++;
      approvedMetaActivities.add(m.actividad_id);
    }
    metasByEntity.set(m.entidad_id, entry);
  }

  const avanceMap = new Map<string, { sum: number; count: number }>();
  for (const a of actResult.data || []) {
    // Only count activities with approved metas in the average
    if (!approvedMetaActivities.has(a.id) && approvedMetaActivities.size > 0) {
      // If we have any metas data, skip unapproved activities
      const entityMetas = metasByEntity.get(a.entidad_id);
      if (entityMetas && entityMetas.total > 0) continue;
    }
    const cur = avanceMap.get(a.entidad_id) || { sum: 0, count: 0 };
    cur.sum += Number(a.avance_operativo_pct || 0);
    cur.count += 1;
    avanceMap.set(a.entidad_id, cur);
  }

  const pendMap = new Map<string, number>();
  for (const p of pendResult.data || []) {
    pendMap.set(p.entidad_id, (pendMap.get(p.entidad_id) || 0) + 1);
  }

  // Registros analysis per entity
  const regByEntity = new Map<string, any[]>();
  for (const r of regResult.data || []) {
    const arr = regByEntity.get(r.entidad_id) || [];
    arr.push(r);
    regByEntity.set(r.entidad_id, arr);
  }

  // No iniciada count per entity
  const noIniciadaMap = new Map<string, number>();
  for (const a of noIniciadaResult.data || []) {
    noIniciadaMap.set(a.entidad_id, (noIniciadaMap.get(a.entidad_id) || 0) + 1);
  }

  // Voucher totals per entity (SECO ejecutado from real vouchers)
  const voucherMap = new Map<string, number>();
  for (const v of voucherResult.data || []) {
    if (v.entidad_id) {
      voucherMap.set(v.entidad_id, (voucherMap.get(v.entidad_id) || 0) + Number(v.monto_usd || 0));
    }
  }

  return rows.map((d: any) => {
    const av = avanceMap.get(d.entidad_id);
    const regs = regByEntity.get(d.entidad_id) || [];

    // Missing months (T4 2025: 10, 11, 12)
    const mesesConRegistro = new Set(regs.map((r: any) => r.mes));
    const mesesFaltantes: string[] = [];
    for (const m of [10, 11, 12]) {
      if (!mesesConRegistro.has(m)) {
        mesesFaltantes.push(`${MESES_NOMBRE[m]} 2025`);
      }
    }

    // Observados
    const observados = regs.filter((r: any) => r.estado_registro === "observado");
    const borradores = regs.filter((r: any) => r.estado_registro === "borrador");
    const enRevision = regs.filter((r: any) =>
      ["enviado", "en_revision_tecnica", "en_revision_financiera", "en_revision_coordinador"].includes(r.estado_registro)
    );

    // Observaciones detail
    const obsDetalle: string[] = [];
    for (const o of observados) {
      if (o.observaciones_revision) {
        obsDetalle.push(`${MESES_NOMBRE[o.mes]}: ${o.observaciones_revision}`);
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
      total_actividades: Number(d.total_actividades || 0),
      actividades_completadas: Number(d.actividades_completadas || 0),
      presupuesto_seco_total: Number(d.presupuesto_seco_total || 0),
      ejecutado_seco_total: voucherMap.get(d.entidad_id) ?? Number(d.ejecutado_seco_total || 0),
      pct_ejecucion_seco: (() => {
        const ejecutado = voucherMap.get(d.entidad_id) ?? Number(d.ejecutado_seco_total || 0);
        const presupuesto = Number(d.presupuesto_seco_total || 0);
        return presupuesto > 0 ? Math.round((ejecutado / presupuesto) * 100) : 0;
      })(),
      presupuesto_cm_total: Number(d.presupuesto_cm_total || 0),
      ejecutado_cm_total: Number(d.ejecutado_cm_total || 0),
      presupuesto_cnm_total: Number(d.presupuesto_cnm_total || 0),
      ejecutado_cnm_total: Number(d.ejecutado_cnm_total || 0),
      sobregiros_seco: Number(d.sobregiros_seco || 0),
      desfases_tecnico_financiero: Number(d.desfases_tecnico_financiero || 0),
      avance_operativo_promedio: (() => {
        const avgFromActs = av ? Math.round(av.sum / av.count) : 0;
        if (avgFromActs > 0) return avgFromActs;
        // Fallback: compute from financial execution ratio
        const ejecutado = voucherMap.get(d.entidad_id) ?? Number(d.ejecutado_seco_total || 0);
        const presupuesto = Number(d.presupuesto_seco_total || 0);
        return presupuesto > 0 ? Math.round((ejecutado / presupuesto) * 100) : 0;
      })(),
      pendientes_revision: pendMap.get(d.entidad_id) || 0,
      // New fields
      actividades_sin_iniciar: noIniciadaMap.get(d.entidad_id) || 0,
      registros_observados: observados.length,
      registros_borrador: borradores.length,
      tiene_observado: observados.length > 0,
      meses_sin_reporte: mesesFaltantes,
      registros_en_revision: enRevision.length,
      observaciones_detalle: obsDetalle,
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

  const { data: entidades } = await (supabase as any)
    .from("entidades")
    .select("id, nombre_corto");

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
