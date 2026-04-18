import { supabase } from "@/integrations/supabase/client";

export type EstadoReasignacion =
  | "pendiente_coordinador"
  | "pendiente_ivan"
  | "aprobada"
  | "rechazada";

export type TipoReasignacion = "productos_mismo_resultado" | "entre_resultados";
export type AlertaNivel = "info" | "warning";

export interface ReasignacionPresupuestal {
  id: string;
  entidad_codigo: string;
  mecanismo: string;
  actividad_origen_codigo: string;
  actividad_destino_codigo: string;
  monto_usd: number;
  tipo_reasignacion: TipoReasignacion;
  pct_variacion: number | null;
  alerta_nivel: AlertaNivel | null;
  alerta_mensaje: string | null;
  justificacion: string;
  estado: EstadoReasignacion;
  solicitado_por: string | null;
  fecha_solicitud: string;
  comentario_coordinador: string | null;
  coordinador_nombre: string | null;
  fecha_coordinador: string | null;
  comentario_ivan: string | null;
  ivan_nombre: string | null;
  fecha_aprobacion: string | null;
  numero_reasignacion: number | null;
  created_at: string;
  updated_at: string;
}

/** Calcula el mensaje de alerta según mecanismo, tipo y % de variación. */
export function calcularAlerta(
  mecanismo: string,
  tipo: TipoReasignacion,
  pctVariacion: number,
): { nivel: AlertaNivel; mensaje: string } {
  const mec = (mecanismo || "").toUpperCase();
  const isMecB = mec === "B" || mec === "MEC_B";

  if (tipo === "entre_resultados") {
    if (pctVariacion > 10) {
      return {
        nivel: "warning",
        mensaje: isMecB
          ? "⚠️ Este ajuste supera el 10% entre resultados. Requerirá gestión de no-objeción ante SECO."
          : "⚠️ Supera el 10% entre resultados. EPB solicita aprobación del FN + no-objeción SECO.",
      };
    }
    return {
      nivel: "info",
      mensaje: isMecB
        ? "ℹ️ Ajuste menor al 10% entre resultados. El FN tomará conocimiento."
        : "ℹ️ EPB comunicará por escrito al FN.",
    };
  }

  // productos_mismo_resultado
  if (pctVariacion > 20) {
    return {
      nivel: "warning",
      mensaje: isMecB
        ? "⚠️ Supera el 20% entre productos. Requerirá no-objeción SECO."
        : "⚠️ Supera el 20% entre productos. Requiere no-objeción SECO.",
    };
  }
  if (pctVariacion > 10) {
    return {
      nivel: "info",
      mensaje: isMecB
        ? "ℹ️ Supera el 10% entre productos. El FN evaluará y aprobará."
        : "ℹ️ Supera el 10% entre productos. FN evalúa y aprueba.",
    };
  }
  return {
    nivel: "info",
    mensaje: isMecB
      ? "ℹ️ Ajuste menor al 10% entre productos. El FN tomará conocimiento."
      : "ℹ️ FN toma conocimiento.",
  };
}

/**
 * Calcula el presupuesto vigente y la lista de reasignaciones aprobadas
 * que afectan a una actividad. El monto se suma a destino y resta a origen.
 */
export interface ReasignacionAplicada {
  id: string;
  numero: number;
  monto_delta: number; // positivo si entra, negativo si sale
  fecha: string;
  contraparte_codigo: string; // la otra actividad
}

export function calcularEfectoPorActividad(
  reasignacionesAprobadas: ReasignacionPresupuestal[],
): Map<string, ReasignacionAplicada[]> {
  const map = new Map<string, ReasignacionAplicada[]>();
  // Numerar secuencialmente por actividad (origen y destino comparten numeración global por actividad)
  const sorted = [...reasignacionesAprobadas].sort((a, b) => {
    const da = a.fecha_aprobacion || a.fecha_solicitud;
    const db = b.fecha_aprobacion || b.fecha_solicitud;
    return da.localeCompare(db);
  });

  for (const r of sorted) {
    const fecha = r.fecha_aprobacion || r.fecha_solicitud;
    // Origen pierde monto
    if (!map.has(r.actividad_origen_codigo)) map.set(r.actividad_origen_codigo, []);
    const listOrig = map.get(r.actividad_origen_codigo)!;
    listOrig.push({
      id: r.id,
      numero: listOrig.length + 1,
      monto_delta: -Number(r.monto_usd),
      fecha,
      contraparte_codigo: r.actividad_destino_codigo,
    });
    // Destino gana monto
    if (!map.has(r.actividad_destino_codigo)) map.set(r.actividad_destino_codigo, []);
    const listDest = map.get(r.actividad_destino_codigo)!;
    listDest.push({
      id: r.id,
      numero: listDest.length + 1,
      monto_delta: Number(r.monto_usd),
      fecha,
      contraparte_codigo: r.actividad_origen_codigo,
    });
  }
  return map;
}

/** Devuelve el presupuesto vigente sumando los deltas de reasignaciones aprobadas. */
export function presupuestoVigente(original: number, ajustes: ReasignacionAplicada[] | undefined): number {
  if (!ajustes || ajustes.length === 0) return original;
  return ajustes.reduce((acc, a) => acc + a.monto_delta, original);
}

export async function fetchReasignacionesEntidad(entidadCodigo: string) {
  const { data, error } = await (supabase as any)
    .from("reasignaciones_presupuestales")
    .select("*")
    .eq("entidad_codigo", entidadCodigo)
    .order("fecha_solicitud", { ascending: false });
  if (error) throw error;
  return (data as ReasignacionPresupuestal[]) || [];
}

export async function fetchReasignacionesPorEstado(estados: EstadoReasignacion[]) {
  const { data, error } = await (supabase as any)
    .from("reasignaciones_presupuestales")
    .select("*")
    .in("estado", estados)
    .order("fecha_solicitud", { ascending: false });
  if (error) throw error;
  return (data as ReasignacionPresupuestal[]) || [];
}

export const ESTADO_LABELS: Record<EstadoReasignacion, string> = {
  pendiente_coordinador: "Pendiente Coordinador Regional",
  pendiente_ivan: "Pendiente Coordinador de Cadenas de Valor",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

/** Color/variant por estado para Badges. */
export const ESTADO_VARIANT: Record<EstadoReasignacion, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente_coordinador: "outline",
  pendiente_ivan: "secondary",
  aprobada: "default",
  rechazada: "destructive",
};
