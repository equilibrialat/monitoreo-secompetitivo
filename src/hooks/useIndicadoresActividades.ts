import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActividadIndicador {
  actividad_codigo: string;
  actividad_descripcion: string;
  producto_codigo: string | null;
  producto_descripcion: string | null;
  entidad_codigo: string;
  entidad_nombre: string | null;
  meta_total: number | null;
  unidad_medida: string | null;
  presupuesto_seco_usd: number | null;
  meses_programados: Record<string, number> | null;
  // From reportes_trimestrales
  avance_tecnico_trimestre: number | null;
  avance_tecnico_acumulado: number | null;
  ejecutado_seco_total: number | null;
  presupuesto_seco_programado: number | null;
  semaforo: "verde" | "amarillo" | "rojo" | "gris";
}

export interface ResultadoIntermedio {
  codigo: string;
  descripcion: string;
  actividades: ActividadIndicador[];
  semaforo: "verde" | "amarillo" | "rojo" | "gris";
  totalActividades: number;
  sinPlanificacion: boolean;
}

export interface FiltrosIndicadores {
  trimestre: string;
  entidad_codigo?: string | null;
  mecanismo?: string | null;
  ri_codigo?: string | null;
}

function calcSemaforoActividad(act: ActividadIndicador): "verde" | "amarillo" | "rojo" | "gris" {
  if (act.meta_total == null || act.meta_total === 0) {
    if (act.avance_tecnico_trimestre != null && act.avance_tecnico_trimestre > 0) return "verde";
    return "gris";
  }
  const pct = ((act.avance_tecnico_trimestre || 0) / act.meta_total) * 100;
  if (pct >= 66) return "verde";
  if (pct >= 33) return "amarillo";
  return "rojo";
}

function calcSemaforoRI(acts: ActividadIndicador[]): "verde" | "amarillo" | "rojo" | "gris" {
  if (acts.length === 0) return "gris";
  const semaforos = acts.map(a => a.semaforo);
  if (semaforos.includes("rojo")) return "rojo";
  if (semaforos.includes("amarillo")) return "amarillo";
  if (semaforos.every(s => s === "gris")) return "gris";
  return "verde";
}

