import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import type { EntidadOption } from "@/pages/GestionFinancieraPage";

interface Contrato {
  id: string;
  entidad_id: string;
  nombre_contratado: string;
  numero_contrato: string | null;
  tipo: string;
  objeto: string | null;
  monto: number | null;
  moneda: string | null;
  estado: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  producto_entregable: string | null;
  fecha_vencimiento_producto: string | null;
  estado_situacional: string | null;
  monto_pagado_pen: number | null;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isVencido(fecha: string | null): boolean {
  if (!fecha) return false;
  return new Date(fecha) < new Date();
}

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  en_proceso: { label: "En proceso", className: "bg-primary/15 text-primary" },
  finalizado: { label: "Finalizado", className: "bg-success/15 text-success" },
  pendiente: { label: "Pendiente", className: "bg-warning/15 text-warning" },
  cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive" },
};

export function TabContratos({ entidades }: { entidades: EntidadOption[] }) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filtroEntidad, setFiltroEntidad] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q = (supabase as any).from("contratos").select("*").order("nombre_contratado");
    if (filtroEntidad !== "todas") q = q.eq("entidad_id", filtroEntidad);
    if (filtroEstado !== "todos") q = q.eq("estado", filtroEstado);
    q.then(({ data }: any) => {
      setContratos(data || []);
      setLoading(false);
    });
  }, [filtroEntidad, filtroEstado]);

  const entidadName = (id: string) => entidades.find((e) => e.id === id)?.nombre_corto ?? "—";
  const vencidos = contratos.filter((c) => c.estado === "en_proceso" && isVencido(c.fecha_vencimiento_producto));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {vencidos.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {vencidos.length} contrato{vencidos.length > 1 ? "s" : ""} con producto vencido
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex gap-2 ml-auto">
          <Select value={filtroEntidad} onValueChange={setFiltroEntidad}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Entidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las entidades</SelectItem>
              {entidades.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contratos ({contratos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
          ) : contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin contratos</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contratado</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Vence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c) => {
                    const vencido = c.estado === "en_proceso" && isVencido(c.fecha_vencimiento_producto);
                    const est = ESTADO_LABELS[c.estado || "en_proceso"] ?? ESTADO_LABELS.en_proceso;
                    return (
                      <TableRow key={c.id} className={vencido ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs font-medium max-w-[160px] truncate">{c.nombre_contratado}</TableCell>
                        <TableCell className="text-xs">{entidadName(c.entidad_id)}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{c.objeto ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {c.moneda === "PEN" ? "S/" : "$"}{fmt(c.monto)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${est.className}`}>{est.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate">{c.producto_entregable ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {c.fecha_vencimiento_producto ? (
                            <span className={vencido ? "text-destructive font-medium" : ""}>
                              {vencido && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                              {c.fecha_vencimiento_producto}
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
