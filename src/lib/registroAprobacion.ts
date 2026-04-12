import { supabase } from "@/integrations/supabase/client";

export interface RegistroPendiente {
  id: string;
  actividad_id: string;
  entidad_id: string;
  anio: number;
  mes: number;
  avance_valor: number | null;
  estado: string | null;
  estado_registro: string | null;
  descripcion_avance: string | null;
  limitaciones: string | null;
  prioridades_proximo_mes: string | null;
  observaciones_revision: string | null;
  entidad_nombre?: string;
  actividad_codigo?: string;
  actividad_nombre?: string;
  mecanismo?: string;
  region?: string;
}

export interface HistorialEntry {
  id: string;
  accion: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  observaciones: string | null;
  nombre_usuario: string | null;
  created_at: string | null;
}

export async function fetchRegistrosPorEstado(estadoRegistro: string): Promise<RegistroPendiente[]> {
  const { data, error } = await (supabase as any)
    .from("registros_mensuales")
    .select(`
      id, actividad_id, entidad_id, anio, mes, avance_valor, estado,
      estado_registro, descripcion_avance, observaciones_revision,
      actividades!inner ( codigo, nombre ),
      entidades!inner ( nombre_corto, mecanismo, region )
    `)
    .eq("estado_registro", estadoRegistro)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });

  if (error) {
    console.error("Error fetching registros:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    actividad_id: r.actividad_id,
    entidad_id: r.entidad_id,
    anio: r.anio,
    mes: r.mes,
    avance_valor: r.avance_valor,
    estado: r.estado,
    estado_registro: r.estado_registro,
    descripcion_avance: r.descripcion_avance,
    observaciones_revision: r.observaciones_revision,
    entidad_nombre: r.entidades?.nombre_corto ?? "",
    actividad_codigo: r.actividades?.codigo ?? "",
    actividad_nombre: r.actividades?.nombre ?? "",
    mecanismo: r.entidades?.mecanismo ?? "",
    region: r.entidades?.region ?? "",
  }));
}

export async function fetchHistorialRegistro(registroId: string): Promise<HistorialEntry[]> {
  const { data, error } = await (supabase as any)
    .from("historial_cambios")
    .select("id, accion, campo, valor_anterior, valor_nuevo, observaciones, nombre_usuario, created_at")
    .eq("tabla", "registros_mensuales")
    .eq("registro_id", registroId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching historial:", error);
    return [];
  }
  return data || [];
}

export async function cambiarEstadoRegistro(
  registroId: string,
  nuevoEstado: string,
  observaciones?: string,
  nombreUsuario?: string,
  estadoAnterior?: string
): Promise<{ success: boolean; error?: string }> {
  const updateData: any = { estado_registro: nuevoEstado };
  if (observaciones !== undefined) {
    updateData.observaciones_revision = observaciones;
  }
  if (nuevoEstado === "aprobado" || nuevoEstado.startsWith("en_revision")) {
    updateData.fecha_revision = new Date().toISOString();
  }

  const { error } = await (supabase as any)
    .from("registros_mensuales")
    .update(updateData)
    .eq("id", registroId);

  if (error) {
    console.error("Error updating estado:", error);
    return { success: false, error: error.message };
  }

  const accion = nuevoEstado === "observado" ? "observar" : "aprobar";

  await (supabase as any).from("historial_cambios").insert({
    tabla: "registros_mensuales",
    registro_id: registroId,
    accion,
    campo: "estado_registro",
    valor_anterior: estadoAnterior || null,
    valor_nuevo: nuevoEstado,
    observaciones: observaciones || null,
    nombre_usuario: nombreUsuario || null,
  });

  return { success: true };
}

export async function agregarComentario(
  registroId: string,
  comentario: string,
  nombreUsuario?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any).from("historial_cambios").insert({
    tabla: "registros_mensuales",
    registro_id: registroId,
    accion: "comentar",
    campo: "estado_registro",
    observaciones: comentario,
    nombre_usuario: nombreUsuario || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchRegistrosEntidad(entidadId: string): Promise<RegistroPendiente[]> {
  const { data, error } = await (supabase as any)
    .from("registros_mensuales")
    .select(`
      id, actividad_id, entidad_id, anio, mes, avance_valor, estado,
      estado_registro, descripcion_avance, observaciones_revision,
      actividades!inner ( codigo, nombre )
    `)
    .eq("entidad_id", entidadId)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });

  if (error) return [];

  return (data || []).map((r: any) => ({
    id: r.id,
    actividad_id: r.actividad_id,
    entidad_id: r.entidad_id,
    anio: r.anio,
    mes: r.mes,
    avance_valor: r.avance_valor,
    estado: r.estado,
    estado_registro: r.estado_registro,
    descripcion_avance: r.descripcion_avance,
    observaciones_revision: r.observaciones_revision,
    actividad_codigo: r.actividades?.codigo ?? "",
    actividad_nombre: r.actividades?.nombre ?? "",
  }));
}
