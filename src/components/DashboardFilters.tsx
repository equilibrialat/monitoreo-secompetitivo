import { useRole, type GlobalFilters } from "@/contexts/RoleContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

interface Props {
  showMecanismo?: boolean;
  showEntidad?: boolean;
  showRegion?: boolean;
  showPeriodo?: boolean;
}

export default function DashboardFilters({
  showMecanismo = true,
  showEntidad = true,
  showRegion = false,
  showPeriodo = false,
}: Props) {
  const { filters, setFilters, clearFilters, hasActiveFilters, entidades, role } = useRole();

  // Role restrictions
  const canFilterMecanismo = role !== "asesora_politicas" && role !== "coordinador_cadenas";

  // Available options derived from entidades
  const regiones = [...new Set(entidades.map(e => e.region).filter(Boolean))] as string[];

  // Entidades available for dropdown (respect mecanismo filter)
  const entidadesForDropdown = entidades.filter(e => {
    if (role === "asesora_politicas" && e.mecanismo !== "mec_a") return false;
    if (role === "coordinador_cadenas" && e.mecanismo !== "mec_b") return false;
    if (filters.mecanismo === "mec_a" && e.mecanismo !== "mec_a") return false;
    if (filters.mecanismo === "mec_b" && e.mecanismo !== "mec_b") return false;
    if (filters.region && e.region !== filters.region) return false;
    return true;
  });

  const update = (patch: Partial<GlobalFilters>) => {
    const next = { ...filters, ...patch };
    // If mecanismo changes, reset entidad filter if it no longer applies
    if (patch.mecanismo && filters.entidadFiltro) {
      const ent = entidades.find(e => e.id === filters.entidadFiltro);
      if (ent && patch.mecanismo !== "todos" && ent.mecanismo !== patch.mecanismo) {
        next.entidadFiltro = null;
      }
    }
    setFilters(next);
  };

  const activeLabels: string[] = [];
  if (filters.mecanismo === "mec_a") activeLabels.push("Mecanismo A");
  if (filters.mecanismo === "mec_b") activeLabels.push("Mecanismo B");
  if (filters.entidadFiltro) {
    const ent = entidades.find(e => e.id === filters.entidadFiltro);
    activeLabels.push(ent?.nombre_corto || "Entidad");
  }
  if (filters.region) activeLabels.push(filters.region);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {showMecanismo && canFilterMecanismo && (
          <Select
            value={filters.mecanismo}
            onValueChange={(v) => update({ mecanismo: v as GlobalFilters["mecanismo"] })}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Mecanismo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los Mecanismos</SelectItem>
              <SelectItem value="mec_a">Mecanismo A</SelectItem>
              <SelectItem value="mec_b">Mecanismo B</SelectItem>
            </SelectContent>
          </Select>
        )}

        {showEntidad && (
          <Select
            value={filters.entidadFiltro || "todas"}
            onValueChange={(v) => update({ entidadFiltro: v === "todas" ? null : v })}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Entidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las Entidades</SelectItem>
              {entidadesForDropdown.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showRegion && (
          <Select
            value={filters.region || "todas"}
            onValueChange={(v) => update({ region: v === "todas" ? null : v })}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las Regiones</SelectItem>
              {regiones.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showPeriodo && (
          <Select
            value={filters.periodo}
            onValueChange={(v) => update({ periodo: v })}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="T4-2025">T4-2025</SelectItem>
              <SelectItem value="T3-2025">T3-2025</SelectItem>
              <SelectItem value="S2-2025">S2-2025</SelectItem>
              <SelectItem value="S1-2025">S1-2025</SelectItem>
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3 mr-1" /> Limpiar filtros
          </Button>
        )}
      </div>

      {activeLabels.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Filtros activos:</span>
          {activeLabels.map(l => (
            <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
