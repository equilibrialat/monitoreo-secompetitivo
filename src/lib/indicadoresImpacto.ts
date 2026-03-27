import { supabase } from "@/integrations/supabase/client";

export async function fetchByPeriodo(table: string, entidadId: string, anio: number, periodo: string) {
  const { data, error } = await (supabase as any)
    .from(table)
    .select("*")
    .eq("entidad_id", entidadId)
    .eq("anio", anio)
    .eq("periodo", periodo);
  if (error) { console.error(`Error fetching ${table}:`, error); return []; }
  return data ?? [];
}

export async function fetchByAnio(table: string, entidadId: string, anio: number) {
  const { data, error } = await (supabase as any)
    .from(table)
    .select("*")
    .eq("entidad_id", entidadId)
    .eq("anio", anio);
  if (error) { console.error(`Error fetching ${table}:`, error); return []; }
  return data ?? [];
}

export async function upsertRows(table: string, rows: any[]): Promise<{ success: boolean; error?: string }> {
  if (rows.length === 0) return { success: true };
  const { error } = await (supabase as any).from(table).upsert(rows);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteRows(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await (supabase as any).from(table).delete().in("id", ids);
}

export async function updateEstadoRegistro(table: string, entidadId: string, anio: number, periodo: string, estado: string) {
  await (supabase as any)
    .from(table)
    .update({ estado_registro: estado })
    .eq("entidad_id", entidadId)
    .eq("anio", anio)
    .eq("periodo", periodo);
}

export function getSemestre(s: string): string {
  return s === "S1" ? "Enero – Junio" : "Julio – Diciembre";
}
