import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // Avg avance per entidad
  const { data: actData } = await (supabase as any)
    .from("actividades")
    .select("entidad_id, avance_operativo_pct")
    .in("entidad_id", entidadIds);

  const avanceMap = new Map<string, { sum: number; count: number }>();
  for (const a of actData || []) {
    const cur = avanceMap.get(a.entidad_id) || { sum: 0, count: 0 };
    cur.sum += Number(a.avance_operativo_pct || 0);
    cur.count += 1;
    avanceMap.set(a.entidad_id, cur);
  }

  // Pending registros
  const { data: pendData } = await (supabase as any)
    .from("registros_mensuales")
    .select("entidad_id")
    .in("estado_registro", ["borrador", "en_revision_tecnica", "en_revision_financiera"]);

  const pendMap = new Map<string, number>();
  for (const p of pendData || []) {
    pendMap.set(p.entidad_id, (pendMap.get(p.entidad_id) || 0) + 1);
  }

  return rows.map((d: any) => {
    const av = avanceMap.get(d.entidad_id);
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
      ejecutado_seco_total: Number(d.ejecutado_seco_total || 0),
      pct_ejecucion_seco: Number(d.pct_ejecucion_seco || 0),
      presupuesto_cm_total: Number(d.presupuesto_cm_total || 0),
      ejecutado_cm_total: Number(d.ejecutado_cm_total || 0),
      presupuesto_cnm_total: Number(d.presupuesto_cnm_total || 0),
      ejecutado_cnm_total: Number(d.ejecutado_cnm_total || 0),
      sobregiros_seco: Number(d.sobregiros_seco || 0),
      desfases_tecnico_financiero: Number(d.desfases_tecnico_financiero || 0),
      avance_operativo_promedio: av ? Math.round(av.sum / av.count) : 0,
      pendientes_revision: pendMap.get(d.entidad_id) || 0,
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
