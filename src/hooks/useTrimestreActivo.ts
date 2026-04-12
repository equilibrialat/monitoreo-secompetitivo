import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Trimestre {
  id: string;
  anio: number;
  trimestre: number;
  mes_inicio: number;
  mes_fin: number;
  estado: "cerrado" | "activo" | "planificacion" | "futuro";
  activated_by: string | null;
  activated_at: string | null;
}

const MONTH_NAMES: Record<number, string> = {
  1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
};

export function getTrimestreLabel(t: Trimestre): string {
  return `${MONTH_NAMES[t.mes_inicio]}-${MONTH_NAMES[t.mes_fin]} ${t.anio}`;
}

async function fetchTrimestres(): Promise<Trimestre[]> {
  const { data, error } = await (supabase as any)
    .from("trimestres")
    .select("*")
    .order("anio", { ascending: true })
    .order("trimestre", { ascending: true });
  if (error) {
    console.error("Error fetching trimestres:", error);
    return [];
  }
  return data || [];
}

export function useTrimestres() {
  return useQuery({
    queryKey: ["trimestres"],
    queryFn: fetchTrimestres,
    staleTime: 60_000,
  });
}

export function useTrimestreActivo() {
  const { data: trimestres, ...rest } = useTrimestres();
  const activo = trimestres?.find(t => t.estado === "activo") || null;
  return { activo, trimestres: trimestres || [], ...rest };
}

export function useActivarTrimestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trimestreId: string) => {
      // Close current active
      await (supabase as any)
        .from("trimestres")
        .update({ estado: "cerrado" })
        .eq("estado", "activo");
      // Activate new one
      const { error } = await (supabase as any)
        .from("trimestres")
        .update({
          estado: "activo",
          activated_at: new Date().toISOString(),
        })
        .eq("id", trimestreId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trimestres"] });
    },
  });
}
