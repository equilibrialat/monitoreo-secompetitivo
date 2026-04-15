import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActividadSemaforo {
  actividad_codigo: string;
  actividad_descripcion: string;
  entidad_codigo: string;
  entidad_nombre: string;
  mecanismo: string;
  resultado_intermedio_codigo: string;
  resultado_intermedio: string;
  producto_codigo: string;
  unidad_medida: string;
  meta_total: number;
  presupuesto_seco_usd: number;
  presupuesto_contrapartida_usd: number;
  meses_programados: string[];
  avance_tecnico: number;
  pct_tecnico: number;
  ejecutado_seco: number;
  pct_seco: number;
  ejecutado_contrapartida: number;
  pct_contrapartida: number;
  semaforo_temporal: "verde" | "amarillo" | "rojo";
  semaforo_global: "verde" | "amarillo" | "rojo";
  ultimo_reporte_mes: string | null;
  // Whether this activity comes from reportes_trimestrales only
  solo_reporte_trimestral: boolean;
}

function getCurrentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchActividadesSemaforo(): Promise<ActividadSemaforo[]> {
  const [planRes, compRes, regRes, entRes, rtRes] = await Promise.all([
    (supabase as any).from("planificacion_actividades").select("*").order("entidad_codigo, actividad_codigo"),
    (supabase as any).from("comprobantes").select("entidad_codigo, actividad_codigo, monto_usd, fuente"),
    (supabase as any).from("registros_mensuales").select("entidad_id, actividad_id, avance_valor, anio, mes, actividades!inner(codigo, entidad_id)"),
    (supabase as any).from("entidades").select("id, codigo, nombre_corto, mecanismo"),
    (supabase as any).from("reportes_trimestrales").select("entidad_codigo, actividad_codigo, trimestre, avance_tecnico_trimestre, ejecutado_seco_total, presupuesto_seco_programado, resumen_tecnico_ri, ejecutado_contrapartida"),
  ]);

  const plan = planRes.data || [];
  const comps = compRes.data || [];
  const regs = regRes.data || [];
  const ents = entRes.data || [];
  const rts = rtRes.data || [];

  const entMap = new Map<string, any>(ents.map((e: any) => [e.codigo, e]));
  const entIdToCode = new Map<string, string>(ents.map((e: any) => [e.id, e.codigo]));
  const currentYM = getCurrentYM();

  // Track which entidad_codigo+actividad_codigo combos are in planificacion
  const planKeys = new Set(plan.map((p: any) => `${p.entidad_codigo}|${p.actividad_codigo}`));

  // Aggregate comprobantes
  const compAgg = new Map<string, { seco: number; contrapartida: number }>();
  for (const c of comps) {
    const k = `${c.entidad_codigo}|${c.actividad_codigo}`;
    const cur = compAgg.get(k) || { seco: 0, contrapartida: 0 };
    if (c.fuente === "seco") cur.seco += Number(c.monto_usd || 0);
    else cur.contrapartida += Number(c.monto_usd || 0);
    compAgg.set(k, cur);
  }

  // Aggregate avance from registros
  const avanceAgg = new Map<string, { total: number; lastYM: string | null }>();
  for (const r of regs) {
    const code = r.actividades?.codigo;
    const entCode = entIdToCode.get(r.actividades?.entidad_id);
    if (!code || !entCode) continue;
    const k = `${entCode}|${code}`;
    const cur = avanceAgg.get(k) || { total: 0, lastYM: null };
    cur.total += Number(r.avance_valor || 0);
    const ym = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
    if (!cur.lastYM || ym > cur.lastYM) cur.lastYM = ym;
    avanceAgg.set(k, cur);
  }

  // Build results from planificacion_actividades
  const results: ActividadSemaforo[] = plan.map((p: any) => {
    const k = `${p.entidad_codigo}|${p.actividad_codigo}`;
    const comp = compAgg.get(k) || { seco: 0, contrapartida: 0 };
    const avance = avanceAgg.get(k) || { total: 0, lastYM: null };
    const ent = entMap.get(p.entidad_codigo);
    const meses = (p.meses_programados || []) as string[];
    const meta = Number(p.meta_total || 0);
    const pptoSeco = Number(p.presupuesto_seco_usd || 0);
    const pptoContra = Number(p.presupuesto_contrapartida_usd || 0);

    const pctTec = meta > 0 ? Math.round((avance.total / meta) * 100) : 0;
    const pctSeco = pptoSeco > 0 ? Math.round((comp.seco / pptoSeco) * 100) : 0;
    const pctContra = pptoContra > 0 ? Math.round((comp.contrapartida / pptoContra) * 100) : 0;

    const sorted = [...meses].sort();
    const pastMonths = sorted.filter(m => m <= currentYM);
    const totalMonths = sorted.length;
    const pctTemporal = totalMonths > 0 ? (pastMonths.length / totalMonths) : 0;
    let semaforoTemporal: "verde" | "amarillo" | "rojo" = "verde";
    if (pctTemporal > 0.5 && pctTec < 30) semaforoTemporal = "rojo";
    else if (pctTemporal > 0.3 && pctTec < 50) semaforoTemporal = "amarillo";

    const diff = Math.abs(pctTec - pctSeco);
    let semaforoGlobal: "verde" | "amarillo" | "rojo" = "verde";
    if (diff > 30 || (comp.seco > 0 && avance.total === 0) || (avance.total > 0 && comp.seco === 0 && pptoSeco > 0)) {
      semaforoGlobal = "rojo";
    } else if (diff > 15) {
      semaforoGlobal = "amarillo";
    }

    return {
      actividad_codigo: p.actividad_codigo,
      actividad_descripcion: p.actividad_descripcion || p.actividad_codigo,
      entidad_codigo: p.entidad_codigo,
      entidad_nombre: ent?.nombre_corto || p.entidad_nombre || p.entidad_codigo,
      mecanismo: ent?.mecanismo || p.mecanismo || "",
      resultado_intermedio_codigo: p.resultado_intermedio_codigo || "",
      resultado_intermedio: p.resultado_intermedio || "",
      producto_codigo: p.producto_codigo || "",
      unidad_medida: p.unidad_medida || "",
      meta_total: meta,
      presupuesto_seco_usd: pptoSeco,
      presupuesto_contrapartida_usd: pptoContra,
      meses_programados: meses,
      avance_tecnico: avance.total,
      pct_tecnico: pctTec,
      ejecutado_seco: comp.seco,
      pct_seco: pctSeco,
      ejecutado_contrapartida: comp.contrapartida,
      pct_contrapartida: pctContra,
      semaforo_temporal: semaforoTemporal,
      semaforo_global: semaforoGlobal,
      ultimo_reporte_mes: avance.lastYM,
      solo_reporte_trimestral: false,
    };
  });

  // Add activities from reportes_trimestrales that are NOT in planificacion_actividades
  for (const rt of rts) {
    const k = `${rt.entidad_codigo}|${rt.actividad_codigo}`;
    if (planKeys.has(k)) continue; // already covered
    planKeys.add(k); // dedupe across multiple trimestres

    const ent = entMap.get(rt.entidad_codigo);
    const ejecutadoSeco = Number(rt.ejecutado_seco_total || 0);
    const pptoSeco = Number(rt.presupuesto_seco_programado || 0);
    const avanceTec = Number(rt.avance_tecnico_trimestre || 0);
    const ejecutadoContra = Number(rt.ejecutado_contrapartida || 0);
    const pctSeco = pptoSeco > 0 ? Math.round((ejecutadoSeco / pptoSeco) * 100) : 0;

    // Simple semaphore for RT-only: based on financial execution
    let semaforoGlobal: "verde" | "amarillo" | "rojo" = "verde";
    if (ejecutadoSeco > 0 && avanceTec === 0) semaforoGlobal = "rojo";
    else if (pctSeco > 80) semaforoGlobal = "verde";
    else if (pctSeco > 0 && pctSeco < 30) semaforoGlobal = "amarillo";

    results.push({
      actividad_codigo: rt.actividad_codigo,
      actividad_descripcion: rt.resumen_tecnico_ri ? rt.resumen_tecnico_ri.substring(0, 80) + "..." : rt.actividad_codigo,
      entidad_codigo: rt.entidad_codigo,
      entidad_nombre: ent?.nombre_corto || rt.entidad_codigo,
      mecanismo: ent?.mecanismo || "",
      resultado_intermedio_codigo: "",
      resultado_intermedio: "",
      producto_codigo: "",
      unidad_medida: "",
      meta_total: 0,
      presupuesto_seco_usd: pptoSeco,
      presupuesto_contrapartida_usd: 0,
      meses_programados: [],
      avance_tecnico: avanceTec,
      pct_tecnico: 0,
      ejecutado_seco: ejecutadoSeco,
      pct_seco: pctSeco,
      ejecutado_contrapartida: ejecutadoContra,
      pct_contrapartida: 0,
      semaforo_temporal: "verde",
      semaforo_global: semaforoGlobal,
      ultimo_reporte_mes: rt.trimestre || null,
      solo_reporte_trimestral: true,
    });
  }

  return results;
}

export function useDashboardActividades() {
  return useQuery({
    queryKey: ["dashboard-actividades-semaforo"],
    queryFn: fetchActividadesSemaforo,
    staleTime: 30_000,
  });
}
