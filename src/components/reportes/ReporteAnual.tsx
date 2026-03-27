import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, X } from "lucide-react";
import { downloadCSV, formatCurrency } from "@/lib/reportUtils";
import type { EntidadOption } from "@/contexts/RoleContext";
import AIAnalysisCard from "./AIAnalysisCard";

interface Props {
  entidadId: string | null;
  anio: number;
  entidades: EntidadOption[];
  onClose: () => void;
}

export default function ReporteAnual({ entidadId, anio, entidades, onClose }: Props) {
  const [actividades, setActividades] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const entidadNombre = entidades.find((e) => e.id === entidadId)?.nombre_corto || "Consolidado";

  useEffect(() => {
    fetchData();
  }, [entidadId, anio]);

  async function fetchData() {
    setLoading(true);

    // Activities
    let actQuery = (supabase as any)
      .from("actividades")
      .select("codigo, nombre, meta_valor, presupuesto_seco, presupuesto_contrapartida_monetaria, presupuesto_contrapartida_no_monetaria, ejecutado_seco_acum, ejecutado_cm_acum, ejecutado_cnm_acum, estado_actual, producto_id, productos!inner(codigo, nombre, resultados!inner(codigo, nombre))");
    if (entidadId && entidadId !== "consolidado") actQuery = actQuery.eq("entidad_id", entidadId);
    const { data: actData } = await actQuery;
    setActividades(actData || []);

    // Registros for the year
    let regQuery = (supabase as any)
      .from("registros_mensuales")
      .select("actividad_id, avance_valor, estado, id")
      .eq("anio", anio);
    if (entidadId && entidadId !== "consolidado") regQuery = regQuery.eq("entidad_id", entidadId);
    const { data: regData } = await regQuery;
    setRegistros(regData || []);

    // Financial
    const regIds = (regData || []).map((r: any) => r.id);
    if (regIds.length > 0) {
      const { data: gastosData } = await (supabase as any)
        .from("ejecucion_financiera")
        .select("fuente, monto")
        .in("registro_mensual_id", regIds);
      setGastos(gastosData || []);
    } else {
      setGastos([]);
    }

    setLoading(false);
  }

  const totalSecoEjec = gastos.filter((g) => g.fuente === "cofinanciamiento_seco").reduce((s: number, g: any) => s + (g.monto || 0), 0);
  const totalCMEjec = gastos.filter((g) => g.fuente === "contrapartida_monetaria").reduce((s: number, g: any) => s + (g.monto || 0), 0);
  const totalCNMEjec = gastos.filter((g) => g.fuente === "contrapartida_no_monetaria").reduce((s: number, g: any) => s + (g.monto || 0), 0);

  const totalSecoPres = actividades.reduce((s, a) => s + (a.presupuesto_seco || 0), 0);
  const totalCMPres = actividades.reduce((s, a) => s + (a.presupuesto_contrapartida_monetaria || 0), 0);
  const totalCNMPres = actividades.reduce((s, a) => s + (a.presupuesto_contrapartida_no_monetaria || 0), 0);

  const completadas = actividades.filter((a) => a.estado_actual === "completada").length;
  const noData = actividades.length === 0 && !loading;

  function handleDownload() {
    const rows = actividades.map((a) => ({
      Resultado: `${a.productos?.resultados?.codigo} - ${a.productos?.resultados?.nombre}`,
      Producto: `${a.productos?.codigo} - ${a.productos?.nombre}`,
      Codigo: a.codigo,
      Actividad: a.nombre,
      Meta: a.meta_valor ?? "",
      Presupuesto_SECO: a.presupuesto_seco ?? 0,
      Ejecutado_SECO: a.ejecutado_seco_acum ?? 0,
      Estado: a.estado_actual || "",
    }));
    downloadCSV(rows, `reporte_anual_${entidadNombre}_${anio}.csv`);
  }

  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">INFORME ANUAL</h2>
          <p className="text-muted-foreground">{entidadNombre} — {anio}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={noData}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Cargando datos...</p>
        ) : noData ? (
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No hay registros para este período. Las entidades deben completar sus registros mensuales para que este reporte se genere automáticamente.
            </p>
          </div>
        ) : (
          <>
            <AIAnalysisCard tipo="narrativa" datos={{ tipo_reporte: "anual", entidad: entidadNombre, anio, actividades: actividades.length, registros: registros.length }} label="Generar análisis IA" />
            {/* Executive summary */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Resumen Ejecutivo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total actividades</p>
                  <p className="text-lg font-bold">{actividades.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Completadas</p>
                  <p className="text-lg font-bold">{completadas}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Registros mensuales</p>
                  <p className="text-lg font-bold">{registros.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Ejecución total</p>
                  <p className="text-lg font-bold">{formatCurrency(totalSecoEjec + totalCMEjec + totalCNMEjec)}</p>
                </div>
              </div>
            </div>

            {/* Budget vs Execution */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Planificado vs Ejecutado por Fuente</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fuente</TableHead>
                      <TableHead className="text-right">Presupuesto</TableHead>
                      <TableHead className="text-right">Ejecutado</TableHead>
                      <TableHead className="text-right">% Ejecución</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: "Cofinanciamiento SECO", pres: totalSecoPres, ejec: totalSecoEjec },
                      { label: "Contrapartida Monetaria", pres: totalCMPres, ejec: totalCMEjec },
                      { label: "Contrapartida No Monetaria", pres: totalCNMPres, ejec: totalCNMEjec },
                    ].map((row) => {
                      const pct = row.pres > 0 ? ((row.ejec / row.pres) * 100).toFixed(0) : "—";
                      return (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(row.pres)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(row.ejec)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{pct}%</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(row.pres - row.ejec)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totalSecoPres + totalCMPres + totalCNMPres)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totalSecoEjec + totalCMEjec + totalCNMEjec)}</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono">
                        {formatCurrency((totalSecoPres + totalCMPres + totalCNMPres) - (totalSecoEjec + totalCMEjec + totalCNMEjec))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Activities table */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Detalle por Actividad</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead className="text-right">Meta</TableHead>
                      <TableHead className="text-right">Ppto SECO</TableHead>
                      <TableHead className="text-right">Ejec SECO</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actividades.slice(0, 30).map((a: any) => (
                      <TableRow key={a.codigo}>
                        <TableCell className="font-mono text-xs">{a.codigo}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{a.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{a.meta_valor ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(a.presupuesto_seco)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(a.ejecutado_seco_acum)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{a.estado_actual || "—"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
