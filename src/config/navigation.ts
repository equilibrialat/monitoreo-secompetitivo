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
  Plane,
  Shuffle,
  Bell,
  FileDown,
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
    { label: "Contratos", path: "/contratos", icon: FileCheck },
    { label: "Viáticos", path: "/viaticos", icon: Plane },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
    { label: "Generar Reportes", path: "/generar-reportes", icon: FileDown },
  ],
  coordinador_regional: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  gestor_mec_a: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  coordinador_mec_b: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  monitoreo: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Indicadores", path: "/indicadores", icon: BarChart3 },
    { label: "Verificación", path: "/verificacion", icon: Eye },
    { label: "Reportes", path: "/reportes", icon: FolderOpen },
    { label: "Generar Reportes", path: "/generar-reportes", icon: FileDown },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  administracion: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Contratos", path: "/contratos", icon: FileCheck },
    { label: "Desembolsos", path: "/desembolsos", icon: Banknote },
    { label: "Viáticos", path: "/viaticos", icon: Plane },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  direccion: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Aprobaciones", path: "/aprobaciones", icon: ClipboardCheck },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
};

export function getNavForRole(role: AppRole): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}
