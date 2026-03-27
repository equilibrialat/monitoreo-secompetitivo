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

export default function ReportesMecAPage() {
  const { entidades } = useRole();
  const ps = usePeriodSelector();
  const [periodType, setPeriodType] = useState<PeriodType>("trimestral");
  const [dashboard, setDashboard] = useState<any[]>([]);
  const [normativo, setNormativo] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const periodoLabel = periodType === "trimestral" ? `${ps.trimestre} ${ps.anioTrimestral}` : periodType === "semestral" ? `${ps.semestre} ${ps.anioSemestral}` : ps.anioAnual;

  useEffect(() => { loadData(); }, [periodType, ps.trimestre, ps.anioTrimestral, ps.semestre, ps.anioSemestral, ps.anioAnual]);

  async function loadData() {
    setLoading(true);
    const [d, n] = await Promise.all([
      (supabase as any).from("v_dashboard_entidad").select("*").eq("mecanismo", "mec_a"),
      (supabase as any).from("registro_normativo").select("*, entidades(nombre_corto)"),
    ]);
    setDashboard(d.data || []);

    // Filter normativo by period
    const mecAIds = (d.data || []).map((e: any) => e.entidad_id);
    setNormativo((n.data || []).filter((r: any) => mecAIds.includes(r.entidad_id)));

    // Gastos
    const meses = periodType === "trimestral" ? TRIMESTRES_MESES[ps.trimestre] : periodType === "semestral" ? SEMESTRES_MESES[ps.semestre] : [1,2,3,4,5,6,7,8,9,10,11,12];
    const anio = parseInt(periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual);
    const { data: rm } = await (supabase as any).from("registros_mensuales").select("id, entidad_id").eq("anio", anio).in("mes", meses);
    const filteredRm = (rm || []).filter((r: any) => mecAIds.includes(r.entidad_id));
    if (filteredRm.length > 0) {
      const { data: g } = await (supabase as any).from("ejecucion_financiera").select("*, actividades(codigo, nombre), entidades(nombre_corto)").in("registro_mensual_id", filteredRm.map((r: any) => r.id));
      setGastos(g || []);
    } else setGastos([]);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes Mec A</h1>
          <p className="text-muted-foreground">Entidades Mecanismo A</p>
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
        <Tabs defaultValue="iniciativa">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="iniciativa">Avance por Iniciativa</TabsTrigger>
            <TabsTrigger value="normativo">Avance Normativo</TabsTrigger>
            <TabsTrigger value="financiero">Detalle Financiero</TabsTrigger>
          </TabsList>

          <TabsContent value="iniciativa">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Avance por Iniciativa Mec A — {periodoLabel}</h3>
              <DownloadButton data={dashboard.map(d => ({ Entidad: d.nombre_corto, Actividades: d.total_actividades, Completadas: d.actividades_completadas, "Ejecución SECO %": d.pct_ejecucion_seco, Sobregiros: d.sobregiros_seco }))} filename={`mec_a_iniciativas_${periodoLabel}.csv`} />
            </div>
            {dashboard.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>Entidad</TableHead><TableHead className="text-right">Actividades</TableHead><TableHead className="text-right">Completadas</TableHead>
                <TableHead className="text-right">Ejecución SECO %</TableHead><TableHead className="text-center">Estado</TableHead>
              </TableRow></TableHeader><TableBody>
                {dashboard.map(d => (
                  <TableRow key={d.entidad_id}>
                    <TableCell className="font-medium">{d.nombre_corto}</TableCell>
                    <TableCell className="text-right">{d.total_actividades || 0}</TableCell>
                    <TableCell className="text-right">{d.actividades_completadas || 0}</TableCell>
                    <TableCell className="text-right">{(d.pct_ejecucion_seco || 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-center"><Semaforo value={Math.abs(50 - (d.pct_ejecucion_seco || 0))} /></TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>
            )}
          </TabsContent>

          <TabsContent value="normativo">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Avance Normativo Mec A — {periodoLabel}</h3>
              <DownloadButton data={normativo.map(n => ({ Entidad: n.entidades?.nombre_corto, Norma: n.nombre_documento, Tipo: n.tipo_marco, Subtipo: n.subtipo, Estado: n.estado, Fecha: n.fecha_aprobacion, Contribución: n.contribucion }))} filename={`mec_a_normativo_${periodoLabel}.csv`} />
            </div>
            {normativo.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>Entidad</TableHead><TableHead>Norma/Trámite</TableHead><TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead>Contribución</TableHead>
              </TableRow></TableHeader><TableBody>
                {normativo.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.entidades?.nombre_corto}</TableCell>
                    <TableCell>{n.nombre_documento}</TableCell>
                    <TableCell>{n.tipo_marco}</TableCell>
                    <TableCell><Badge variant="outline">{n.estado}</Badge></TableCell>
                    <TableCell>{n.fecha_aprobacion || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{n.contribucion || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>
            )}
          </TabsContent>

          <TabsContent value="financiero">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Detalle Financiero Mec A — {periodoLabel}</h3>
              <DownloadButton data={gastos.map(g => ({ Entidad: g.entidades?.nombre_corto, Actividad: g.actividades?.nombre, Fuente: g.fuente, Monto: g.monto, Fecha: g.fecha_gasto }))} filename={`mec_a_financiero_${periodoLabel}.csv`} />
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
