import { supabase } from "@/integrations/supabase/client";
import type { ContextualData } from "@/types/registroMensual";
import { format } from "date-fns";
export interface ActividadDB {
  id: string;
  codigo: string;
  nombre: string;
  meta_valor: number;
  meta_unidad_medida: string;
  presupuesto_seco: number;
  presupuesto_contrapartida_monetaria: number;
  presupuesto_contrapartida_no_monetaria: number;
  ejecutado_seco_acum: number;
  ejecutado_cm_acum: number;
  ejecutado_cnm_acum: number;
  avance_operativo_pct: number;
  estado_actual: string;
  tags: string[] | null;
  indicadores_vinculados: string[] | null;
  producto_id: string;
  entidad_id: string;
  producto_codigo: string;
  producto_nombre: string;
  resultado_codigo: string;
  resultado_nombre: string;
}

export interface TreeNode {
  label: string;
  children?: TreeNode[];
  actividad?: ActividadDB;
}

export async function fetchActividadesByEntidad(entidadId: string): Promise<ActividadDB[]> {
  const { data, error } = await (supabase as any)
    .from("actividades")
    .select(`
      id, codigo, nombre, meta_valor, meta_unidad_medida,
      presupuesto_seco, presupuesto_contrapartida_monetaria, presupuesto_contrapartida_no_monetaria,
      ejecutado_seco_acum, ejecutado_cm_acum, ejecutado_cnm_acum,
      avance_operativo_pct, estado_actual, tags, indicadores_vinculados,
      producto_id, entidad_id,
      productos!inner (
        codigo, nombre,
        resultados!inner (
          codigo, nombre
        )
      )
    `)
    .eq("entidad_id", entidadId)
    .order("codigo");

  if (error) {
    console.error("Error fetching actividades:", error);
    return [];
  }

  // Flatten the joined data
  return (data || []).map((row: any) => ({
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    meta_valor: row.meta_valor ?? 0,
    meta_unidad_medida: row.meta_unidad_medida ?? "",
    presupuesto_seco: row.presupuesto_seco ?? 0,
    presupuesto_contrapartida_monetaria: row.presupuesto_contrapartida_monetaria ?? 0,
    presupuesto_contrapartida_no_monetaria: row.presupuesto_contrapartida_no_monetaria ?? 0,
    ejecutado_seco_acum: row.ejecutado_seco_acum ?? 0,
    ejecutado_cm_acum: row.ejecutado_cm_acum ?? 0,
    ejecutado_cnm_acum: row.ejecutado_cnm_acum ?? 0,
    avance_operativo_pct: row.avance_operativo_pct ?? 0,
    estado_actual: row.estado_actual ?? "pendiente",
    tags: row.tags ?? [],
    indicadores_vinculados: row.indicadores_vinculados ?? [],
    producto_id: row.producto_id,
    entidad_id: row.entidad_id,
    producto_codigo: row.productos?.codigo ?? "",
    producto_nombre: row.productos?.nombre ?? "",
    resultado_codigo: row.productos?.resultados?.codigo ?? "",
    resultado_nombre: row.productos?.resultados?.nombre ?? "",
  }));
}

export function buildActivityTree(actividades: ActividadDB[]): TreeNode[] {
  const resultadoMap = new Map<string, Map<string, ActividadDB[]>>();

  for (const act of actividades) {
    const resKey = `${act.resultado_codigo} - ${act.resultado_nombre}`;
    const prodKey = `${act.producto_codigo} - ${act.producto_nombre}`;

    if (!resultadoMap.has(resKey)) resultadoMap.set(resKey, new Map());
    const prodMap = resultadoMap.get(resKey)!;
    if (!prodMap.has(prodKey)) prodMap.set(prodKey, []);
    prodMap.get(prodKey)!.push(act);
  }

  const tree: TreeNode[] = [];
  for (const [resultado, productoMap] of resultadoMap) {
    const productoNodes: TreeNode[] = [];
    for (const [producto, acts] of productoMap) {
      productoNodes.push({
        label: producto,
        children: acts.map((a) => ({ label: a.codigo, actividad: a })),
      });
    }
    tree.push({ label: resultado, children: productoNodes });
  }
  return tree;
}

