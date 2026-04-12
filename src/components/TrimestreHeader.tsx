import { CalendarDays, ChevronDown, AlertTriangle } from "lucide-react";
import { useTrimestreSeleccionado, getTrimestreLabel } from "@/hooks/useTrimestreActivo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TrimestreHeader() {
  const { seleccionado, activo, trimestres, isHistorical, setSeleccionadoId, isLoading } = useTrimestreSeleccionado();

  if (isLoading) return null;

  // Show only trimestres that are activo or cerrado (have data)
  const navigable = trimestres
    .filter(t => t.estado === "activo" || t.estado === "cerrado")
    .sort((a, b) => b.anio - a.anio || b.trimestre - a.trimestre);

  if (navigable.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Sin trimestre activo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-md px-2 py-1.5 transition-colors">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>
              {seleccionado ? getTrimestreLabel(seleccionado) : "Sin trimestre"}
            </span>
            {seleccionado && seleccionado.estado === "cerrado" && (
              <span className="text-[10px] text-muted-foreground">(cerrado)</span>
            )}
            {seleccionado && seleccionado.estado === "activo" && (
              <span className="text-[10px] text-primary">(activo)</span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          {navigable.map(t => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => setSeleccionadoId(t.id)}
              className={`text-xs min-h-[36px] ${seleccionado?.id === t.id ? "font-semibold bg-accent" : ""}`}
            >
              <span className="flex-1">{getTrimestreLabel(t)}</span>
              <span className={`text-[10px] ml-2 ${t.estado === "activo" ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {t.estado === "activo" ? "activo" : "cerrado"}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Banner shown when viewing historical data */
export function HistoricalBanner() {
  const { seleccionado, isHistorical } = useTrimestreSeleccionado();
  if (!isHistorical || !seleccionado) return null;

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
      <p className="text-sm text-warning font-medium">
        Viendo datos históricos: {getTrimestreLabel(seleccionado)} — solo lectura
      </p>
    </div>
  );
}
