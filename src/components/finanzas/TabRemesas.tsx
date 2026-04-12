import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingDown } from "lucide-react";
import type { EntidadOption } from "@/pages/GestionFinancieraPage";

interface Remesa {
  id: string;
  numero: string;
  entidad_id: string;
  fecha_desembolso: string | null;
  monto_usd: number;
  monto_pen: number;
  tipo_cambio: number | null;
  periodo_liquidacion: string | null;
  liquidado_usd: number | null;
  liquidado_pen: number | null;
  saldo_pendiente_usd: number;
  saldo_pendiente_pen: number;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TabRemesas({ entidades }: { entidades: EntidadOption[] }) {
  const [remesas, setRemesas] = useState<Remesa[]>([]);
  const [filtroEntidad, setFiltroEntidad] = useState("todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q = (supabase as any).from("remesas_proyecto").select("*").order("fecha_desembolso", { ascending: true });
    if (filtroEntidad !== "todas") q = q.eq("entidad_id", filtroEntidad);
    q.then(({ data }: any) => {
      setRemesas(data || []);
      setLoading(false);
    });
  }, [filtroEntidad]);

  const entidadName = (id: string) => entidades.find((e) => e.id === id)?.nombre_corto ?? "—";

  const totalUSD = remesas.reduce((s, r) => s + (r.monto_usd || 0), 0);
  const totalSaldoUSD = remesas.reduce((s, r) => s + (r.saldo_pendiente_usd || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4">
          <Card className="min-w-[180px]">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total desembolsado</p>
                <p className="text-lg font-bold">${fmt(totalUSD)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[180px]">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                <p className="text-lg font-bold text-warning">${fmt(totalSaldoUSD)}</p>
              </div>
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
          <CardTitle className="text-base">Remesas del Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
          ) : remesas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin remesas registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto USD</TableHead>
                  <TableHead className="text-right">Monto PEN</TableHead>
                  <TableHead className="text-right">T/C</TableHead>
                  <TableHead>Periodo Liq.</TableHead>
                  <TableHead className="text-right">Liquidado USD</TableHead>
                  <TableHead className="text-right">Saldo USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remesas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.numero}</TableCell>
                    <TableCell className="text-xs">{entidadName(r.entidad_id)}</TableCell>
                    <TableCell className="text-xs">{r.fecha_desembolso ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">${fmt(r.monto_usd)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">S/{fmt(r.monto_pen)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.tipo_cambio ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.periodo_liquidacion ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">${fmt(r.liquidado_usd)}</TableCell>
                    <TableCell className="text-right">
                      {(r.saldo_pendiente_usd || 0) > 0 ? (
                        <Badge className="bg-warning/15 text-warning text-[10px]">${fmt(r.saldo_pendiente_usd)}</Badge>
                      ) : (
                        <Badge className="bg-success/15 text-success text-[10px]">Liquidado</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