// --- Save operations ---

export interface RegistroMensualInsert {
  actividad_id: string;
  entidad_id: string;
  anio: number;
  mes: number;
  avance_valor: number;
  estado: string;
  descripcion_avance: string;
  estado_registro: string;
  limitaciones?: string;
  prioridades_proximo_mes?: string;
  compromisos?: string;
}

export interface EjecucionFinancieraInsert {
  registro_mensual_id: string;
  actividad_id: string;
  fuente: string; // 'cofinanciamiento_seco' | 'contrapartida_monetaria' | 'contrapartida_no_monetaria'
  monto: number;
  tipo_gasto: string;
  fecha_gasto: string;
}

export interface RegistroMensualExistente {
  id: string;
  avance_valor: number | null;
  estado: string | null;
  descripcion_avance: string | null;
  fecha_ejecucion: string | null;
  estado_registro: string | null;
  observaciones_revision: string | null;
}

export async function fetchRegistroExistente(
  actividadId: string,
  anio: number,
  mes: number
): Promise<RegistroMensualExistente | null> {
  const { data, error } = await (supabase as any)
    .from("registros_mensuales")
    .select("id, avance_valor, estado, descripcion_avance, fecha_ejecucion, estado_registro, observaciones_revision")
    .eq("actividad_id", actividadId)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();

  if (error || !data) return null;
  return data as RegistroMensualExistente;
}

export async function fetchAcumuladoAnterior(
  actividadId: string,
  anio: number,
  mesActual: number
): Promise<number> {
  const { data, error } = await (supabase as any)
    .from("registros_mensuales")
    .select("avance_valor")
    .eq("actividad_id", actividadId)
    .neq("estado_registro", "observado");

  if (error || !data) return 0;

  // Sum all avance_valor except the current month
  return (data as any[])
    .filter((r: any) => !(r.anio === anio && r.mes === mesActual))
    .reduce((sum: number, r: any) => sum + (r.avance_valor ?? 0), 0);
}

