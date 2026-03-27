import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import {
  PeriodSelector, usePeriodSelector, Semaforo, EmptyState, DownloadButton,
  Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabsList, TabsTrigger, TabsContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatCurrency
} from "@/components/reportes/ReportShell";
import { TRIMESTRES_MESES, SEMESTRES_MESES } from "@/lib/reportUtils";

type PeriodType = "trimestral" | "semestral" | "anual";

export default function ReportesMecBPage() {
  const { entidades } = useRole();
  const ps = usePeriodSelector();
  const [periodType, setPeriodType] = useState<PeriodType>("trimestral");
  const [dashboard, setDashboard] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [empleo, setEmpleo] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const periodoLabel = periodType === "trimestral" ? `${ps.trimestre} ${ps.anioTrimestral}` : periodType === "semestral" ? `${ps.semestre} ${ps.anioSemestral}` : ps.anioAnual;
  const mecBEntidades = entidades.filter(e => e.tipo_entidad === "proyecto" || true); // filter later from dashboard

  useEffect(() => { loadData(); }, [periodType, ps.trimestre, ps.anioTrimestral, ps.semestre, ps.anioSemestral, ps.anioAnual]);

  async function loadData() {
    setLoading(true);
    const [d, ind, emp] = await Promise.all([
      (supabase as any).from("v_dashboard_entidad").select("*").eq("mecanismo", "mec_b"),
      (supabase as any).from("indicadores_proyecto").select("*, entidades(nombre_corto)"),
      (supabase as any).from("reporte_empleo").select("*, entidades(nombre_corto)"),
    ]);
    setDashboard(d.data || []);
    setIndicadores((ind.data || []).filter((i: any) => {
      const ent = (d.data || []).find((e: any) => e.entidad_id === i.entidad_id);
      return !!ent;
    }));
    setEmpleo(emp.data || []);

    // Gastos
    const meses = periodType === "trimestral" ? TRIMESTRES_MESES[ps.trimestre] : periodType === "semestral" ? SEMESTRES_MESES[ps.semestre] : [1,2,3,4,5,6,7,8,9,10,11,12];
    const anio = parseInt(periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual);
    const { data: rm } = await (supabase as any).from("registros_mensuales").select("id, entidad_id").eq("anio", anio).in("mes", meses);
    const mecBIds = (d.data || []).map((e: any) => e.entidad_id);
    const filteredRm = (rm || []).filter((r: any) => mecBIds.includes(r.entidad_id));
    if (filteredRm.length > 0) {
      const { data: g } = await (supabase as any).from("ejecucion_financiera").select("*, actividades(codigo, nombre), entidades(nombre_corto)").in("registro_mensual_id", filteredRm.map((r: any) => r.id));
      setGastos(g || []);
    } else setGastos([]);
    setLoading(false);
  }

  // Group by cadena de valor
  const byCdV = dashboard.reduce((acc: any, d: any) => {
    const cv = d.cadena_valor || "Sin CdV";
    if (!acc[cv]) acc[cv] = [];
    acc[cv].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes Mec B</h1>
          <p className="text-muted-foreground">Entidades Mecanismo B</p>
        </div>
      </div>

      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {(["trimestral", "semestral", "anual"] as PeriodType[]).map(t => (
              <Badge key={t} variant={periodType === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setPeriodType(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Badge>
            ))}
          </div>
          <PeriodSelector label="Período" type={periodType === "trimestral" ? "trimestre" : periodType === "semestral" ? "semestre" : "anual"}
            value={periodType === "trimestral" ? ps.trimestre : periodType === "semestral" ? ps.semestre : ps.anioAnual}
            onChange={periodType === "trimestral" ? ps.setTrimestre : periodType === "semestral" ? ps.setSemestre : ps.setAnioAnual}
            anio={periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual}
            onAnioChange={periodType === "trimestral" ? ps.setAnioTrimestral : periodType === "semestral" ? ps.setAnioSemestral : ps.setAnioAnual} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        <Tabs defaultValue="entidad">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="entidad">Avance por Entidad</TabsTrigger>
            <TabsTrigger value="cdv">Avance por CdV</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores por Proyecto</TabsTrigger>
            <TabsTrigger value="financiero">Detalle Financiero</TabsTrigger>
          </TabsList>

          <TabsContent value="entidad">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Avance por Entidad Mec B — {periodoLabel}</h3>
              <DownloadButton data={dashboard.map(d => ({ Entidad: d.nombre_corto, CdV: d.cadena_valor, Región: d.region, "Avance Op %": d.pct_ejecucion_seco, Sobregiros: d.sobregiros_seco }))} filename={`mec_b_entidades_${periodoLabel}.csv`} />
            </div>
            {dashboard.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>Entidad</TableHead><TableHead>CdV</TableHead><TableHead>Región</TableHead>
                <TableHead className="text-right">Ejecución SECO %</TableHead><TableHead className="text-center">Sobregiros</TableHead><TableHead className="text-center">Estado</TableHead>
              </TableRow></TableHeader><TableBody>
                {dashboard.map(d => (
                  <TableRow key={d.entidad_id}>
                    <TableCell className="font-medium">{d.nombre_corto}</TableCell>
                    <TableCell>{d.cadena_valor || "—"}</TableCell>
                    <TableCell>{d.region || "—"}</TableCell>
                    <TableCell className="text-right">{(d.pct_ejecucion_seco || 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{d.sobregiros_seco || 0}</TableCell>
                    <TableCell className="text-center"><Semaforo value={Math.abs(50 - (d.pct_ejecucion_seco || 0))} /></TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>
            )}
          </TabsContent>

          <TabsContent value="cdv">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Avance por Cadena de Valor — {periodoLabel}</h3>
            </div>
            {Object.keys(byCdV).length === 0 ? <EmptyState /> : (
              <div className="space-y-4">
                {Object.entries(byCdV).map(([cv, ents]: [string, any]) => (
                  <div key={cv} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{cv} ({ents.length} entidades)</h4>
                    <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                      <TableHead>Entidad</TableHead><TableHead className="text-right">Ppto SECO</TableHead><TableHead className="text-right">Ejec. SECO</TableHead><TableHead className="text-right">%</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {ents.map((e: any) => (
                        <TableRow key={e.entidad_id}>
                          <TableCell>{e.nombre_corto}</TableCell>
                          <TableCell className="text-right">{formatCurrency(e.presupuesto_seco_total)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(e.ejecutado_seco_total)}</TableCell>
                          <TableCell className="text-right">{(e.pct_ejecucion_seco || 0).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell>Subtotal</TableCell>
                        <TableCell className="text-right">{formatCurrency(ents.reduce((s: number, e: any) => s + (e.presupuesto_seco_total || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ents.reduce((s: number, e: any) => s + (e.ejecutado_seco_total || 0), 0))}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody></Table></div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="indicadores">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Indicadores por Proyecto — {periodoLabel}</h3>
              <DownloadButton data={indicadores.map(i => ({ Entidad: i.entidades?.nombre_corto, Código: i.codigo, Indicador: i.nombre, Meta: i.meta, "Línea base": i.linea_base }))} filename={`mec_b_indicadores_${periodoLabel}.csv`} />
            </div>
            {indicadores.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>Entidad</TableHead><TableHead>Código</TableHead><TableHead>Indicador</TableHead><TableHead>Nivel</TableHead><TableHead className="text-right">Meta</TableHead><TableHead className="text-right">Línea base</TableHead>
              </TableRow></TableHeader><TableBody>
                {indicadores.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.entidades?.nombre_corto}</TableCell>
                    <TableCell>{i.codigo}</TableCell>
                    <TableCell>{i.nombre}</TableCell>
                    <TableCell><Badge variant="outline">{i.nivel}</Badge></TableCell>
                    <TableCell className="text-right">{i.meta ?? "—"}</TableCell>
                    <TableCell className="text-right">{i.linea_base ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>
            )}
          </TabsContent>

          <TabsContent value="financiero">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Detalle Financiero Mec B — {periodoLabel}</h3>
              <DownloadButton data={gastos.map(g => ({ Entidad: g.entidades?.nombre_corto, Actividad: g.actividades?.nombre, Fuente: g.fuente, Monto: g.monto, Fecha: g.fecha_gasto }))} filename={`mec_b_financiero_${periodoLabel}.csv`} />
            </div>
            {gastos.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>Entidad</TableHead><TableHead>Actividad</TableHead><TableHead>Fuente</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Fecha</TableHead>
              </TableRow></TableHeader><TableBody>
                {gastos.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.entidades?.nombre_corto}</TableCell>
                    <TableCell>{g.actividades?.codigo} — {g.actividades?.nombre}</TableCell>
                    <TableCell>{g.fuente}</TableCell>
                    <TableCell className="text-right">{formatCurrency(g.monto)}</TableCell>
                    <TableCell>{g.fecha_gasto || "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(gastos.reduce((s: number, g: any) => s + (g.monto || 0), 0))}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody></Table></div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent></Card>
    </div>
  );
}
