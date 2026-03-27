import { createContext, useContext, useState, ReactNode } from "react";

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

interface RoleContextValue {
  role: AppRole;
  setRole: (r: AppRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("entidad");
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
