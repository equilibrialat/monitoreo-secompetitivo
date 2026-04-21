import { supabase } from "@/integrations/supabase/client";

export interface Notificacion {
  id: string;
  remitente_id: string | null;
  tipo: string;
  asunto: string;
  mensaje: string;
  destinatarios: any;
  entidad_destino_id: string | null;
  destinatario_rol: string | null;
  leido: boolean;
  created_at: string;
}

export async function fetchNotificaciones(): Promise<Notificacion[]> {
  const { data, error } = await (supabase as any)
    .from("notificaciones")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function fetchNotificacionesForEntidad(entidadId: string): Promise<Notificacion[]> {
  const { data, error } = await (supabase as any)
    .from("notificaciones")
    .select("*")
    .or(`entidad_destino_id.eq.${entidadId},entidad_destino_id.is.null`)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function countUnread(entidadId: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .or(`entidad_destino_id.eq.${entidadId},entidad_destino_id.is.null`)
    .eq("leido", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  await (supabase as any)
    .from("notificaciones")
    .update({ leido: true })
    .eq("id", id);
}

export async function sendNotificacion(notif: {
  tipo: string;
  asunto: string;
  mensaje: string;
  destinatarios: any;
  entidad_destino_id?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("notificaciones")
    .insert({
      ...notif,
      entidad_destino_id: notif.entidad_destino_id ?? null,
    });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function sendBulkNotificaciones(notifs: {
  tipo: string;
  asunto: string;
  mensaje: string;
  destinatarios: any;
  entidad_destino_id: string | null;
}[]): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("notificaciones")
    .insert(notifs);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Funciones por rol (Mec A) ────────────────────────────────────────────────

export async function fetchNotificacionesForRol(rol: string): Promise<Notificacion[]> {
  const { data, error } = await (supabase as any)
    .from("notificaciones")
    .select("*")
    .eq("destinatario_rol", rol)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function countUnreadForRol(rol: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("destinatario_rol", rol)
    .eq("leido", false);
  if (error) return 0;
  return count ?? 0;
}

export async function sendNotificacionMecA(notif: {
  tipo: string;
  asunto: string;
  mensaje: string;
  destinatario_rol: string;
  entidad_destino_id?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("notificaciones")
    .insert({
      tipo: notif.tipo,
      asunto: notif.asunto,
      mensaje: notif.mensaje,
      destinatarios: { rol: notif.destinatario_rol },
      destinatario_rol: notif.destinatario_rol,
      entidad_destino_id: notif.entidad_destino_id ?? null,
      leido: false,
    });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
