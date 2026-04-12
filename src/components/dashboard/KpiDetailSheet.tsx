import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ChevronRight, X } from "lucide-react";
import { MecanismoBadge, fmt } from "./DashboardEntidad";
import type { DashboardEntidad } from "@/hooks/useDashboardData";

/* ── Types ── */
export interface AlertItem {
  entidad: string;
  entidadId: string;
  tipo: string;
  descripcion: string;
  fecha: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
}

export function KpiDetailSheet({ open, onOpenChange, title, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[420px] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          </div>
        </SheetHeader>
        <div className="px-4 py-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Pre-built panel contents ── */

function StatusDot({ pct }: { pct: number }) {
  const color = pct >= 60 ? "bg-emerald-500" : pct >= 30 ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export function EntidadesActivasPanel({
  entidades,
  onViewEntity,
}: {
  entidades: DashboardEntidad[];
  onViewEntity: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {entidades.map((e) => (
        <div
          key={e.entidad_id}
          className="flex items-center gap-2 p-2 rounded border hover:bg-muted/40 cursor-pointer transition-colors"
          onClick={() => onViewEntity(e.entidad_id)}
        >
          <StatusDot pct={e.pct_ejecucion_seco} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{e.nombre_corto}</span>
              <MecanismoBadge mec={e.mecanismo} />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{e.cadena_valor || e.tipo_entidad || "—"}</p>
          </div>
          <div className="text-right text-[11px] shrink-0">
            <p className="font-mono">{e.pct_ejecucion_seco}% fin.</p>
            <p className="font-mono text-muted-foreground">{e.avance_operativo_promedio ?? 0}% op.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function EjecucionFinancieraPanel({
  entidades,
  benchmarks,
}: {
  entidades: DashboardEntidad[];
  benchmarks?: Record<string, number>;
}) {
  const sorted = [...entidades].sort((a, b) => a.pct_ejecucion_seco - b.pct_ejecucion_seco);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Entidad</TableHead>
            <TableHead className="text-xs text-right">Presup.</TableHead>
            <TableHead className="text-xs text-right">Ejecutado</TableHead>
            <TableHead className="text-xs text-right">Saldo</TableHead>
            <TableHead className="text-xs text-right">%</TableHead>
            {benchmarks && <TableHead className="text-xs text-right">Esperado</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((e) => {
            const saldo = e.presupuesto_seco_total - e.ejecutado_seco_total;
            const expected = benchmarks?.[e.nombre_corto];
            return (
              <TableRow key={e.entidad_id}>
                <TableCell className="text-xs font-medium">{e.nombre_corto}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(e.presupuesto_seco_total)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(e.ejecutado_seco_total)}</TableCell>
                <TableCell className={`text-xs text-right font-mono ${saldo < 0 ? "text-destructive" : ""}`}>{fmt(saldo)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{e.pct_ejecucion_seco}%</TableCell>
                {benchmarks && (
                  <TableCell className="text-xs text-right font-mono text-muted-foreground">
                    {expected ? `${expected}%` : "—"}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ActividadesRetrasoPanel({
  entidades,
  onViewEntity,
}: {
  entidades: DashboardEntidad[];
  onViewEntity: (id: string) => void;
}) {
  const delayed = entidades.filter((e) => (e.avance_operativo_promedio || 0) < 80);
  if (delayed.length === 0) {
    return <p className="text-xs text-muted-foreground">No hay actividades con retraso ✓</p>;
  }
  return (
    <div className="space-y-2">
      {delayed.map((e) => (
        <div
          key={e.entidad_id}
          className="flex items-center gap-2 p-2 rounded border hover:bg-muted/40 cursor-pointer transition-colors"
          onClick={() => onViewEntity(e.entidad_id)}
        >
          <StatusDot pct={e.avance_operativo_promedio || 0} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{e.nombre_corto}</p>
            <p className="text-[11px] text-muted-foreground">
              Avance: {e.avance_operativo_promedio ?? 0}% · Meta &lt;80%
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function AlertasPanel({
  alerts,
  showMarkReviewed,
  onMarkReviewed,
  filterEntidad,
}: {
  alerts: AlertItem[];
  showMarkReviewed?: boolean;
  onMarkReviewed?: (idx: number) => void;
  filterEntidad?: string;
}) {
  const filtered = filterEntidad ? alerts.filter((a) => a.entidadId === filterEntidad) : alerts;

  const tipoColors: Record<string, string> = {
    Financiero: "bg-destructive/10 text-destructive border-destructive/30",
    Operativo: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    Reporte: "bg-primary/10 text-primary border-primary/30",
    Planificación: "bg-muted text-muted-foreground border-muted",
  };

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin alertas ✓</p>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-xs rounded border p-2">
          <Badge variant="outline" className={`text-[10px] shrink-0 ${tipoColors[a.tipo] || ""}`}>
            {a.tipo}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{a.entidad}</p>
            <p className="text-muted-foreground">{a.descripcion}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{a.fecha}</p>
          </div>
          {showMarkReviewed && onMarkReviewed && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0" onClick={() => onMarkReviewed(i)}>
              Revisada
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
