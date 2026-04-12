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
  Settings,
  Briefcase,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/contexts/RoleContext";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const ENTIDAD_NAV: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Mis Actividades", path: "/actividades", icon: ClipboardList },
  { label: "Registro Mensual", path: "/registro-mensual", icon: FileText },
  { label: "Registro Rápido", path: "/registro-rapido", icon: Zap },
  { label: "Indicadores de Impacto", path: "/indicadores-impacto", icon: TrendingUp },
  { label: "Contratos", path: "/contratos", icon: FileCheck },
  { label: "Viáticos", path: "/viaticos", icon: Plane },
  { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
  { label: "Reportes", path: "/reportes", icon: BarChart3 },
  { label: "Generar Reportes", path: "/generar-reportes", icon: FileDown },
];

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  entidad_mec_a: ENTIDAD_NAV,
  entidad_mec_b: ENTIDAD_NAV,
  gestor: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Mis Iniciativas", path: "/mis-iniciativas", icon: Briefcase },
    { label: "Registro Mensual", path: "/registro-mensual", icon: FileText },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  coordinador_regional: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
    { label: "Reportes Regionales", path: "/reportes-regionales", icon: BarChart3 },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  asesora_politicas: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
    { label: "Reportes Mec A", path: "/reportes-mec-a", icon: BarChart3 },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  coordinador_cadenas: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Revisión Pendiente", path: "/revision-pendiente", icon: ClipboardCheck },
    { label: "Reportes Mec B", path: "/reportes-mec-b", icon: BarChart3 },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  monitoreo: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Indicadores", path: "/indicadores", icon: BarChart3 },
    { label: "Verificación", path: "/verificacion", icon: Eye },
    { label: "Reportes", path: "/reportes", icon: FolderOpen },
    { label: "Generar Reportes", path: "/generar-reportes", icon: FileDown },
    { label: "Administración", path: "/administracion", icon: Settings },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  administracion: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Gestión Financiera", path: "/gestion-financiera", icon: Banknote },
    { label: "Contratos", path: "/contratos", icon: FileCheck },
    { label: "Desembolsos", path: "/desembolsos", icon: Banknote },
    { label: "Viáticos", path: "/viaticos", icon: Plane },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Reportes Financieros", path: "/reportes-financieros", icon: BarChart3 },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
  direccion: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Aprobaciones", path: "/aprobaciones", icon: ClipboardCheck },
    { label: "Reportes Ejecutivos", path: "/reportes-ejecutivos", icon: BarChart3 },
    { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    { label: "Notificaciones", path: "/notificaciones", icon: Bell },
  ],
};

export function getNavForRole(role: AppRole): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}
