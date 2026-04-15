import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, Loader2 } from "lucide-react";
import { DetailPanel } from "./DetailPanel";
import { useIndicadoresActividades, type FiltrosIndicadores, type ResultadoIntermedio, type ActividadIndicador } from "@/hooks/useIndicadoresActividades";

const SEMAFORO = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚪" };
const SEMAFORO_BG = {
  verde: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amarillo: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  rojo: "bg-destructive/10 text-destructive",
  gris: "bg-muted text-muted-foreground",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

interface Props {
  filtros: FiltrosIndicadores;
  className?: string;
}

export default function ArbolIndicadoresActividades({ filtros, className }: Props) {
  const { data: resultados, isLoading, error } = useIndicadoresActividades(filtros);
  const [expandedRIs, setExpandedRIs] = useState<Set<string>>(new Set());
  const [actPanel, setActPanel] = useState<ActividadIndicador | null>(null);

  // Auto-expand RIs with rojo semaforo on first load
  const getExpanded = (ri: ResultadoIntermedio) => {
    if (expandedRIs.size === 0 && ri.semaforo === "rojo") return true;
    return expandedRIs.has(ri.codigo);
  };

  const toggleRI = (codigo: string) => {
    setExpandedRIs(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando indicadores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive text-sm">
        Error al cargar indicadores. Intente nuevamente.
      </div>
    );
  }

  if (!resultados || resultados.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No se encontraron datos para los filtros seleccionados.
            </p>
            <p className="text-xs text-muted-foreground">
              Datos disponibles: APPCACAO (T4 2025), CANATUR (T4 2025), MARKAHUAMACHUCO (T4 2025)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {resultados.map(ri => {
        const isExpanded = getExpanded(ri);
        return (
          <Card key={ri.codigo}>
            <CardHeader className="pb-0 cursor-pointer" onClick={() => toggleRI(ri.codigo)}>
              <div className="flex items-center gap-3">
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
                <span className="text-lg">{SEMAFORO[ri.semaforo]}</span>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">{ri.codigo}</Badge>
                    <span className="truncate">{ri.descripcion}</span>
                  </CardTitle>
                </div>
                <Badge className={`text-[10px] shrink-0 ${SEMAFORO_BG[ri.semaforo]}`}>
                  {ri.totalActividades} act.
                </Badge>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-3">
                {ri.sinPlanificacion && (
                  <Badge variant="outline" className="mb-2 text-[10px] bg-yellow-500/10 text-yellow-700">
                    Planificación pendiente de carga
                  </Badge>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[80px]">Código</TableHead>
                        <TableHead className="text-xs">Actividad</TableHead>
                        <TableHead className="text-xs">Entidad</TableHead>
                        <TableHead className="text-xs text-right">Avance</TableHead>
                        <TableHead className="text-xs text-right">Meta</TableHead>
                        <TableHead className="text-xs text-right">Ejec. USD</TableHead>
                        <TableHead className="text-xs text-center w-[50px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ri.actividades.map(act => (
                        <TableRow
                          key={`${act.entidad_codigo}-${act.actividad_codigo}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setActPanel(act)}
                        >
                          <TableCell className="font-mono text-xs text-primary">{act.actividad_codigo}</TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate">{act.actividad_descripcion}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{act.entidad_nombre || act.entidad_codigo}</TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {act.avance_tecnico_trimestre != null ? fmt(act.avance_tecnico_trimestre) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {act.meta_total != null ? `${fmt(act.meta_total)} ${act.unidad_medida || ""}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {act.ejecutado_seco_total != null ? fmt(act.ejecutado_seco_total) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span title={act.semaforo}>{SEMAFORO[act.semaforo]}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Activity detail panel */}
      <DetailPanel
        open={!!actPanel}
        onClose={() => setActPanel(null)}
        title={`${actPanel?.actividad_codigo || ""} — Detalle`}
      >
        {actPanel && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{actPanel.actividad_descripcion}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {actPanel.entidad_nombre || actPanel.entidad_codigo}
                {actPanel.producto_codigo && ` · Producto ${actPanel.producto_codigo}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avance técnico</p>
                <p className="text-lg font-bold mt-1">
                  {actPanel.avance_tecnico_trimestre != null ? fmt(actPanel.avance_tecnico_trimestre) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  de {actPanel.meta_total != null ? `${fmt(actPanel.meta_total)} ${actPanel.unidad_medida || ""}` : "sin meta"}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ejecución SECO</p>
                <p className="text-lg font-bold mt-1">
                  USD {actPanel.ejecutado_seco_total != null ? fmt(actPanel.ejecutado_seco_total) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  de {actPanel.presupuesto_seco_usd != null ? `USD ${fmt(actPanel.presupuesto_seco_usd)}` : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span>Estado: {SEMAFORO[actPanel.semaforo]}</span>
              <Badge className={SEMAFORO_BG[actPanel.semaforo]}>{actPanel.semaforo}</Badge>
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