export async function saveRegistroMensual(
  registro: RegistroMensualInsert,
  gastos: Omit<EjecucionFinancieraInsert, "registro_mensual_id">[],
  contextual?: ContextualData
): Promise<{ success: boolean; error?: string }> {
  // 1. Upsert registro mensual
  const { data: regData, error: regError } = await (supabase as any)
    .from("registros_mensuales")
    .upsert(registro, { onConflict: "actividad_id,anio,mes" })
    .select("id")
    .maybeSingle();

  if (regError || !regData) {
    console.error("Error saving registro:", regError);
    return { success: false, error: regError?.message ?? "Error al guardar registro" };
  }

  const regId = regData.id;
  const entId = registro.entidad_id;
  const actId = registro.actividad_id;

  // 2. Delete old gastos, then insert new ones
  await (supabase as any).from("ejecucion_financiera").delete().eq("registro_mensual_id", regId);
  if (gastos.length > 0) {
    const gastosWithId = gastos.map((g) => ({ ...g, registro_mensual_id: regId, entidad_id: entId }));
    const { error: gastosError } = await (supabase as any).from("ejecucion_financiera").insert(gastosWithId);
    if (gastosError) {
      console.error("Error saving gastos:", gastosError);
      return { success: false, error: gastosError.message };
    }
  }

  // 3. Save contextual indicators
  if (contextual) {
    // Capacitación
    if (contextual.capacitacion && contextual.capacitacion.nombre_accion_formativa) {
      // Delete previous
      await (supabase as any).from("registro_capacitaciones").delete().eq("registro_mensual_id", regId);
      const cap = contextual.capacitacion;
      const { data: capData, error: capError } = await (supabase as any)
        .from("registro_capacitaciones")
        .insert({
          registro_mensual_id: regId, actividad_id: actId, entidad_id: entId,
          nombre_accion_formativa: cap.nombre_accion_formativa,
          tipo_accion_formativa: cap.tipo_accion_formativa || null,
          tema: cap.tema || null,
          fecha_inicio: cap.fecha_inicio ? format(cap.fecha_inicio, "yyyy-MM-dd") : null,
          fecha_fin: cap.fecha_fin ? format(cap.fecha_fin, "yyyy-MM-dd") : null,
          departamento: cap.departamento || null,
          modalidad: cap.modalidad || null,
          total_participantes: cap.participantes.length,
          participantes_masculino: cap.participantes.filter((p) => p.genero === "M").length,
          participantes_femenino: cap.participantes.filter((p) => p.genero === "F").length,
        })
        .select("id")
        .maybeSingle();

      if (!capError && capData && cap.participantes.length > 0) {
        const parts = cap.participantes
          .filter((p) => p.num_documento && p.apellidos && p.nombres)
          .map((p) => ({
            capacitacion_id: capData.id, entidad_id: entId,
            num_documento: p.num_documento, apellidos: p.apellidos, nombres: p.nombres,
            genero: p.genero || null, nombre_organizacion: p.nombre_organizacion || null,
            aplico_aprendizaje: p.aplico_aprendizaje,
          }));
        if (parts.length > 0) {
          await (supabase as any).from("participantes_capacitacion").insert(parts);
        }
      }
    }

    // Innovación
    if (contextual.innovacion?.activo && contextual.innovacion.nombre_innovacion) {
      await (supabase as any).from("registro_innovaciones").delete().eq("registro_mensual_id", regId);
      const inn = contextual.innovacion;
      await (supabase as any).from("registro_innovaciones").insert({
        registro_mensual_id: regId, actividad_id: actId, entidad_id: entId,
        nombre_innovacion: inn.nombre_innovacion,
        optimizacion_recursos: inn.optimizacion_recursos,
        optimizacion_procesos: inn.optimizacion_procesos,
        tecnificacion_mecanizacion: inn.tecnificacion_mecanizacion,
        digitalizacion_trazabilidad: inn.digitalizacion_trazabilidad,
        sostenibilidad_certificaciones: inn.sostenibilidad_certificaciones,
        valor_agregado_calidad: inn.valor_agregado_calidad,
        ruc_organizacion: inn.ruc_organizacion || null,
        nombre_organizacion: inn.nombre_organizacion || null,
      });
    }

    // GEI
    if (contextual.gei?.activo && contextual.gei.nombre_practica) {
      await (supabase as any).from("registro_gei").delete().eq("registro_mensual_id", regId);
      const gei = contextual.gei;
      await (supabase as any).from("registro_gei").insert({
        registro_mensual_id: regId, actividad_id: actId, entidad_id: entId,
        tipo_accion: gei.tipo_accion || null,
        nombre_practica: gei.nombre_practica,
        categoria: gei.categoria || null,
        etapa_implementacion: gei.etapa_implementacion || null,
        ruc_organizacion: gei.ruc_organizacion || null,
        nombre_organizacion: gei.nombre_organizacion || null,
      });
    }

    // Nuevo producto
    if (contextual.nuevo_producto?.activo && contextual.nuevo_producto.nombre_producto) {
      await (supabase as any).from("registro_nuevos_productos").delete().eq("registro_mensual_id", regId);
      const np = contextual.nuevo_producto;
      await (supabase as any).from("registro_nuevos_productos").insert({
        registro_mensual_id: regId, actividad_id: actId, entidad_id: entId,
        nombre_producto: np.nombre_producto,
        cadena_valor: np.cadena_valor || null,
        transformacion_primario: np.transformacion_primario,
        mejora_empaque: np.mejora_empaque,
        diferenciacion_origen: np.diferenciacion_origen,
        incorpora_innovacion: np.incorpora_innovacion,
        ruc_organizacion: np.ruc_organizacion || null,
        nombre_organizacion: np.nombre_organizacion || null,
      });
    }
  }

  return { success: true };
}
