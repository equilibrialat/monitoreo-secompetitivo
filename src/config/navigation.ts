import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  Target,
  TrendingUp,
  Building2,
  FolderOpen,
  Shield,
  Eye,
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
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Mi Plan de Mejora", path: "/plan-mejora", icon: Target },
    { label: "Indicadores", path: "/indicadores", icon: BarChart3 },
    { label: "Documentos", path: "/documentos", icon: FileText },
  ],
  coordinador_regional: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Entidades", path: "/entidades", icon: Building2 },
    { label: "Seguimiento", path: "/seguimiento", icon: ClipboardList },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
  ],
  gestor_mec_a: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Entidades Asignadas", path: "/entidades", icon: Building2 },
    { label: "Planes de Mejora", path: "/planes", icon: Target },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
  ],
  coordinador_mec_b: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Equipos", path: "/equipos", icon: Users },
    { label: "Seguimiento General", path: "/seguimiento", icon: TrendingUp },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
  ],
  monitoreo: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Indicadores", path: "/indicadores", icon: BarChart3 },
    { label: "Verificación", path: "/verificacion", icon: Eye },
    { label: "Reportes", path: "/reportes", icon: FolderOpen },
  ],
  administracion: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Usuarios", path: "/usuarios", icon: Users },
    { label: "Configuración", path: "/configuracion", icon: Settings },
    { label: "Seguridad", path: "/seguridad", icon: Shield },
  ],
  direccion: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Resumen Ejecutivo", path: "/resumen", icon: TrendingUp },
    { label: "KPIs", path: "/kpis", icon: BarChart3 },
    { label: "Reportes", path: "/reportes", icon: FolderOpen },
  ],
};

export function getNavForRole(role: AppRole): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}
