import { useLocation, Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useRole, ROLE_LABELS, type AppRole } from "@/contexts/RoleContext";
import { getNavForRole } from "@/config/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export function AppSidebar() {
  const { role, setRole } = useRole();
  const location = useLocation();
  const navItems = getNavForRole(role);

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-bold text-sidebar-active tracking-tight">
          Se<span className="text-primary">Competitivo</span>
        </h1>
      </div>

      {/* Role selector */}
      <div className="px-3 pb-4">
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
                onSelect={() => setRole(r)}
                className={r === role ? "font-semibold" : ""}
              >
                {ROLE_LABELS[r]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
