import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import {
  PeriodSelector, usePeriodSelector, Semaforo, EmptyState, DownloadButton,
  Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatCurrency, Badge
} from "@/components/reportes/ReportShell";
import { TRIMESTRES_MESES, SEMESTRES_MESES } from "@/lib/reportUtils";

type PeriodType = "trimestral" | "semestral" | "anual";

export default function ReportesFinancierosPage() {
  const { entidades } = useRole();
  const ps = usePeriodSelector();
  const [periodType, setPeriodType] = useState<PeriodType>("trimestral");
  const [resumen, setResumen] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [desembolsos, setDesembolsos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getMeses = () => {
    if (periodType === "trimestral") return TRIMESTRES_MESES[ps.trimestre] || [];
    if (periodType === "semestral") return SEMESTRES_MESES[ps.semestre] || [];
    return [1,2,3,4,5,6,7,8,9,10,11,12];
  };
  const getAnio = () => parseInt(periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual);

  useEffect(() => {
    loadData();
  }, [periodType, ps.trimestre, ps.anioTrimestral, ps.semestre, ps.anioSemestral, ps.anioAnual]);

  async function loadData() {
    setLoading(true);
    const meses = getMeses();
    const anio = getAnio();

    // Dashboard view for summary
    const { data: dashboard } = await (supabase as any).from("v_dashboard_entidad").select("*");
    setResumen(dashboard || []);

    // Gastos
    const { data: ef } = await (supabase as any)
      .from("ejecucion_financiera")
      .select("*, actividades(codigo, nombre), entidades(nombre_corto)")
      .eq("registro_mensual_id", undefined); // We need to join through registros_mensuales

    // Get gastos through registros_mensuales
    const { data: rm } = await (supabase as any)
      .from("registros_mensuales")
      .select("id")
      .eq("anio", anio)
      .in("mes", meses);
    const rmIds = (rm || []).map((r: any) => r.id);

    if (rmIds.length > 0) {
      const { data: gastosData } = await (supabase as any)
        .from("ejecucion_financiera")
        .select("*, actividades(codigo, nombre), entidades(nombre_corto)")
        .in("registro_mensual_id", rmIds);
      setGastos(gastosData || []);
    } else {
      setGastos([]);
    }

    // Desembolsos
    const { data: desData } = await (supabase as any)
      .from("desembolsos")
      .select("*, entidades(nombre_corto, mecanismo)");
    setDesembolsos(desData || []);

    // Contratos
    const { data: contData } = await (supabase as any)
      .from("contratos")
      .select("*, entidades(nombre_corto)")
      .in("estado", ["vigente", "en_proceso"]);
    setContratos(contData || []);

    setLoading(false);
  }

  const periodoLabel = periodType === "trimestral" ? `${ps.trimestre} ${ps.anioTrimestral}` : periodType === "semestral" ? `${ps.semestre} ${ps.anioSemestral}` : ps.anioAnual;

  // Calculate IGV by entity
  const igvByEntidad = gastos.reduce((acc: any, g: any) => {
    const eid = g.entidad_id;
    if (!acc[eid]) acc[eid] = { entidad: g.entidades?.nombre_corto || eid, total_igv: 0, count: 0 };
    acc[eid].total_igv += g.monto_igv || 0;
    acc[eid].count++;
    return acc;
  }, {});

  // Resumen for CSV
  const resumenCSV = resumen.map((r: any) => ({
    Entidad: r.nombre_corto, Mecanismo: r.mecanismo,
    "Presupuesto SECO": r.presupuesto_seco_total, "Ejecutado SECO": r.ejecutado_seco_total,
    "% SECO": r.pct_ejecucion_seco, "Presupuesto CM": r.presupuesto_cm_total,
    "Ejecutado CM": r.ejecutado_cm_total, "Presupuesto CNM": r.presupuesto_cnm_total,
    "Ejecutado CNM": r.ejecutado_cnm_total, Sobregiros: r.sobregiros_seco,
  }));

  const gastosCSV = gastos.map((g: any) => ({
    Entidad: g.entidades?.nombre_corto, Actividad: g.actividades?.nombre,
    Fuente: g.fuente, "Tipo gasto": g.tipo_gasto, Monto: g.monto,
    Fecha: g.fecha_gasto, Comprobante: g.comprobante_ref,
  }));

  const diasRestantes = (fecha: string | null) => {
    if (!fecha) return null;
    const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes Financieros</h1>
          <p className="text-muted-foreground">Consolidado financiero del programa</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              {(["trimestral", "semestral", "anual"] as PeriodType[]).map(t => (
                <Badge key={t} variant={periodType === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setPeriodType(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Badge>
              ))}
            </div>
            <PeriodSelector
              label="Período"
              type={periodType === "trimestral" ? "trimestre" : periodType === "semestral" ? "semestre" : "anual"}
              value={periodType === "trimestral" ? ps.trimestre : periodType === "semestral" ? ps.semestre : ps.anioAnual}
              onChange={periodType === "trimestral" ? ps.setTrimestre : periodType === "semestral" ? ps.setSemestre : ps.setAnioAnual}
              anio={periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual}
              onAnioChange={periodType === "trimestral" ? ps.setAnioTrimestral : periodType === "semestral" ? ps.setAnioSemestral : ps.setAnioAnual}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="resumen">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="resumen">Resumen por Entidad</TabsTrigger>
              <TabsTrigger value="gastos">Detalle de Gastos</TabsTrigger>
              <TabsTrigger value="desembolsos">Estado Desembolsos</TabsTrigger>
              <TabsTrigger value="contratos">Contratos Vigentes</TabsTrigger>
              <TabsTrigger value="igv">IGV</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Resumen Financiero — {periodoLabel}</h3>
                <DownloadButton data={resumenCSV} filename={`resumen_financiero_${periodoLabel}.csv`} />
              </div>
              {resumen.length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entidad</TableHead>
                        <TableHead>Mec.</TableHead>
                        <TableHead className="text-right">Ppto SECO</TableHead>
                        <TableHead className="text-right">Ejec. SECO</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Ppto CM</TableHead>
                        <TableHead className="text-right">Ejec. CM</TableHead>
                        <TableHead className="text-right">Ppto CNM</TableHead>
                        <TableHead className="text-right">Ejec. CNM</TableHead>
                        <TableHead className="text-center">Sobregiros</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumen.map((r: any) => {
                        const desfase = Math.abs((r.pct_ejecucion_seco || 0) - 50);
                        return (
                          <TableRow key={r.entidad_id}>
                            <TableCell className="font-medium">{r.nombre_corto}</TableCell>
                            <TableCell>{r.mecanismo}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.presupuesto_seco_total)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.ejecutado_seco_total)}</TableCell>
                            <TableCell className="text-right">{(r.pct_ejecucion_seco || 0).toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.presupuesto_cm_total)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.ejecutado_cm_total)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.presupuesto_cnm_total)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.ejecutado_cnm_total)}</TableCell>
                            <TableCell className="text-center">{r.sobregiros_seco || 0}</TableCell>
                            <TableCell className="text-center"><Semaforo value={desfase} /></TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={2}>TOTALES</TableCell>
                        <TableCell className="text-right">{formatCurrency(resumen.reduce((s: number, r: any) => s + (r.presupuesto_seco_total || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(resumen.reduce((s: number, r: any) => s + (r.ejecutado_seco_total || 0), 0))}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">{formatCurrency(resumen.reduce((s: number, r: any) => s + (r.presupuesto_cm_total || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(resumen.reduce((s: number, r: any) => s + (r.ejecutado_cm_total || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(resumen.reduce((s: number, r: any) => s + (r.presupuesto_cnm_total || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(resumen.reduce((s: number, r: any) => s + (r.ejecutado_cnm_total || 0), 0))}</TableCell>
                        <TableCell className="text-center">{resumen.reduce((s: number, r: any) => s + (r.sobregiros_seco || 0), 0)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gastos">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Detalle de Gastos — {periodoLabel}</h3>
                <DownloadButton data={gastosCSV} filename={`gastos_${periodoLabel}.csv`} />
              </div>
              {gastos.length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entidad</TableHead>
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
                          <TableCell>{g.entidades?.nombre_corto}</TableCell>
                          <TableCell>{g.actividades?.codigo} — {g.actividades?.nombre}</TableCell>
                          <TableCell>{g.fuente}</TableCell>
                          <TableCell>{g.tipo_gasto || "—"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(g.monto)}</TableCell>
                          <TableCell>{g.fecha_gasto || "—"}</TableCell>
                          <TableCell>{g.comprobante_ref || "—"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={4}>TOTAL</TableCell>
                        <TableCell className="text-right">{formatCurrency(gastos.reduce((s: number, g: any) => s + (g.monto || 0), 0))}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="desembolsos">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Estado de Desembolsos (Mec B) — {periodoLabel}</h3>
                <DownloadButton data={desembolsos.filter((d: any) => d.entidades?.mecanismo === "mec_b").map((d: any) => ({
                  Entidad: d.entidades?.nombre_corto, Remesa: d.numero_remesa, "Monto USD": d.monto_usd,
                  TC: d.tipo_cambio, "Monto PEN": d.monto_pen, Fecha: d.fecha_desembolso,
                  Trimestre: d.trimestre_vinculado, Estado: d.estado,
                }))} filename={`desembolsos_${periodoLabel}.csv`} />
              </div>
              {desembolsos.filter((d: any) => d.entidades?.mecanismo === "mec_b").length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entidad</TableHead>
                        <TableHead>Remesa</TableHead>
                        <TableHead className="text-right">Monto USD</TableHead>
                        <TableHead className="text-right">TC</TableHead>
                        <TableHead className="text-right">Monto PEN</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Trimestre</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {desembolsos.filter((d: any) => d.entidades?.mecanismo === "mec_b").map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.entidades?.nombre_corto}</TableCell>
                          <TableCell>{d.numero_remesa}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.monto_usd)}</TableCell>
                          <TableCell className="text-right">{d.tipo_cambio || "—"}</TableCell>
                          <TableCell className="text-right">{d.monto_pen ? formatCurrency(d.monto_pen) : "—"}</TableCell>
                          <TableCell>{d.fecha_desembolso || "—"}</TableCell>
                          <TableCell>{d.trimestre_vinculado || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{d.estado}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contratos">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Contratos Vigentes — {periodoLabel}</h3>
                <DownloadButton data={contratos.map((c: any) => ({
                  Entidad: c.entidades?.nombre_corto, Contrato: c.numero_contrato, Contratado: c.nombre_contratado,
                  Objeto: c.objeto, Monto: c.monto, "Fecha fin": c.fecha_fin, Estado: c.estado,
                }))} filename={`contratos_${periodoLabel}.csv`} />
              </div>
              {contratos.length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entidad</TableHead>
                        <TableHead>N° Contrato</TableHead>
                        <TableHead>Contratado</TableHead>
                        <TableHead>Objeto</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Fecha fin</TableHead>
                        <TableHead>Días rest.</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratos.map((c: any) => {
                        const dias = diasRestantes(c.fecha_fin);
                        return (
                          <TableRow key={c.id}>
                            <TableCell>{c.entidades?.nombre_corto}</TableCell>
                            <TableCell>{c.numero_contrato || "—"}</TableCell>
                            <TableCell>{c.nombre_contratado}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{c.objeto || "—"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
                            <TableCell>{c.fecha_fin || "—"}</TableCell>
                            <TableCell className="text-center">
                              {dias !== null ? (
                                <span>{dias}d {dias < 0 ? "🔴" : dias < 30 ? "🟡" : "🟢"}</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell><Badge variant="outline">{c.estado}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="igv">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Resumen IGV por Entidad — {periodoLabel}</h3>
                <DownloadButton data={Object.values(igvByEntidad).map((v: any) => ({ Entidad: v.entidad, "Total IGV": v.total_igv, "N° Gastos": v.count }))} filename={`igv_${periodoLabel}.csv`} />
              </div>
              {Object.keys(igvByEntidad).length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entidad</TableHead>
                        <TableHead className="text-right">Total IGV</TableHead>
                        <TableHead className="text-right">N° Gastos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(igvByEntidad).map((v: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{v.entidad}</TableCell>
                          <TableCell className="text-right">{formatCurrency(v.total_igv)}</TableCell>
                          <TableCell className="text-right">{v.count}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{formatCurrency((Object.values(igvByEntidad) as any[]).reduce((s: number, v: any) => s + v.total_igv, 0))}</TableCell>
                        <TableCell className="text-right">{(Object.values(igvByEntidad) as any[]).reduce((s: number, v: any) => s + v.count, 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
