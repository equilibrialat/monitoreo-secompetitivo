import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronDown, Building2, X } from "lucide-react";
import { useRole, ROLE_LABELS, type AppRole } from "@/contexts/RoleContext";
import { getNavForRole } from "@/config/navigation";
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
  const { role, setRole, entidadId, setEntidadId, entidades, loadingEntidades } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getNavForRole(role);

  const handleRoleChange = (r: AppRole) => {
    setRole(r);
    navigate("/dashboard");
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  const sidebarContent = (
    <aside className="flex flex-col w-[220px] min-h-screen bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo + close button on mobile */}
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
          <DropdownMenuContent align="start" className="w-[194px]">
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
      {role === "entidad" && entidades.length > 0 && (
        <div className="px-3 pb-4">
          <Select value={entidadId ?? ""} onValueChange={setEntidadId} disabled={loadingEntidades}>
            <SelectTrigger className="h-10 text-xs bg-sidebar-accent border-none text-sidebar-active min-h-[44px]">
              <Building2 className="h-3 w-3 mr-1.5 shrink-0" />
              <SelectValue placeholder="Seleccionar entidad" />
            </SelectTrigger>
            <SelectContent>
              {entidades.map((e) => (
                <SelectItem key={e.id} value={e.id} className="text-xs min-h-[44px]">
                  {e.nombre_corto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 text-xs text-sidebar-foreground/50">
        SeCompetitivo v1.0
      </div>
    </aside>
  );

  return sidebarContent;
}
