import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import React from "react";

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

// --- Selected trimester context ---
interface TrimestreSeleccionadoContextValue {
  /** The trimestre the user is viewing (may be closed/historical) */
  seleccionado: Trimestre | null;
  /** The actual active trimestre */
  activo: Trimestre | null;
  /** All trimestres */
  trimestres: Trimestre[];
  /** Is the user viewing a historical (non-active) trimester? */
  isHistorical: boolean;
  /** Switch viewed trimester */
  setSeleccionadoId: (id: string) => void;
  isLoading: boolean;
}

const TrimestreSeleccionadoContext = createContext<TrimestreSeleccionadoContextValue | null>(null);

export function TrimestreSeleccionadoProvider({ children }: { children: ReactNode }) {
  const { data: trimestres, isLoading } = useTrimestres();
  const allTrimestres = trimestres || [];
  const activo = allTrimestres.find(t => t.estado === "activo") || null;

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  // Default to active trimester
  useEffect(() => {
    if (activo && !seleccionadoId) {
      setSeleccionadoId(activo.id);
    }
  }, [activo?.id]);

  const seleccionado = allTrimestres.find(t => t.id === seleccionadoId) || activo;
  const isHistorical = !!(seleccionado && activo && seleccionado.id !== activo.id);

  return React.createElement(
    TrimestreSeleccionadoContext.Provider,
    {
      value: {
        seleccionado,
        activo,
        trimestres: allTrimestres,
        isHistorical,
        setSeleccionadoId,
        isLoading,
      }
    },
    children
  );
}

export function useTrimestreSeleccionado() {
  const ctx = useContext(TrimestreSeleccionadoContext);
  if (!ctx) throw new Error("useTrimestreSeleccionado must be used within TrimestreSeleccionadoProvider");
  return ctx;
}

// Keep backward-compatible hook
export function useTrimestreActivo() {
  const { data: trimestres, ...rest } = useTrimestres();
  const activo = trimestres?.find(t => t.estado === "activo") || null;
  return { activo, trimestres: trimestres || [], ...rest };
}

export function useActivarTrimestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trimestreId: string) => {
      await (supabase as any)
        .from("trimestres")
        .update({ estado: "cerrado" })
        .eq("estado", "activo");
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
