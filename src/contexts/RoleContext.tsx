import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "entidad_mec_a"
  | "entidad_mec_b"
  | "gestor"
  | "coordinador_regional"
  | "asesora_politicas"
  | "coordinador_cadenas"
  | "monitoreo"
  | "administracion"
  | "direccion";

export const ROLE_LABELS: Record<AppRole, string> = {
  entidad_mec_a: "Entidad Mecanismo A",
  entidad_mec_b: "Entidad Mecanismo B",
  gestor: "Gestor",
  coordinador_regional: "Coordinador Regional",
  asesora_politicas: "Asesora Políticas Públicas",
  coordinador_cadenas: "Coordinador Cadenas de Valor",
  monitoreo: "Monitoreo",
  administracion: "Administración",
  direccion: "Dirección",
};

export interface EntidadOption {
  id: string;
  nombre_corto: string;
  tipo_entidad: string;
  cadena_valor: string | null;
  mecanismo?: string;
  region?: string;
}

export interface GlobalFilters {
  mecanismo: "todos" | "mec_a" | "mec_b";
  entidadFiltro: string | null; // null = todas
  region: string | null;
  periodo: string; // e.g. "2025", "T4-2025"
}

interface RoleContextValue {
  role: AppRole;
  setRole: (r: AppRole) => void;
  entidadId: string | null;
  setEntidadId: (id: string | null) => void;
  entidades: EntidadOption[];
  loadingEntidades: boolean;
  filters: GlobalFilters;
  setFilters: (f: GlobalFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  filteredEntidades: EntidadOption[];
}

const DEFAULT_FILTERS: GlobalFilters = {
  mecanismo: "todos",
  entidadFiltro: null,
  region: null,
  periodo: "2025",
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("entidad_mec_a");
  const [entidadId, setEntidadId] = useState<string | null>(null);
  const [entidades, setEntidades] = useState<EntidadOption[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(true);
  const [filters, setFiltersState] = useState<GlobalFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    async function fetchEntidades() {
      setLoadingEntidades(true);

      // Fetch entities and active entity IDs in parallel
      const [entRes, actRes] = await Promise.all([
        (supabase as any)
          .from("entidades")
          .select("id, nombre_corto, tipo_entidad, cadena_valor, mecanismo, region")
          .order("nombre_corto"),
        (supabase as any)
          .from("actividades")
          .select("entidad_id"),
      ]);

      if (!entRes.error && entRes.data) {
        const activeIds = new Set(
          (actRes.data || []).map((a: any) => a.entidad_id)
        );
        const filtered = (entRes.data as EntidadOption[]).filter((e) =>
          activeIds.has(e.id)
        );
        setEntidades(filtered);
        if (!entidadId && filtered.length > 0) setEntidadId(filtered[0].id);
      }
      setLoadingEntidades(false);
    }
    fetchEntidades();
  }, []);

  const setFilters = (f: GlobalFilters) => setFiltersState(f);
  const clearFilters = () => setFiltersState(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.mecanismo !== "todos" ||
    filters.entidadFiltro !== null ||
    filters.region !== null;

  // Compute filtered entidades based on role restrictions + user filters
  const filteredEntidades = entidades.filter((e) => {
    // Role-based restrictions (hard filters)
    if (role === "entidad_mec_a" && e.mecanismo !== "mec_a") return false;
    if (role === "entidad_mec_b" && e.mecanismo !== "mec_b") return false;
    if (role === "asesora_politicas" && e.mecanismo !== "mec_a") return false;
    if (role === "coordinador_cadenas" && e.mecanismo !== "mec_b") return false;
    // coordinador_regional would filter by region - handled by user's region

    // User-selected filters
    if (filters.mecanismo === "mec_a" && e.mecanismo !== "mec_a") return false;
    if (filters.mecanismo === "mec_b" && e.mecanismo !== "mec_b") return false;
    if (filters.entidadFiltro && e.id !== filters.entidadFiltro) return false;
    if (filters.region && e.region !== filters.region) return false;

    return true;
  });

  return (
    <RoleContext.Provider
      value={{
        role, setRole, entidadId, setEntidadId, entidades, loadingEntidades,
        filters, setFilters, clearFilters, hasActiveFilters, filteredEntidades,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
