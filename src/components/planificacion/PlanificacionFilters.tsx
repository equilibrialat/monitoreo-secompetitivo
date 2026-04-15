import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanificacionFilterState {
  estados: string[];
  proximoEntregable: string;
  avanceTecnico: string;
  avancePresupuestario: string;
}

export const EMPTY_FILTERS: PlanificacionFilterState = {
  estados: [],
  proximoEntregable: "",
  avanceTecnico: "",
  avancePresupuestario: "",
};

const ESTADO_OPTIONS = [
  { value: "con_rezago", label: "Rezagado", dotClass: "bg-red-500" },
  { value: "en_proceso", label: "En proceso", dotClass: "bg-amber-400" },
  { value: "completada", label: "Completado", dotClass: "bg-emerald-600" },
  { value: "por_iniciar", label: "Sin iniciar", dotClass: "bg-gray-400" },
];

export function hasActiveFilters(f: PlanificacionFilterState): boolean {
  return f.estados.length > 0 || !!f.proximoEntregable || !!f.avanceTecnico || !!f.avancePresupuestario;
}

interface Props {
  filters: PlanificacionFilterState;
  onChange: (f: PlanificacionFilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export default function PlanificacionFilters({ filters, onChange, totalCount, filteredCount }: Props) {
  const active = hasActiveFilters(filters);

  function toggleEstado(val: string) {
    const next = filters.estados.includes(val)
      ? filters.estados.filter((e) => e !== val)
      : [...filters.estados, val];
    onChange({ ...filters, estados: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 py-2 mb-2 bg-muted/30 rounded-lg border border-border/50">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {/* Estado multi-select as toggle chips */}
      <div className="flex flex-wrap gap-1">
        {ESTADO_OPTIONS.map((opt) => {
          const selected = filters.estados.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleEstado(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border transition-colors",
                selected
                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                  : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", opt.dotClass)} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <span className="text-border">|</span>

      {/* Próximo entregable */}
      <Select value={filters.proximoEntregable} onValueChange={(v) => onChange({ ...filters, proximoEntregable: v === "all" ? "" : v })}>
        <SelectTrigger className="h-7 text-[11px] w-[130px] border-border/50">
          <SelectValue placeholder="Próximo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="este_mes">Este mes</SelectItem>
          <SelectItem value="proximo_mes">Próximo mes</SelectItem>
          <SelectItem value="este_trimestre">Este trimestre</SelectItem>
        </SelectContent>
      </Select>

      {/* Avance técnico */}
      <Select value={filters.avanceTecnico} onValueChange={(v) => onChange({ ...filters, avanceTecnico: v === "all" ? "" : v })}>
        <SelectTrigger className="h-7 text-[11px] w-[130px] border-border/50">
          <SelectValue placeholder="Av. Técnico" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="con_registro">Con registro</SelectItem>
          <SelectItem value="sin_registro">Sin registro</SelectItem>
        </SelectContent>
      </Select>

      {/* Avance presupuestario */}
      <Select value={filters.avancePresupuestario} onValueChange={(v) => onChange({ ...filters, avancePresupuestario: v === "all" ? "" : v })}>
        <SelectTrigger className="h-7 text-[11px] w-[130px] border-border/50">
          <SelectValue placeholder="Av. Presup." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="con_registro">Con registro</SelectItem>
          <SelectItem value="sin_registro">Sin registro</SelectItem>
        </SelectContent>
      </Select>

      {/* Counter + clear */}
      <div className="flex items-center gap-2 ml-auto">
        {active && (
          <>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {filteredCount} de {totalCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(EMPTY_FILTERS)}
            >
              <X className="h-3 w-3" /> Limpiar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
