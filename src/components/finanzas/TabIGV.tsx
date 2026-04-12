import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EntidadOption } from "@/pages/GestionFinancieraPage";

interface IGVRecord {
  id: string;
  entidad_id: string;
  numero: string | null;
  trimestre: string;
  igv_desembolsado_pen: number;
  igv_recuperado_pen: number;
  igv_pendiente_pen: number;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TabIGV({ entidades }: { entidades: EntidadOption[] }) {
  const [records, setRecords] = useState<IGVRecord[]>([]);
  const [filtroEntidad, setFiltroEntidad] = useState("todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q = (supabase as any).from("igv_control").select("*").order("trimestre");
    if (filtroEntidad !== "todas") q = q.eq("entidad_id", filtroEntidad);
    q.then(({ data }: any) => {
      setRecords(data || []);
      setLoading(false);
    });
  }, [filtroEntidad]);

  const entidadName = (id: string) => entidades.find((e) => e.id === id)?.nombre_corto ?? "—";

  const totalDesembolsado = records.reduce((s, r) => s + (r.igv_desembolsado_pen || 0), 0);
  const totalRecuperado = records.reduce((s, r) => s + (r.igv_recuperado_pen || 0), 0);
  const totalPendiente = records.reduce((s, r) => s + (r.igv_pendiente_pen || 0), 0);
  const pctRecuperado = totalDesembolsado > 0 ? (totalRecuperado / totalDesembolsado) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4">
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">IGV Desembolsado</p>
              <p className="text-lg font-bold">S/{fmt(totalDesembolsado)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">IGV Recuperado</p>
              <p className="text-lg font-bold text-success">S/{fmt(totalRecuperado)}</p>
              <p className="text-[10px] text-muted-foreground">{pctRecuperado.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">IGV Pendiente</p>
              <p className="text-lg font-bold text-warning">S/{fmt(totalPendiente)}</p>
            </CardContent>
          </Card>
        </div>
        <Select value={filtroEntidad} onValueChange={setFiltroEntidad}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las entidades</SelectItem>
            {entidades.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Control de IGV por Trimestre</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin registros de IGV</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Trimestre</TableHead>
                  <TableHead className="text-right">Desembolsado (PEN)</TableHead>
                  <TableHead className="text-right">Recuperado (PEN)</TableHead>
                  <TableHead className="text-right">Pendiente (PEN)</TableHead>
                  <TableHead>% Recuperación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const pct = r.igv_desembolsado_pen > 0
                    ? ((r.igv_recuperado_pen / r.igv_desembolsado_pen) * 100)
                    : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{entidadName(r.entidad_id)}</TableCell>
                      <TableCell className="text-xs font-mono">{r.trimestre}</TableCell>
                      <TableCell className="text-right font-mono text-xs">S/{fmt(r.igv_desembolsado_pen)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-success">S/{fmt(r.igv_recuperado_pen)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {(r.igv_pendiente_pen || 0) > 0 ? (
                          <Badge className="bg-warning/15 text-warning text-[10px]">S/{fmt(r.igv_pendiente_pen)}</Badge>
                        ) : (
                          <span className="text-success">S/0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted">
                            <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
