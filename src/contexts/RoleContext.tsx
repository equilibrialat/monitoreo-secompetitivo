import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "entidad"
  | "coordinador_regional"
  | "gestor_mec_a"
  | "coordinador_mec_b"
  | "monitoreo"
  | "administracion"
  | "direccion";

export const ROLE_LABELS: Record<AppRole, string> = {
  entidad: "Entidad",
  coordinador_regional: "Coordinador Regional",
  gestor_mec_a: "Gestor MEC-A",
  coordinador_mec_b: "Coordinador MEC-B",
  monitoreo: "Monitoreo",
  administracion: "Administración",
  direccion: "Dirección",
};

export interface EntidadOption {
  id: string;
  nombre_corto: string;
  tipo_entidad: string;
  cadena_valor: string | null;
}

interface RoleContextValue {
  role: AppRole;
  setRole: (r: AppRole) => void;
  entidadId: string | null;
  setEntidadId: (id: string | null) => void;
  entidades: EntidadOption[];
  loadingEntidades: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("entidad");
  const [entidadId, setEntidadId] = useState<string | null>(null);
  const [entidades, setEntidades] = useState<EntidadOption[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(true);

  useEffect(() => {
    async function fetchEntidades() {
      setLoadingEntidades(true);
      const { data, error } = await (supabase as any)
        .from("entidades")
        .select("id, nombre_corto, tipo_entidad, cadena_valor")
        .order("nombre_corto");

      if (!error && data && data.length > 0) {
        setEntidades(data as EntidadOption[]);
        if (!entidadId) setEntidadId((data as EntidadOption[])[0].id);
      }
      setLoadingEntidades(false);
    }
    fetchEntidades();
  }, []);

  return (
    <RoleContext.Provider
      value={{ role, setRole, entidadId, setEntidadId, entidades, loadingEntidades }}
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
