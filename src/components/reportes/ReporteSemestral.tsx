import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, X } from "lucide-react";
import { downloadCSV, formatCurrency, SEMESTRES_MESES } from "@/lib/reportUtils";
import type { EntidadOption } from "@/contexts/RoleContext";

interface Props {
  entidadId: string | null;
  semestre: string;
  anio: number;
  entidades: EntidadOption[];
  onClose: () => void;
}

export default function ReporteSemestral({ entidadId, semestre, anio, entidades, onClose }: Props) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [empleo, setEmpleo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const entidadNombre = entidades.find((e) => e.id === entidadId)?.nombre_corto || "Consolidado";
  const meses = SEMESTRES_MESES[semestre] || [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    fetchData();
  }, [entidadId, semestre, anio]);

  async function fetchData() {
    setLoading(true);

    let regQuery = (supabase as any)
      .from("registros_mensuales")
      .select("*, actividades!inner(codigo, nombre)")
      .eq("anio", anio)
      .in("mes", meses);
    if (entidadId && entidadId !== "consolidado") regQuery = regQuery.eq("entidad_id", entidadId);
    const { data: regData } = await regQuery;
    setRegistros(regData || []);

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

    // Impact indicators
    let empQuery = (supabase as any).from("reporte_empleo").select("*").eq("anio", anio);
    if (entidadId && entidadId !== "consolidado") empQuery = empQuery.eq("entidad_id", entidadId);
    const { data: empData } = await empQuery;
    setEmpleo(empData || []);

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
    }));
    downloadCSV(rows, `reporte_semestral_${entidadNombre}_${semestre}_${anio}.csv`);
  }

  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">INFORME SEMESTRAL</h2>
          <p className="text-muted-foreground">{entidadNombre} — {semestre} {anio}</p>
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
            {/* Financial summary */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Resumen Financiero del Semestre</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">SECO</p>
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

            {/* Activities */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Avance Operativo ({registros.length} registros)</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead className="text-right">Avance</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.slice(0, 20).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.actividades?.codigo}</TableCell>
                        <TableCell className="text-sm">{r.actividades?.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{r.avance_valor ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.estado || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Impact indicators */}
            {empleo.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">Indicadores de Impacto — Empleo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Empleos creados</p>
                    <p className="text-lg font-bold">{empleo.reduce((s, e) => s + (e.empleos_creados_total || 0), 0)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Empleos retenidos</p>
                    <p className="text-lg font-bold">{empleo.reduce((s, e) => s + (e.empleos_retenidos_total || 0), 0)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Empleos mejorados</p>
                    <p className="text-lg font-bold">{empleo.reduce((s, e) => s + (e.empleos_mejorados_total || 0), 0)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total empleos</p>
                    <p className="text-lg font-bold">{empleo.reduce((s, e) => s + (e.total_empleos || 0), 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
