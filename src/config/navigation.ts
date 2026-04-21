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
  Lock,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/contexts/RoleContext";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

const ENTIDAD_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Mi Planificación", path: "/mi-planificacion", icon: ClipboardList },
      { label: "Mi Ejecución Técnica", path: "/ejecucion-tecnica", icon: BarChart3 },
      { label: "Mi Ejecución Presup.", path: "/ejecucion-presupuestaria", icon: Banknote },
    ],
  },
  // HIDDEN — coming_soon: true. Mantener componente y rutas, no visible en menú.
  // {
  //   label: "REPORTES",
  //   items: [
  //     { label: "Generar Reporte", path: "/generar-reportes", icon: FileDown },
  //   ],
  // },
  {
    label: "GESTIÓN",
    items: [
      { label: "Contratos y Comprobantes", path: "/gestion-contratos", icon: FileCheck },
      { label: "Viáticos", path: "/viaticos", icon: Plane },
      // HIDDEN — coming_soon: true. Historial vivirá dentro de Planificación; bandeja en dashboard.
      // { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    ],
  },
];

const COORDINADOR_REGIONAL_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MENSUAL",
    items: [
      { label: "Avance de Entidades", path: "/revision-pendiente", icon: Eye },
    ],
  },
  {
    label: "TRIMESTRAL",
    items: [
      { label: "Planificación", path: "/planificacion-trimestral", icon: ClipboardList },
      { label: "Aprobaciones", path: "/aprobaciones", icon: ClipboardCheck },
      // HIDDEN — coming_soon: true. Bandeja vivirá en dashboard del rol.
      // { label: "Reasignaciones", path: "/bandeja-reasignaciones", icon: Shuffle },
      { label: "Consolidado Regional", path: "/reportes-regionales", icon: BarChart3 },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const COORDINADOR_CADENAS_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MENSUAL",
    items: [
      { label: "Avance Mec B", path: "/revision-pendiente", icon: Eye },
    ],
  },
  {
    label: "TRIMESTRAL",
    items: [
      { label: "Consolidado Mec B", path: "/reportes-mec-b", icon: BarChart3 },
      // HIDDEN — coming_soon: true. Bandeja vivirá en dashboard del rol.
      // { label: "Reasignaciones", path: "/bandeja-reasignaciones", icon: Shuffle },
      { label: "Reportes Trimestrales", path: "/reportes", icon: FolderOpen },
    ],
  },
  {
    label: "SEMESTRAL / ANUAL",
    items: [
      { label: "Próximamente", path: "#", icon: Lock, disabled: true },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const MONITOREO_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MENSUAL",
    items: [
      { label: "Avance del Programa", path: "/indicadores", icon: Eye },
    ],
  },
  {
    label: "TRIMESTRAL",
    items: [
      { label: "Consolidado Programa", path: "/verificacion", icon: BarChart3 },
      { label: "Gestión de Trimestres", path: "/administracion", icon: Settings },
    ],
  },
  {
    label: "SEMESTRAL / ANUAL",
    items: [
      { label: "Informes a SECO", path: "#", icon: TrendingUp, disabled: true },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const ADMINISTRACION_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "FINANCIERO",
    items: [
      { label: "Gestión Financiera", path: "/gestion-financiera", icon: Banknote },
      { label: "IGV", path: "/gestion-financiera?tab=igv", icon: FileCheck },
      { label: "Desembolsos", path: "/desembolsos", icon: Banknote },
    ],
  },
  {
    label: "CONTRATOS",
    items: [
      { label: "Contratos", path: "/contratos", icon: FileCheck },
      { label: "Viáticos", path: "/viaticos", icon: Plane },
      // HIDDEN — coming_soon: true. Bandeja vivirá en dashboard del rol.
      // { label: "Reasignaciones", path: "/reasignaciones", icon: Shuffle },
    ],
  },
  {
    label: "MECANISMO A",
    items: [
      { label: "Pagos Pendientes Mec A", path: "/mec-a/pagos-pendientes", icon: Banknote },
    ],
  },
  {
    label: "REPORTES",
    items: [
      { label: "Reportes Financieros", path: "/reportes-financieros", icon: BarChart3 },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const DIRECCION_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "PROGRAMA",
    items: [
      { label: "Cadenas de Valor", path: "/reportes-mec-b", icon: BarChart3 },
    ],
  },
  {
    label: "REPORTES",
    items: [
      { label: "Informes ejecutivos", path: "/reportes-ejecutivos", icon: TrendingUp },
      { label: "Próximamente", path: "#", icon: Lock, disabled: true },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const ASESORA_POLITICAS_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MECANISMO A",
    items: [
      { label: "Panel Iniciativas", path: "/mec-a/panel", icon: Briefcase },
      { label: "Reasignaciones", path: "/mec-a/reasignaciones", icon: Shuffle },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const GESTOR_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MENSUAL",
    items: [
      { label: "Mis Iniciativas", path: "/mis-iniciativas", icon: Briefcase },
      { label: "Registro Mensual", path: "/registro-mensual", icon: FileText },
    ],
  },
  {
    label: "REPORTES",
    items: [
      { label: "Reportes", path: "/reportes", icon: BarChart3 },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

// ─── Gestor de Iniciativa Mec A ──────────────────────────────────────────────
export const GESTOR_INICIATIVA_NAV_BASE = "/mec-a/iniciativa";

const GESTOR_INICIATIVA_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/mec-a/iniciativa/current", icon: LayoutDashboard },
    ],
  },
  {
    label: "INGRESO DE DATA",
    items: [
      { label: "Avance Operativo", path: "/mec-a/iniciativa/current/avance-operativo", icon: BarChart3 },
      { label: "Presupuesto", path: "/mec-a/iniciativa/current/presupuesto", icon: Banknote },
      { label: "Entregables", path: "/mec-a/iniciativa/current/entregables", icon: ClipboardCheck },
      { label: "Comprobantes", path: "/mec-a/iniciativa/current/comprobantes", icon: FileCheck },
      { label: "Contrapartida Monetaria", path: "/mec-a/iniciativa/current/contrapartida-monetaria", icon: Banknote },
      { label: "Contrapartida No Monet.", path: "/mec-a/iniciativa/current/contrapartida-no-monetaria", icon: Briefcase },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Reasignaciones", path: "/mec-a/iniciativa/current/reasignaciones", icon: Shuffle },
      { label: "Notificaciones", path: "/notificaciones", icon: Bell },
    ],
  },
];

const NAV_SECTIONS_BY_ROLE: Record<AppRole, NavSection[]> = {
  entidad_mec_a: ENTIDAD_NAV,
  entidad_mec_b: ENTIDAD_NAV,
  gestor: GESTOR_NAV,
  gestor_iniciativa: GESTOR_INICIATIVA_NAV,
  coordinador_regional: COORDINADOR_REGIONAL_NAV,
  asesora_politicas: ASESORA_POLITICAS_NAV,
  coordinador_cadenas: COORDINADOR_CADENAS_NAV,
  monitoreo: MONITOREO_NAV,
  administracion: ADMINISTRACION_NAV,
  direccion: DIRECCION_NAV,
};

export function getNavSectionsForRole(role: AppRole): NavSection[] {
  return NAV_SECTIONS_BY_ROLE[role] ?? [];
}

// Keep flat list for backward compat if needed
export function getNavForRole(role: AppRole): NavItem[] {
  return getNavSectionsForRole(role).flatMap((s) => s.items);
}
