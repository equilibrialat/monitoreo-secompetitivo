import { supabase } from "@/integrations/supabase/client";

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
      avance_operativo_pct, estado_actual, tags,
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
}

export interface EjecucionFinancieraInsert {
  registro_mensual_id: string;
  actividad_id: string;
  fuente: string;
  monto: number;
  tipo_gasto: string;
  fecha_gasto: string;
}

export async function saveRegistroMensual(
  registro: RegistroMensualInsert,
  gastos: Omit<EjecucionFinancieraInsert, "registro_mensual_id">[]
): Promise<{ success: boolean; error?: string }> {
  // 1. Insert registro mensual
  const { data: regData, error: regError } = await (supabase as any)
    .from("registros_mensuales")
    .insert(registro)
    .select("id")
    .maybeSingle();

  if (regError || !regData) {
    console.error("Error saving registro:", regError);
    return { success: false, error: regError?.message ?? "Error al guardar registro" };
  }

  // 2. Insert gastos if any
  if (gastos.length > 0) {
    const gastosWithId = gastos.map((g) => ({
      ...g,
      registro_mensual_id: regData.id,
    }));

    const { error: gastosError } = await supabase
      .from("ejecucion_financiera")
      .insert(gastosWithId);

    if (gastosError) {
      console.error("Error saving gastos:", gastosError);
      return { success: false, error: gastosError.message };
    }
  }

  return { success: true };
}
