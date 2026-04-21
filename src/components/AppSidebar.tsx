import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronDown, Building2, X } from "lucide-react";
import { useRole, ROLE_LABELS, type AppRole } from "@/contexts/RoleContext";
import { getNavSectionsForRole, GESTOR_INICIATIVA_NAV_BASE } from "@/config/navigation";
import { DevSeeder } from "@/components/DevSeeder";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const {
    role,
    setRole,
    entidadId,
    setEntidadId,
    loadingEntidades,
    filteredEntidades,
    iniciativaId,
    setIniciativaId,
  } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const navSections = getNavSectionsForRole(role);

  // When gestor_iniciativa has no iniciativaId yet, pick first available (demo mode)
  const resolvedIniciativaId = iniciativaId ?? "demo";

  const handleRoleChange = (r: AppRole) => {
    setRole(r);
    if (r === "gestor_iniciativa") {
      navigate(`${GESTOR_INICIATIVA_NAV_BASE}/${resolvedIniciativaId}`);
    } else {
      navigate("/dashboard");
    }
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  const showEntidadSelector = ["entidad_mec_a", "entidad_mec_b"].includes(role);

  const sidebarContent = (
    <aside className="flex flex-col w-[220px] min-h-screen bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-sidebar-active tracking-tight">
          Se<span className="text-primary">Competitivo</span>
        </h1>
        {mobileOpen && (
          <button onClick={onMobileClose} className="md:hidden p-1 text-sidebar-foreground hover:text-sidebar-active">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role selector */}
      <div className="px-3 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-between w-full rounded-md bg-sidebar-accent px-3 py-2.5 text-sm text-sidebar-active hover:bg-sidebar-accent/80 transition-colors min-h-[44px]">
              <span className="truncate">{ROLE_LABELS[role]}</span>
              <ChevronDown className="h-4 w-4 opacity-60 shrink-0 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            {ALL_ROLES.map((r) => (
              <DropdownMenuItem
                key={r}
                onSelect={() => handleRoleChange(r)}
                className={`min-h-[44px] ${r === role ? "font-semibold" : ""}`}
              >
                {ROLE_LABELS[r]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Entidad selector */}
      {showEntidadSelector && filteredEntidades.length > 0 && (
        <div className="px-3 pb-4">
          <Select value={entidadId ?? ""} onValueChange={setEntidadId} disabled={loadingEntidades}>
            <SelectTrigger className="h-10 text-xs bg-sidebar-accent border-none text-sidebar-active min-h-[44px]">
              <Building2 className="h-3 w-3 mr-1.5 shrink-0" />
              <SelectValue placeholder="Seleccionar entidad" />
            </SelectTrigger>
            <SelectContent>
              {filteredEntidades.map((e) => (
                <SelectItem key={e.id} value={e.id} className="text-xs min-h-[44px]">
                  <span className="flex items-center gap-1.5">
                    {e.nombre_corto}
                    <span className={`inline-flex rounded-full px-1 py-0 text-[9px] font-semibold ${
                      e.mecanismo === "mec_a" || e.mecanismo === "A"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    }`}>
                      {e.mecanismo === "mec_a" || e.mecanismo === "A" ? "A" : "B"}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Grouped Nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Divider between sections (not before the first) */}
            {sIdx > 0 && (
              <div className="my-2 mx-1 border-t border-sidebar-accent/60" />
            )}

            {/* Section label */}
            {section.label && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 uppercase select-none">
                {section.label}
              </div>
            )}

            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                // Replace placeholder 'current' with real iniciativaId for gestor_iniciativa
                const resolvedPath = role === "gestor_iniciativa"
                  ? item.path.replace("/current", `/${resolvedIniciativaId}`)
                  : item.path;

                if (item.disabled) {
                  return (
                    <div
                      key={item.path + item.label}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/30 cursor-default min-h-[44px]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  );
                }

                const active = location.pathname === resolvedPath ||
                  (resolvedPath !== "/dashboard" && location.pathname.startsWith(resolvedPath) && resolvedPath.length > 10);
                return (
                  <Link
                    key={resolvedPath}
                    to={resolvedPath}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors min-h-[44px] ${
                      active
                        ? "bg-sidebar-accent text-sidebar-active font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-active"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Dev seeder */}
      <DevSeeder />

      {/* Footer */}
      <div className="px-5 py-4 text-xs text-sidebar-foreground/50">
        SeCompetitivo v1.0
      </div>
    </aside>
  );

  return sidebarContent;
}
