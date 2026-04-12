import { supabase } from "@/integrations/supabase/client";
import { sendNotificacion } from "@/lib/notificaciones";

export interface MetaMensual {
  id: string;
  actividad_id: string;
  entidad_id: string;
  anio: number;
  mes: number;
  meta_valor: number | null;
  meta_unidad_medida: string | null;
  estado: string; // sin_meta | pendiente_aprobacion | aprobada | rechazada
  comentario_coordinador: string | null;
  propuesta_por: string | null;
  revisado_por: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type MetaEstado = "sin_meta" | "pendiente_aprobacion" | "aprobada" | "rechazada";

/**
 * Fetch all metas for a given entity and period
 */
export async function fetchMetasMensuales(
  entidadId: string,
  anio: number,
  mes: number
): Promise<MetaMensual[]> {
  const { data, error } = await (supabase as any)
    .from("metas_mensuales")
    .select("*")
    .eq("entidad_id", entidadId)
    .eq("anio", anio)
    .eq("mes", mes);
  if (error) {
    console.error("Error fetching metas:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch meta for a specific activity and period
 */
export async function fetchMetaActividad(
  actividadId: string,
  anio: number,
  mes: number
): Promise<MetaMensual | null> {
  const { data, error } = await (supabase as any)
    .from("metas_mensuales")
    .select("*")
    .eq("actividad_id", actividadId)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  if (error) {
    console.error("Error fetching meta:", error);
    return null;
  }
  return data;
}

/**
 * Propose a monthly target (entity user action)
 */
export async function proponerMeta(params: {
  actividad_id: string;
  entidad_id: string;
  anio: number;
  mes: number;
  meta_valor: number;
  meta_unidad_medida?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("metas_mensuales")
    .upsert(
      {
        actividad_id: params.actividad_id,
        entidad_id: params.entidad_id,
        anio: params.anio,
        mes: params.mes,
        meta_valor: params.meta_valor,
        meta_unidad_medida: params.meta_unidad_medida || null,
        estado: "pendiente_aprobacion",
        comentario_coordinador: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "actividad_id,anio,mes" }
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Coordinator approves a meta
 */
export async function aprobarMeta(
  metaId: string,
  actividadNombre: string,
  mes: number,
  anio: number,
  entidadDestinoId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("metas_mensuales")
    .update({
      estado: "aprobada",
      comentario_coordinador: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", metaId);
  if (error) return { success: false, error: error.message };

  // Notify entity
  const mesNombre = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][mes - 1];
  await sendNotificacion({
    tipo: "meta_aprobada",
    asunto: `Meta aprobada: ${actividadNombre}`,
    mensaje: `Tu meta para "${actividadNombre}" en ${mesNombre} ${anio} fue aprobada. Ya puedes registrar avance.`,
    destinatarios: { roles: ["entidad_mec_b"] },
    entidad_destino_id: entidadDestinoId,
  });

  return { success: true };
}

/**
 * Coordinator rejects a meta with a comment
 */
export async function rechazarMeta(
  metaId: string,
  comentario: string,
  actividadNombre: string,
  mes: number,
  anio: number,
  entidadDestinoId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("metas_mensuales")
    .update({
      estado: "rechazada",
      comentario_coordinador: comentario,
      updated_at: new Date().toISOString(),
    })
    .eq("id", metaId);
  if (error) return { success: false, error: error.message };

  const mesNombre = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][mes - 1];
  await sendNotificacion({
    tipo: "meta_rechazada",
    asunto: `Meta rechazada: ${actividadNombre}`,
    mensaje: `Tu meta para "${actividadNombre}" en ${mesNombre} ${anio} fue rechazada. Comentario: "${comentario}"`,
    destinatarios: { roles: ["entidad_mec_b"] },
    entidad_destino_id: entidadDestinoId,
  });

  return { success: true };
}

/**
 * Fetch all metas for an entity (all periods) - for dashboard views
 */
export async function fetchAllMetasEntidad(
  entidadId: string
): Promise<MetaMensual[]> {
  const { data, error } = await (supabase as any)
    .from("metas_mensuales")
    .select("*")
    .eq("entidad_id", entidadId)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  if (error) return [];
  return data ?? [];
}
