import { supabase } from "@/integrations/supabase/client";
import { isLocalMode, lsGet, lsFilter, lsInsert, lsUpdate, lsDelete } from "./mecALocalStore";

// ─── Tipos de datos Mec A ─────────────────────────────────────────────────────

export interface MecAIniciativa {
  id: string;
  nombre: string;
  epb_nombre: string;
  epb_siglas: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto_seco_usd: number | null;
  estado: "activa" | "cerrada" | "suspendida";
  gestor_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MecAResultado {
  id: string;
  iniciativa_id: string;
  numero: string;
  nombre: string;
  indicador_nombre: string | null;
  indicador_unidad: string | null;
  indicador_meta: number | null;
  orden: number;
}

export interface MecAProducto {
  id: string;
  resultado_id: string;
  iniciativa_id: string;
  numero: string;
  nombre: string;
  orden: number;
}

export interface MecAActividad {
  id: string;
  producto_id: string;
  iniciativa_id: string;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  meta_total: number | null;
  seco_honorarios_usd: number;
  seco_viaticos_usd: number;
  seco_servicios_usd: number;
  seco_materiales_usd: number;
  cm_honorarios_usd: number;
  cm_viaticos_usd: number;
  cm_servicios_usd: number;
  cm_materiales_usd: number;
  cnm_total_usd: number;
  orden: number;
  meses_programados?: string[];
}

export interface MecAAvanceOperativo {
  id: string;
  actividad_id: string;
  iniciativa_id: string;
  anio: number;
  mes: number;
  unidades_planif: number | null;
  unidades_ejecut: number;
  logros: string | null;
  comentarios: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface MecAEntregable {
  id: string;
  actividad_id: string | null;
  iniciativa_id: string;
  consultor_nombre: string;
  consultor_dni_ruc: string | null;
  rol_responsable?: "consultor" | "equipo_interno" | "socio";
  objetivo_consultoria: string | null;
  numero_contrato: string | null;
  fecha_inicio_contrato: string | null;
  fecha_fin_contrato: string | null;
  numero_producto: string;
  descripcion_producto: string | null;
  tipo_producto?: "informe" | "producto" | "estudio" | "capacitacion" | "otro";
  presupuesto_soles: number | null;
  presupuesto_usd: number | null;
  plazo_entrega: string | null;
  fecha_recepcion: string | null;
  estado_producto: "pendiente" | "conforme" | "con_observaciones" | "rechazado";
  observaciones_tecnicas: string | null;
  medidas_correctivas: string | null;
  fecha_no_objecion: string | null;
  fecha_pago: string | null;
  monto_comprobante_soles: number | null;
  tipo_cambio: number | null;
  pago_usd: number | null;
  numero_comprobante: string | null;
  has_adjunto?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MecAContrapartidaMonetaria {
  id: string;
  actividad_id: string | null;
  iniciativa_id: string;
  tipo_recurso: "honorarios" | "viajes_viaticos" | "servicios_terceros" | "materiales";
  fecha_comprobante: string;
  nombre_proveedor: string | null;
  numero_comprobante: string | null;
  concepto: string;
  monto_soles: number;
  tipo_cambio: number | null;
  monto_usd: number | null;
  created_at: string;
}

export interface MecAContrapartidaNoMonetaria {
  id: string;
  actividad_id: string | null;
  iniciativa_id: string;
  fecha_actividad: string;
  nombre_funcionario: string;
  cargo_funcionario: string;
  concepto: string;
  unidad_medida: string;
  cantidad: number;
  costo_unitario_soles: number;
  total_soles: number | null;
  tipo_cambio: number | null;
  total_usd: number | null;
  created_at: string;
}

export interface MecAReasignacion {
  id: string;
  iniciativa_id: string;
  tipo: "entre_resultados" | "entre_productos";
  actividad_origen_id: string | null;
  actividad_destino_id: string | null;
  monto_usd: number;
  porcentaje: number | null;
  justificacion: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  comentario_claudia: string | null;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  created_at: string;
}

// ─── Funciones de lectura ──────────────────────────────────────────────────────

export async function fetchMecAIniciativas(): Promise<MecAIniciativa[]> {
  if (isLocalMode()) return lsGet("mec_a_iniciativas");
  const { data, error } = await (supabase as any)
    .from("mec_a_iniciativas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchMecAIniciativas:", error); return lsGet("mec_a_iniciativas"); }
  return data ?? [];
}

export async function fetchMecAIniciativa(id: string): Promise<MecAIniciativa | null> {
  if (isLocalMode()) return lsFilter<MecAIniciativa>("mec_a_iniciativas", r => r.id === id)[0] ?? null;
  const { data, error } = await (supabase as any)
    .from("mec_a_iniciativas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("fetchMecAIniciativa:", error); return null; }
  return data;
}

export async function fetchMecAResultados(iniciativaId: string): Promise<MecAResultado[]> {
  if (isLocalMode()) return lsFilter<MecAResultado>("mec_a_resultados", r => r.iniciativa_id === iniciativaId).sort((a,b)=>a.orden-b.orden);
  const { data, error } = await (supabase as any)
    .from("mec_a_resultados")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("orden");
  if (error) { console.error("fetchMecAResultados:", error); return []; }
  return data ?? [];
}

export async function fetchMecAProductos(iniciativaId: string): Promise<MecAProducto[]> {
  if (isLocalMode()) return lsFilter<MecAProducto>("mec_a_productos", r => r.iniciativa_id === iniciativaId).sort((a,b)=>a.orden-b.orden);
  const { data, error } = await (supabase as any)
    .from("mec_a_productos")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("orden");
  if (error) { console.error("fetchMecAProductos:", error); return []; }
  return data ?? [];
}

export async function fetchMecAActividades(iniciativaId: string): Promise<MecAActividad[]> {
  if (isLocalMode()) return lsFilter<MecAActividad>("mec_a_actividades", r => r.iniciativa_id === iniciativaId).sort((a,b)=>a.orden-b.orden);
  const { data, error } = await (supabase as any)
    .from("mec_a_actividades")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("orden");
  if (error) { console.error("fetchMecAActividades:", error); return []; }
  return data ?? [];
}

export async function fetchMecAAvanceOperativo(
  iniciativaId: string,
  anio?: number,
  mes?: number
): Promise<MecAAvanceOperativo[]> {
  if (isLocalMode()) {
    return lsFilter<MecAAvanceOperativo>("mec_a_avance_operativo", r =>
      r.iniciativa_id === iniciativaId &&
      (anio === undefined || r.anio === anio) &&
      (mes === undefined || r.mes === mes)
    );
  }
  let query = (supabase as any)
    .from("mec_a_avance_operativo")
    .select("*")
    .eq("iniciativa_id", iniciativaId);
  if (anio) query = query.eq("anio", anio);
  if (mes) query = query.eq("mes", mes);
  const { data, error } = await query.order("created_at");
  if (error) { console.error("fetchMecAAvanceOperativo:", error); return []; }
  return data ?? [];
}

export async function fetchMecAEntregables(iniciativaId: string): Promise<MecAEntregable[]> {
  if (isLocalMode()) return lsFilter<MecAEntregable>("mec_a_entregables_consultores", r => r.iniciativa_id === iniciativaId);
  const { data, error } = await (supabase as any)
    .from("mec_a_entregables_consultores")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("created_at");
  if (error) { console.error("fetchMecAEntregables:", error); return []; }
  return data ?? [];
}

export async function fetchMecAEntregablesPendientesPago(): Promise<(MecAEntregable & { mec_a_iniciativas?: any })[]> {
  if (isLocalMode()) {
    const ents = lsFilter<MecAEntregable>("mec_a_entregables_consultores",
      e => e.estado_producto === "conforme" && !e.fecha_pago);
    const inis = lsGet<MecAIniciativa>("mec_a_iniciativas");
    return ents.map(e => ({ ...e, mec_a_iniciativas: inis.find(i => i.id === e.iniciativa_id) }));
  }
  const { data, error } = await (supabase as any)
    .from("mec_a_entregables_consultores")
    .select("*, mec_a_iniciativas(nombre, epb_nombre, epb_siglas)")
    .eq("estado_producto", "conforme")
    .is("fecha_pago", null)
    .order("updated_at");
  if (error) { console.error("fetchMecAEntregablesPendientesPago:", error); return []; }
  return data ?? [];
}

export async function fetchMecAContrapartidaMonetaria(iniciativaId: string): Promise<MecAContrapartidaMonetaria[]> {
  if (isLocalMode()) return lsFilter<MecAContrapartidaMonetaria>("mec_a_contrapartida_monetaria", r => r.iniciativa_id === iniciativaId);
  const { data, error } = await (supabase as any)
    .from("mec_a_contrapartida_monetaria")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("fecha_comprobante", { ascending: false });
  if (error) { console.error("fetchMecAContrapartidaMonetaria:", error); return []; }
  return data ?? [];
}

export async function fetchMecAContrapartidaNoMonetaria(iniciativaId: string): Promise<MecAContrapartidaNoMonetaria[]> {
  if (isLocalMode()) return lsFilter<MecAContrapartidaNoMonetaria>("mec_a_contrapartida_no_monetaria", r => r.iniciativa_id === iniciativaId);
  const { data, error } = await (supabase as any)
    .from("mec_a_contrapartida_no_monetaria")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("fecha_actividad", { ascending: false });
  if (error) { console.error("fetchMecAContrapartidaNoMonetaria:", error); return []; }
  return data ?? [];
}

export async function fetchMecAReasignaciones(iniciativaId: string): Promise<MecAReasignacion[]> {
  if (isLocalMode()) return lsFilter<MecAReasignacion>("mec_a_reasignaciones", r => r.iniciativa_id === iniciativaId);
  const { data, error } = await (supabase as any)
    .from("mec_a_reasignaciones")
    .select("*")
    .eq("iniciativa_id", iniciativaId)
    .order("fecha_solicitud", { ascending: false });
  if (error) { console.error("fetchMecAReasignaciones:", error); return []; }
  return data ?? [];
}

export async function fetchMecAReasignacionesPendientes(): Promise<MecAReasignacion[]> {
  if (isLocalMode()) return lsFilter<MecAReasignacion>("mec_a_reasignaciones", r => r.estado === "pendiente");
  const { data, error } = await (supabase as any)
    .from("mec_a_reasignaciones")
    .select("*, mec_a_iniciativas(nombre, epb_siglas)")
    .eq("estado", "pendiente")
    .order("fecha_solicitud");
  if (error) { console.error("fetchMecAReasignacionesPendientes:", error); return []; }
  return data ?? [];
}

// ─── Funciones de escritura ────────────────────────────────────────────────────

export async function upsertMecAAvanceOperativo(
  payload: Omit<MecAAvanceOperativo, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  if (isLocalMode()) {
    const all = lsGet<MecAAvanceOperativo>("mec_a_avance_operativo");
    const idx = all.findIndex(r => r.actividad_id === payload.actividad_id && r.anio === payload.anio && r.mes === payload.mes);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload, updated_at: new Date().toISOString() };
      lsDelete("mec_a_avance_operativo", all[idx].id);
      lsInsert("mec_a_avance_operativo", all[idx]);
    } else {
      lsInsert("mec_a_avance_operativo", { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return { success: true };
  }
  const { error } = await (supabase as any)
    .from("mec_a_avance_operativo")
    .upsert(payload, { onConflict: "actividad_id,anio,mes" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function upsertMecAIniciativa(
  payload: Partial<MecAIniciativa> & { nombre: string; epb_nombre: string; fecha_inicio: string; fecha_fin: string },
  id?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (id) {
    const { error } = await (supabase as any)
      .from("mec_a_iniciativas")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true, id };
  } else {
    const { data, error } = await (supabase as any)
      .from("mec_a_iniciativas")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  }
}

export async function insertMecAResultado(
  payload: Omit<MecAResultado, "id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await (supabase as any)
    .from("mec_a_resultados")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

export async function insertMecAProducto(
  payload: Omit<MecAProducto, "id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await (supabase as any)
    .from("mec_a_productos")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

export async function insertMecAActividad(
  payload: Omit<MecAActividad, "id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await (supabase as any)
    .from("mec_a_actividades")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

export async function updateMecAActividad(
  id: string,
  payload: Partial<MecAActividad>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("mec_a_actividades")
    .update(payload)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function insertMecAEntregable(
  payload: Omit<MecAEntregable, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (isLocalMode()) {
    const newEnt = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as MecAEntregable;
    lsInsert("mec_a_entregables_consultores", newEnt);
    return { success: true, id: newEnt.id };
  }
  const { data, error } = await (supabase as any)
    .from("mec_a_entregables_consultores")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

export async function updateMecAEntregable(
  id: string,
  payload: Partial<MecAEntregable>
): Promise<{ success: boolean; error?: string }> {
  if (isLocalMode()) { lsUpdate<MecAEntregable>("mec_a_entregables_consultores", id, payload); return { success: true }; }
  const { error } = await (supabase as any)
    .from("mec_a_entregables_consultores")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function insertMecAContrapartidaMonetaria(
  payload: Omit<MecAContrapartidaMonetaria, "id" | "created_at">
): Promise<{ success: boolean; error?: string }> {
  // Calculate monto_usd if not provided
  const monto_usd = payload.tipo_cambio && payload.tipo_cambio > 0
    ? +(payload.monto_soles / payload.tipo_cambio).toFixed(2)
    : null;
  if (isLocalMode()) { lsInsert("mec_a_contrapartida_monetaria", { ...payload, monto_usd, id: crypto.randomUUID(), created_at: new Date().toISOString() }); return { success: true }; }
  const { error } = await (supabase as any)
    .from("mec_a_contrapartida_monetaria")
    .insert({ ...payload, monto_usd });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteMecAContrapartidaMonetaria(id: string): Promise<{ success: boolean; error?: string }> {
  if (isLocalMode()) { lsDelete("mec_a_contrapartida_monetaria", id); return { success: true }; }
  const { error } = await (supabase as any)
    .from("mec_a_contrapartida_monetaria")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function insertMecAContrapartidaNoMonetaria(
  payload: Omit<MecAContrapartidaNoMonetaria, "id" | "created_at" | "total_soles" | "total_usd">
): Promise<{ success: boolean; error?: string }> {
  const total_soles = +(payload.cantidad * payload.costo_unitario_soles).toFixed(2);
  const total_usd = payload.tipo_cambio && payload.tipo_cambio > 0
    ? +(total_soles / payload.tipo_cambio).toFixed(2)
    : null;
  if (isLocalMode()) { lsInsert("mec_a_contrapartida_no_monetaria", { ...payload, total_soles, total_usd }); return { success: true }; }
  const { error } = await (supabase as any)
    .from("mec_a_contrapartida_no_monetaria")
    .insert({ ...payload, total_soles, total_usd });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteMecAContrapartidaNoMonetaria(id: string): Promise<{ success: boolean; error?: string }> {
  if (isLocalMode()) { lsDelete("mec_a_contrapartida_no_monetaria", id); return { success: true }; }
  const { error } = await (supabase as any)
    .from("mec_a_contrapartida_no_monetaria")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function insertMecAReasignacion(
  payload: Omit<MecAReasignacion, "id" | "created_at" | "fecha_solicitud" | "estado" | "comentario_claudia" | "fecha_resolucion" | "resuelto_por">
): Promise<{ success: boolean; error?: string }> {
  if (isLocalMode()) {
    lsInsert("mec_a_reasignaciones", { ...payload, estado: "pendiente", fecha_solicitud: new Date().toISOString(), comentario_claudia: null, fecha_resolucion: null, resuelto_por: null });
    return { success: true };
  }
  const { error } = await (supabase as any)
    .from("mec_a_reasignaciones")
    .insert(payload);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resolverMecAReasignacion(
  id: string,
  estado: "aprobado" | "rechazado",
  comentario: string
): Promise<{ success: boolean; error?: string }> {
  if (isLocalMode()) {
    lsUpdate<MecAReasignacion>("mec_a_reasignaciones", id, { estado, comentario_claudia: comentario, fecha_resolucion: new Date().toISOString() });
    return { success: true };
  }
  const { error } = await (supabase as any)
    .from("mec_a_reasignaciones")
    .update({
      estado,
      comentario_claudia: comentario,
      fecha_resolucion: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Helpers de cálculo ───────────────────────────────────────────────────────

export function calcSecoTotal(act: MecAActividad): number {
  return act.seco_honorarios_usd + act.seco_viaticos_usd + act.seco_servicios_usd + act.seco_materiales_usd;
}

export function calcCMTotal(act: MecAActividad): number {
  return act.cm_honorarios_usd + act.cm_viaticos_usd + act.cm_servicios_usd + act.cm_materiales_usd;
}

export const TIPO_RECURSO_LABELS: Record<string, string> = {
  honorarios: "Honorarios",
  viajes_viaticos: "Viajes y Viáticos",
  servicios_terceros: "Servicios de Terceros",
  materiales: "Materiales",
};

export const MESES_LABELS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function isMesCierreTrimestral(mes: number): boolean {
  return [3, 6, 9, 12].includes(mes);
}
