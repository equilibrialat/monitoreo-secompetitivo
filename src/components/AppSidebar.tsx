import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronDown, Building2 } from "lucide-react";
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

export function AppSidebar() {
  const { role, setRole, entidadId, setEntidadId, entidades, loadingEntidades } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getNavForRole(role);

  const handleRoleChange = (r: AppRole) => {
    setRole(r);
    navigate("/dashboard");
  };

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-bold text-sidebar-active tracking-tight">
          Se<span className="text-primary">Competitivo</span>
        </h1>
      </div>

      {/* Role selector */}
      <div className="px-3 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-between w-full rounded-md bg-sidebar-accent px-3 py-2 text-sm text-sidebar-active hover:bg-sidebar-accent/80 transition-colors">
              <span className="truncate">{ROLE_LABELS[role]}</span>
              <ChevronDown className="h-4 w-4 opacity-60 shrink-0 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[194px]">
            {ALL_ROLES.map((r) => (
              <DropdownMenuItem
                key={r}
                onSelect={() => handleRoleChange(r)}
                className={r === role ? "font-semibold" : ""}
              >
                {ROLE_LABELS[r]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Entidad selector - only for "entidad" role */}
      {role === "entidad" && entidades.length > 0 && (
        <div className="px-3 pb-4">
          <Select
            value={entidadId ?? ""}
            onValueChange={setEntidadId}
            disabled={loadingEntidades}
          >
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-none text-sidebar-active">
              <Building2 className="h-3 w-3 mr-1.5 shrink-0" />
              <SelectValue placeholder="Seleccionar entidad" />
            </SelectTrigger>
            <SelectContent>
              {entidades.map((e) => (
                <SelectItem key={e.id} value={e.id} className="text-xs">
                  {e.nombre_corto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
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
}