export function useIndicadoresActividades(filtros: FiltrosIndicadores) {
  return useQuery({
    queryKey: ["indicadores-actividades", filtros],
    queryFn: async (): Promise<ResultadoIntermedio[]> => {
      // 1. Fetch planificacion_actividades
      let paQuery = (supabase as any)
        .from("planificacion_actividades")
        .select("*")
        .eq("mecanismo", "B");

      if (filtros.entidad_codigo) {
        paQuery = paQuery.eq("entidad_codigo", filtros.entidad_codigo);
      }

      const { data: paData } = await paQuery;
      const planActs: any[] = paData || [];

      // 2. Fetch reportes_trimestrales for this trimestre
      let rtQuery = (supabase as any)
        .from("reportes_trimestrales")
        .select("entidad_codigo, actividad_codigo, avance_tecnico_trimestre, avance_tecnico_acumulado, ejecutado_seco_total, presupuesto_seco_programado")
        .eq("trimestre", filtros.trimestre);

      if (filtros.entidad_codigo) {
        rtQuery = rtQuery.eq("entidad_codigo", filtros.entidad_codigo);
      }

      const { data: rtData } = await rtQuery;
      const reportes: any[] = rtData || [];

      // Build reporte lookup
      const reporteMap = new Map<string, any>();
      for (const r of reportes) {
        reporteMap.set(`${r.entidad_codigo}::${r.actividad_codigo}`, r);
      }

      // 3. Group planificacion_actividades by resultado_intermedio_codigo
      const riMap = new Map<string, { descripcion: string; actividades: ActividadIndicador[] }>();

      for (const pa of planActs) {
        const riCode = pa.resultado_intermedio_codigo || "SIN_RI";
        const riDesc = pa.resultado_intermedio_descripcion || "Sin resultado intermedio asignado";

        if (!riMap.has(riCode)) {
          riMap.set(riCode, { descripcion: riDesc, actividades: [] });
        }

        const reporte = reporteMap.get(`${pa.entidad_codigo}::${pa.actividad_codigo}`);

        const act: ActividadIndicador = {
          actividad_codigo: pa.actividad_codigo,
          actividad_descripcion: pa.actividad_descripcion || pa.actividad_codigo,
          producto_codigo: pa.producto_codigo,
          producto_descripcion: pa.producto_descripcion,
          entidad_codigo: pa.entidad_codigo,
          entidad_nombre: pa.entidad_nombre,
          meta_total: pa.meta_total,
          unidad_medida: pa.unidad_medida,
          presupuesto_seco_usd: pa.presupuesto_seco_usd,
          meses_programados: pa.meses_programados,
          avance_tecnico_trimestre: reporte?.avance_tecnico_trimestre ?? null,
          avance_tecnico_acumulado: reporte?.avance_tecnico_acumulado ?? null,
          ejecutado_seco_total: reporte?.ejecutado_seco_total ?? null,
          presupuesto_seco_programado: reporte?.presupuesto_seco_programado ?? null,
          semaforo: "gris",
        };
        act.semaforo = calcSemaforoActividad(act);
        riMap.get(riCode)!.actividades.push(act);
      }

      // 4. If no planificacion data but we have reportes, build from reportes
      if (planActs.length === 0 && reportes.length > 0) {
        const riFromReportes = new Map<string, ActividadIndicador[]>();
        for (const r of reportes) {
          // Group by actividad prefix (first char after 'A' determines RI roughly)
          const riCode = `RT_${r.entidad_codigo}`;
          if (!riFromReportes.has(riCode)) riFromReportes.set(riCode, []);
          const act: ActividadIndicador = {
            actividad_codigo: r.actividad_codigo,
            actividad_descripcion: r.actividad_codigo,
            producto_codigo: null,
            producto_descripcion: null,
            entidad_codigo: r.entidad_codigo,
            entidad_nombre: r.entidad_codigo,
            meta_total: null,
            unidad_medida: null,
            presupuesto_seco_usd: r.presupuesto_seco_programado,
            meses_programados: null,
            avance_tecnico_trimestre: r.avance_tecnico_trimestre,
            avance_tecnico_acumulado: r.avance_tecnico_acumulado,
            ejecutado_seco_total: r.ejecutado_seco_total,
            presupuesto_seco_programado: r.presupuesto_seco_programado,
            semaforo: "gris",
          };
          act.semaforo = calcSemaforoActividad(act);
          riFromReportes.get(riCode)!.push(act);
        }

        for (const [code, acts] of riFromReportes) {
          riMap.set(code, {
            descripcion: `Actividades de ${code.replace("RT_", "")}`,
            actividades: acts,
          });
        }
      }

      // 5. Build final array
      const result: ResultadoIntermedio[] = [];
      for (const [codigo, { descripcion, actividades }] of riMap) {
        if (filtros.ri_codigo && filtros.ri_codigo !== codigo) continue;
        result.push({
          codigo,
          descripcion,
          actividades,
          semaforo: calcSemaforoRI(actividades),
          totalActividades: actividades.length,
          sinPlanificacion: planActs.length === 0,
        });
      }

      // Sort: rojo first, then amarillo, then verde, then gris
      const semOrder = { rojo: 0, amarillo: 1, verde: 2, gris: 3 };
      result.sort((a, b) => semOrder[a.semaforo] - semOrder[b.semaforo]);

      return result;
    },
    staleTime: 60_000,
  });
}

export function useEntidadesDisponibles() {
  return useQuery({
    queryKey: ["entidades-disponibles-indicadores"],
    queryFn: async () => {
      const [paResult, rtResult] = await Promise.all([
        (supabase as any).from("planificacion_actividades").select("entidad_codigo, entidad_nombre, mecanismo").eq("mecanismo", "B"),
        (supabase as any).from("reportes_trimestrales").select("entidad_codigo, trimestre"),
      ]);
      const pa: any[] = paResult.data || [];
      const rt: any[] = rtResult.data || [];

      const entidades = new Map<string, { codigo: string; nombre: string }>();
      for (const p of pa) {
        if (!entidades.has(p.entidad_codigo)) {
          entidades.set(p.entidad_codigo, { codigo: p.entidad_codigo, nombre: p.entidad_nombre || p.entidad_codigo });
        }
      }
      for (const r of rt) {
        if (!entidades.has(r.entidad_codigo)) {
          entidades.set(r.entidad_codigo, { codigo: r.entidad_codigo, nombre: r.entidad_codigo });
        }
      }

      const trimestres = Array.from(new Set(rt.map((r: any) => String(r.trimestre)))).sort();

      return {
        entidades: Array.from(entidades.values()),
        trimestres,
      };
    },
    staleTime: 120_000,
  });
}
