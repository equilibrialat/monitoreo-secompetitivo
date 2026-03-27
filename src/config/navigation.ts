import {
  LayoutDashboard,
  FileText,
  BarChart3,
  ClipboardList,
  ClipboardCheck,
  Eye,
  FolderOpen,
  Banknote,
  FileCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/contexts/RoleContext";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  entidad: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Mis Actividades", path: "/actividades", icon: ClipboardList },
    { label: "Registro Mensual", path: "/registro-mensual", icon: FileText },
    { label: "Indicadores de Impacto", path: "/indicadores-impacto", icon: TrendingUp },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
  ],
  coordinador_regional: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
  ],
  gestor_mec_a: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
  ],
  coordinador_mec_b: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
  ],
  monitoreo: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Indicadores", path: "/indicadores", icon: BarChart3 },
    { label: "Verificación", path: "/verificacion", icon: Eye },
    { label: "Reportes", path: "/reportes", icon: FolderOpen },
  ],
  administracion: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Contratos", path: "/contratos", icon: FileCheck },
    { label: "Desembolsos", path: "/desembolsos", icon: Banknote },
  ],
  direccion: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Aprobaciones", path: "/aprobaciones", icon: ClipboardCheck },
  ],
};

export function getNavForRole(role: AppRole): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}
