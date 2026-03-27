import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, X } from "lucide-react";
import { downloadCSV, formatCurrency, MESES_NOMBRE } from "@/lib/reportUtils";
import type { EntidadOption } from "@/contexts/RoleContext";
import AIAnalysisCard from "./AIAnalysisCard";

interface Props {
  entidadId: string | null;
  mes: number;
  anio: number;
  entidades: EntidadOption[];
  onClose: () => void;
}

export default function ReporteMensualPreview({ entidadId, mes, anio, entidades, onClose }: Props) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const entidadNombre = entidades.find((e) => e.id === entidadId)?.nombre_corto || "Consolidado";

  useEffect(() => {
    fetchData();
  }, [entidadId, mes, anio]);

  async function fetchData() {
    setLoading(true);
    let regQuery = (supabase as any)
      .from("registros_mensuales")
      .select("*, actividades!inner(codigo, nombre)")
      .eq("anio", anio)
      .eq("mes", mes);

    if (entidadId && entidadId !== "consolidado") {
      regQuery = regQuery.eq("entidad_id", entidadId);
    }

    const { data: regData } = await regQuery;
    setRegistros(regData || []);

    // Fetch gastos for the month's registros
    const regIds = (regData || []).map((r: any) => r.id);
    if (regIds.length > 0) {
      const { data: gastosData } = await (supabase as any)
        .from("ejecucion_financiera")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setGastos(gastosData || []);
    } else {
      setGastos([]);
    }

    setLoading(false);
  }

  const totalSeco = gastos.filter((g) => g.fuente === "cofinanciamiento_seco").reduce((s: number, g: any) => s + (g.monto || 0), 0);
  const totalCM = gastos.filter((g) => g.fuente === "contrapartida_monetaria").reduce((s: number, g: any) => s + (g.monto || 0), 0);
  const totalCNM = gastos.filter((g) => g.fuente === "contrapartida_no_monetaria").reduce((s: number, g: any) => s + (g.monto || 0), 0);

  const noData = registros.length === 0 && !loading;

  function handleDownload() {
    const rows = registros.map((r: any) => ({
      Codigo: r.actividades?.codigo || "",
      Actividad: r.actividades?.nombre || "",
      Avance: r.avance_valor ?? "",
      Estado: r.estado || "",
      Descripcion: r.descripcion_avance || "",
    }));
    downloadCSV(rows, `reporte_mensual_${entidadNombre}_${MESES_NOMBRE[mes - 1]}_${anio}.csv`);
  }

  return (
    <Card className="border-2 print:border-0">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="bg-card p-6 border-b">
          <h2 className="text-xl font-bold text-foreground">
            INFORME MENSUAL DE AVANCE
          </h2>
          <p className="text-muted-foreground">{entidadNombre} — {MESES_NOMBRE[mes - 1]} {anio}</p>
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
            {/* Section 1: Summary */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Sección 1: Resumen del período</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Actividades con avance</p>
                  <p className="text-lg font-bold">{registros.filter((r: any) => r.avance_valor > 0).length} de {registros.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Ejecución SECO</p>
                  <p className="text-lg font-bold">{formatCurrency(totalSeco)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Contrapartida Monetaria</p>
                  <p className="text-lg font-bold">{formatCurrency(totalCM)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Contrapartida No Monetaria</p>
                  <p className="text-lg font-bold">{formatCurrency(totalCNM)}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Detail by activity */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Sección 2: Detalle por actividad</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead className="text-right">Avance</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.actividades?.codigo}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.actividades?.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{r.avance_valor ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.estado || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.descripcion_avance || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Section 3: Financial detail */}
            {gastos.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Sección 3: Detalle financiero</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Actividad</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead>Tipo gasto</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Comprobante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastos.map((g: any) => (
                        <TableRow key={g.id}>
                          <TableCell className="text-xs">{g.actividades?.codigo}</TableCell>
                          <TableCell className="text-xs">{g.fuente?.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-xs">{g.tipo_gasto || "—"}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(g.monto)}</TableCell>
                          <TableCell className="text-xs">{g.fecha_gasto || "—"}</TableCell>
                          <TableCell className="text-xs">{g.comprobante_ref || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
