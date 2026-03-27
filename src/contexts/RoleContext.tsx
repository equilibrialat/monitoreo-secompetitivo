import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "entidad"
  | "gestor"
  | "coordinador_regional"
  | "asesora_politicas"
  | "coordinador_cadenas"
  | "monitoreo"
  | "administracion"
  | "direccion";

export const ROLE_LABELS: Record<AppRole, string> = {
  entidad: "Entidad",
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
        .select("id, nombre_corto, tipo_entidad, cadena_valor, mecanismo, region")
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
