import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, X } from "lucide-react";
import { downloadCSV, formatCurrency, TRIMESTRES_MESES } from "@/lib/reportUtils";
import type { EntidadOption } from "@/contexts/RoleContext";

interface Props {
  entidadId: string | null;
  trimestre: string;
  anio: number;
  entidades: EntidadOption[];
  onClose: () => void;
}

export default function ReporteTrimestralFinanciero({ entidadId, trimestre, anio, entidades, onClose }: Props) {
  const [gastos, setGastos] = useState<any[]>([]);
  const [desembolsos, setDesembolsos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const entidadNombre = entidades.find((e) => e.id === entidadId)?.nombre_corto || "Consolidado";
  const meses = TRIMESTRES_MESES[trimestre] || [1, 2, 3];

  useEffect(() => {
    fetchData();
  }, [entidadId, trimestre, anio]);

  async function fetchData() {
    setLoading(true);

    // Get registro IDs for the quarter
    let regQuery = (supabase as any)
      .from("registros_mensuales")
      .select("id, entidad_id")
      .eq("anio", anio)
      .in("mes", meses);
    if (entidadId && entidadId !== "consolidado") regQuery = regQuery.eq("entidad_id", entidadId);
    const { data: regs } = await regQuery;
    const regIds = (regs || []).map((r: any) => r.id);

    if (regIds.length > 0) {
      const { data: gastosData } = await (supabase as any)
        .from("ejecucion_financiera")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setGastos(gastosData || []);
    } else {
      setGastos([]);
    }

    // Desembolsos
    let desQuery = (supabase as any).from("desembolsos").select("*");
    if (entidadId && entidadId !== "consolidado") desQuery = desQuery.eq("entidad_id", entidadId);
    const { data: desData } = await desQuery;
    setDesembolsos(desData || []);

    // Contratos
    let contQuery = (supabase as any).from("contratos").select("*");
    if (entidadId && entidadId !== "consolidado") contQuery = contQuery.eq("entidad_id", entidadId);
    const { data: contData } = await contQuery;
    setContratos(contData || []);

    setLoading(false);
  }

  const gastosSeco = gastos.filter((g) => g.fuente === "cofinanciamiento_seco");
  const gastosCM = gastos.filter((g) => g.fuente === "contrapartida_monetaria");
  const gastosCNM = gastos.filter((g) => g.fuente === "contrapartida_no_monetaria");
  const noData = gastos.length === 0 && desembolsos.length === 0 && contratos.length === 0 && !loading;

  function handleDownload() {
    downloadCSV(gastos.map((g) => ({
      Actividad: g.actividades?.codigo || "",
      Fuente: g.fuente,
      Tipo_Gasto: g.tipo_gasto || "",
      Monto: g.monto,
      Fecha: g.fecha_gasto || "",
      Comprobante: g.comprobante_ref || "",
    })), `reporte_trimestral_financiero_${entidadNombre}_${trimestre}_${anio}.csv`);
  }

  function renderGastosTable(data: any[], title: string) {
    if (data.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Sin gastos registrados</p>;
    const total = data.reduce((s, g) => s + (g.monto || 0), 0);
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actividad</TableHead>
                <TableHead>Tipo gasto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Comprobante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="text-xs">{g.actividades?.codigo} - {g.actividades?.nombre}</TableCell>
                  <TableCell className="text-xs">{g.tipo_gasto || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(g.monto)}</TableCell>
                  <TableCell className="text-xs">{g.fecha_gasto || "—"}</TableCell>
                  <TableCell className="text-xs">{g.comprobante_ref || "—"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">ANEXO 9: REPORTE FINANCIERO TRIMESTRAL</h2>
          <p className="text-muted-foreground">{entidadNombre} — {trimestre} {anio}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={noData}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Cargando datos...</p>
        ) : noData ? (
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No hay registros para este período. Las entidades deben completar sus registros mensuales para que este reporte se genere automáticamente.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="seco" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="seco">Ejecución SECO</TabsTrigger>
              <TabsTrigger value="desembolsos">Desembolsos</TabsTrigger>
              <TabsTrigger value="detalle">Detalle Gastos</TabsTrigger>
              <TabsTrigger value="cm">Contrapartida Monetaria</TabsTrigger>
              <TabsTrigger value="cnm">Contrapartida No Monetaria</TabsTrigger>
              <TabsTrigger value="contratos">Contratos</TabsTrigger>
            </TabsList>

            <TabsContent value="seco">{renderGastosTable(gastosSeco, "SECO")}</TabsContent>
            <TabsContent value="desembolsos">
              {desembolsos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin desembolsos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Remesa</TableHead>
                        <TableHead className="text-right">Monto USD</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {desembolsos.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>Remesa {d.numero_remesa}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(d.monto_usd)}</TableCell>
                          <TableCell>{d.fecha_desembolso || "—"}</TableCell>
                          <TableCell>{d.estado || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="detalle">{renderGastosTable(gastos, "Todos")}</TabsContent>
            <TabsContent value="cm">{renderGastosTable(gastosCM, "CM")}</TabsContent>
            <TabsContent value="cnm">{renderGastosTable(gastosCNM, "CNM")}</TabsContent>
            <TabsContent value="contratos">
              {contratos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin contratos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contratado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratos.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.nombre_contratado}</TableCell>
                          <TableCell>{c.tipo}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(c.monto)}</TableCell>
                          <TableCell>{c.fecha_inicio || "—"}</TableCell>
                          <TableCell>{c.fecha_fin || "—"}</TableCell>
                          <TableCell>{c.estado || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
