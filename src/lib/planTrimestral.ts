import { supabase } from "@/integrations/supabase/client";
import { sendNotificacion } from "@/lib/notificaciones";

export interface PlanTrimestral {
  id: string;
  entidad_id: string;
  actividad_id: string;
  trimestre: number;
  anio: number;
  meta_mes_1: number;
  meta_mes_2: number;
  meta_mes_3: number;
  ejecutado_mes_1: number;
  ejecutado_mes_2: number;
  ejecutado_mes_3: number;
  meta_trimestral: number;
  estado: PlanEstado;
  comentario_coordinador: string | null;
  comentario_entidad: string | null;
  solicitudes_ajuste: AjusteRequest[];
  propuesto_por: string | null;
  aprobado_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PlanEstado = "borrador" | "propuesta_coordinador" | "en_disputa" | "aprobada";

export interface AjusteRequest {
  month: number; // 1, 2, or 3
  new_value: number;
  justification: string;
  status: "pendiente" | "aprobado" | "rechazado";
  response_comment?: string;
  created_at?: string;
}

/** Trimester month names */
export function getTrimesterMonths(trimestre: number): string[] {
  const MONTHS = [
    ["Enero", "Febrero", "Marzo"],
    ["Abril", "Mayo", "Junio"],
    ["Julio", "Agosto", "Septiembre"],
    ["Octubre", "Noviembre", "Diciembre"],
  ];
  return MONTHS[trimestre - 1] || [];
}

/** Get trimester number from a month (1-12) */
export function getTrimesterFromMonth(month: number): number {
  return Math.ceil(month / 3);
}

/** Get actual month numbers for a trimester */
export function getTrimesterMonthNumbers(trimestre: number): [number, number, number] {
  const start = (trimestre - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

/**
 * Fetch all plans for an entity in a given trimester
 */
export async function fetchPlanTrimestral(
  entidadId: string,
  trimestre: number,
  anio: number
): Promise<PlanTrimestral[]> {
  const { data, error } = await (supabase as any)
    .from("plan_trimestral")
    .select("*")
    .eq("entidad_id", entidadId)
    .eq("trimestre", trimestre)
    .eq("anio", anio);
  if (error) {
    console.error("Error fetching plan trimestral:", error);
    return [];
  }
  return (data ?? []).map(normalizePlan);
}

/**
 * Fetch plan for a specific activity
 */
export async function fetchPlanActividad(
  actividadId: string,
  trimestre: number,
  anio: number
): Promise<PlanTrimestral | null> {
  const { data, error } = await (supabase as any)
    .from("plan_trimestral")
    .select("*")
    .eq("actividad_id", actividadId)
    .eq("trimestre", trimestre)
    .eq("anio", anio)
    .maybeSingle();
  if (error) return null;
  return data ? normalizePlan(data) : null;
}

/**
 * Save draft plan (coordinator action)
 */
export async function guardarBorradorPlan(
  plans: Array<{
    entidad_id: string;
    actividad_id: string;
    trimestre: number;
    anio: number;
    meta_mes_1: number;
    meta_mes_2: number;
    meta_mes_3: number;
    meta_trimestral: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const rows = plans.map((p) => ({
    ...p,
    estado: "borrador",
    updated_at: new Date().toISOString(),
  }));
  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .upsert(rows, { onConflict: "entidad_id,actividad_id,trimestre,anio" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Send plan proposal to entity (coordinator action)
 */
export async function enviarPropuestaPlan(
  entidadId: string,
  trimestre: number,
  anio: number,
  entidadNombre: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .update({
      estado: "propuesta_coordinador",
      updated_at: new Date().toISOString(),
    })
    .eq("entidad_id", entidadId)
    .eq("trimestre", trimestre)
    .eq("anio", anio);
  if (error) return { success: false, error: error.message };

  const months = getTrimesterMonths(trimestre);
  await sendNotificacion({
    tipo: "plan_trimestral_propuesto",
    asunto: `Plan trimestral T${trimestre} ${anio} propuesto`,
    mensaje: `El coordinador regional ha propuesto el plan trimestral (${months.join("/")} ${anio}) para ${entidadNombre}. Revisa y acepta o comenta.`,
    destinatarios: { roles: ["entidad_mec_b"] },
    entidad_destino_id: entidadId,
  });

  return { success: true };
}

/**
 * Entity accepts plan (all activities → aprobada)
 */
export async function aceptarPlan(
  entidadId: string,
  trimestre: number,
  anio: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .update({
      estado: "aprobada",
      aprobado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("entidad_id", entidadId)
    .eq("trimestre", trimestre)
    .eq("anio", anio)
    .eq("estado", "propuesta_coordinador");
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Entity disputes plan with comment
 */
export async function disputarPlan(
  entidadId: string,
  trimestre: number,
  anio: number,
  comentario: string,
  entidadNombre: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .update({
      estado: "en_disputa",
      comentario_entidad: comentario,
      updated_at: new Date().toISOString(),
    })
    .eq("entidad_id", entidadId)
    .eq("trimestre", trimestre)
    .eq("anio", anio);
  if (error) return { success: false, error: error.message };

  await sendNotificacion({
    tipo: "plan_trimestral_disputado",
    asunto: `Plan trimestral disputado: ${entidadNombre}`,
    mensaje: `La entidad ${entidadNombre} ha comentado sobre el plan T${trimestre} ${anio}: "${comentario}"`,
    destinatarios: { roles: ["coordinador_regional"] },
    entidad_destino_id: entidadId,
  });

  return { success: true };
}

/**
 * Coordinator resolves dispute (final submission → aprobada)
 */
export async function resolverDisputa(
  entidadId: string,
  trimestre: number,
  anio: number,
  comentarioCoordinador: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .update({
      estado: "aprobada",
      comentario_coordinador: comentarioCoordinador,
      aprobado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("entidad_id", entidadId)
    .eq("trimestre", trimestre)
    .eq("anio", anio);
  if (error) return { success: false, error: error.message };

  await sendNotificacion({
    tipo: "plan_trimestral_aprobado",
    asunto: `Plan trimestral T${trimestre} ${anio} aprobado`,
    mensaje: `El coordinador ha aprobado el plan trimestral. ${comentarioCoordinador ? `Comentario: "${comentarioCoordinador}"` : "Ya puedes registrar avances."}`,
    destinatarios: { roles: ["entidad_mec_b"] },
    entidad_destino_id: entidadId,
  });

  return { success: true };
}

/**
 * Entity requests mid-trimester adjustment
 */
export async function solicitarAjuste(
  planId: string,
  ajuste: Omit<AjusteRequest, "status">
): Promise<{ success: boolean; error?: string }> {
  // Fetch current plan
  const { data, error: fetchErr } = await (supabase as any)
    .from("plan_trimestral")
    .select("solicitudes_ajuste")
    .eq("id", planId)
    .single();
  if (fetchErr) return { success: false, error: fetchErr.message };

  const existing: AjusteRequest[] = data?.solicitudes_ajuste || [];
  existing.push({
    ...ajuste,
    status: "pendiente",
    created_at: new Date().toISOString(),
  });

  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .update({
      solicitudes_ajuste: existing,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Coordinator approves/rejects adjustment request
 */
export async function resolverAjuste(
  planId: string,
  ajusteIndex: number,
  approved: boolean,
  responseComment: string,
  newMetaField?: "meta_mes_1" | "meta_mes_2" | "meta_mes_3",
  newValue?: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error: fetchErr } = await (supabase as any)
    .from("plan_trimestral")
    .select("solicitudes_ajuste")
    .eq("id", planId)
    .single();
  if (fetchErr) return { success: false, error: fetchErr.message };

  const existing: AjusteRequest[] = data?.solicitudes_ajuste || [];
  if (existing[ajusteIndex]) {
    existing[ajusteIndex].status = approved ? "aprobado" : "rechazado";
    existing[ajusteIndex].response_comment = responseComment;
  }

  const updatePayload: any = {
    solicitudes_ajuste: existing,
    updated_at: new Date().toISOString(),
  };
  if (approved && newMetaField && newValue != null) {
    updatePayload[newMetaField] = newValue;
  }

  const { error } = await (supabase as any)
    .from("plan_trimestral")
    .update(updatePayload)
    .eq("id", planId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Fetch all plans for an entity (all trimesters) for dashboard
 */
export async function fetchAllPlansEntidad(
  entidadId: string
): Promise<PlanTrimestral[]> {
  const { data, error } = await (supabase as any)
    .from("plan_trimestral")
    .select("*")
    .eq("entidad_id", entidadId)
    .order("anio", { ascending: false })
    .order("trimestre", { ascending: false });
  if (error) return [];
  return (data ?? []).map(normalizePlan);
}

function normalizePlan(d: any): PlanTrimestral {
  return {
    ...d,
    meta_mes_1: Number(d.meta_mes_1 || 0),
    meta_mes_2: Number(d.meta_mes_2 || 0),
    meta_mes_3: Number(d.meta_mes_3 || 0),
    ejecutado_mes_1: Number(d.ejecutado_mes_1 || 0),
    ejecutado_mes_2: Number(d.ejecutado_mes_2 || 0),
    ejecutado_mes_3: Number(d.ejecutado_mes_3 || 0),
    meta_trimestral: Number(d.meta_trimestral || 0),
    solicitudes_ajuste: d.solicitudes_ajuste || [],
  };
}
