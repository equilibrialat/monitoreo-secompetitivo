import { useState } from "react";
import { ChevronDown, ChevronRight, History, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ESTADO_LABELS, type ReasignacionPresupuestal } from "@/lib/reasignacionesPresupuestales";

interface Props {
  reasignaciones: ReasignacionPresupuestal[];
}

export default function HistorialReasignaciones({ reasignaciones }: Props) {
  const [open, setOpen] = useState(false);

  const aprobadas = reasignaciones
    .filter(r => r.estado === "aprobada")
    .sort((a, b) => (b.fecha_aprobacion || b.fecha_solicitud).localeCompare(a.fecha_aprobacion || a.fecha_solicitud));

  const pendientes = reasignaciones.filter(r =>
    r.estado === "pendiente_coordinador" || r.estado === "pendiente_ivan"
  );

  return (
    <div className="border rounded-md mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Historial de reasignaciones</span>
        <Badge variant="secondary" className="ml-2 text-[10px]">{aprobadas.length} aprobadas</Badge>
        {pendientes.length > 0 && (
          <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">
            {pendientes.length} pendientes
          </Badge>
        )}
      </button>

      {open && (
        <div className="p-3 border-t">
          {reasignaciones.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Aún no se han registrado reasignaciones para esta entidad.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] h-8">Fecha</TableHead>
                    <TableHead className="text-[11px] h-8">Origen → Destino</TableHead>
                    <TableHead className="text-[11px] h-8 text-right">Monto USD</TableHead>
                    <TableHead className="text-[11px] h-8 text-right">% Var</TableHead>
                    <TableHead className="text-[11px] h-8">Estado</TableHead>
                    <TableHead className="text-[11px] h-8">Aprobado por</TableHead>
                    <TableHead className="text-[11px] h-8">Comentarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...aprobadas, ...reasignaciones.filter(r => r.estado !== "aprobada")].map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-[11px] py-1.5">
                        {new Date(r.fecha_aprobacion || r.fecha_solicitud).toLocaleDateString("es-PE")}
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5">
                        <span className="font-mono">{r.actividad_origen_codigo}</span>
                        <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                        <span className="font-mono">{r.actividad_destino_codigo}</span>
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5 text-right font-mono">
                        ${Number(r.monto_usd).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5 text-right">
                        {r.pct_variacion ? `${Number(r.pct_variacion).toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {ESTADO_LABELS[r.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5">
                        {r.ivan_nombre || r.coordinador_nombre || "—"}
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5 max-w-[200px] truncate" title={[r.comentario_coordinador, r.comentario_ivan].filter(Boolean).join(" / ")}>
                        {[r.comentario_coordinador, r.comentario_ivan].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
