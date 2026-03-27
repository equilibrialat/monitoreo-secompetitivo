import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { invocarAnalisis } from "@/lib/aiAnalysis";
import {
  PeriodSelector, usePeriodSelector, Semaforo, EmptyState, DownloadButton,
  Card, CardContent, CardHeader, CardTitle, Badge, Button,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatCurrency
} from "@/components/reportes/ReportShell";

type PeriodType = "trimestral" | "semestral" | "anual";

export default function ReportesEjecutivosPage() {
  const { entidades } = useRole();
  const ps = usePeriodSelector();
  const [periodType, setPeriodType] = useState<PeriodType>("trimestral");
  const [dashboard, setDashboard] = useState<any[]>([]);
  const [empleo, setEmpleo] = useState<any[]>([]);
  const [comercial, setComercial] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const periodoLabel = periodType === "trimestral" ? `${ps.trimestre} ${ps.anioTrimestral}` : periodType === "semestral" ? `${ps.semestre} ${ps.anioSemestral}` : ps.anioAnual;

  useEffect(() => { loadData(); }, [periodType, ps.trimestre, ps.anioTrimestral, ps.semestre, ps.anioSemestral, ps.anioAnual]);

  async function loadData() {
    setLoading(true);
    setAiResult(null);
    const [d, e, c] = await Promise.all([
      (supabase as any).from("v_dashboard_entidad").select("*"),
      (supabase as any).from("reporte_empleo").select("*"),
      (supabase as any).from("reporte_comercial").select("*"),
    ]);
    setDashboard(d.data || []);
    setEmpleo(e.data || []);
    setComercial(c.data || []);
    setLoading(false);
  }

  // KPIs
  const totalActividades = dashboard.reduce((s, r) => s + (r.total_actividades || 0), 0);
  const completadas = dashboard.reduce((s, r) => s + (r.actividades_completadas || 0), 0);
  const avanceGlobal = totalActividades > 0 ? (completadas / totalActividades * 100) : 0;
  const pptoSeco = dashboard.reduce((s, r) => s + (r.presupuesto_seco_total || 0), 0);
  const ejSeco = dashboard.reduce((s, r) => s + (r.ejecutado_seco_total || 0), 0);
  const pctSeco = pptoSeco > 0 ? (ejSeco / pptoSeco * 100) : 0;
  const sobregiros = dashboard.reduce((s, r) => s + (r.sobregiros_seco || 0), 0);
  const desfases = dashboard.reduce((s, r) => s + (r.desfases_tecnico_financiero || 0), 0);

  // Mec comparison
  const mecA = dashboard.filter(d => d.mecanismo === "mec_a");
  const mecB = dashboard.filter(d => d.mecanismo === "mec_b");
  const avgAvanceMecA = mecA.length > 0 ? mecA.reduce((s, r) => s + (r.pct_ejecucion_seco || 0), 0) / mecA.length : 0;
  const avgAvanceMecB = mecB.length > 0 ? mecB.reduce((s, r) => s + (r.pct_ejecucion_seco || 0), 0) / mecB.length : 0;

  // Top/Bottom
  const sorted = [...dashboard].sort((a, b) => (b.pct_ejecucion_seco || 0) - (a.pct_ejecucion_seco || 0));
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  // Impact indicators
  const totalEmpleos = empleo.reduce((s, e) => s + (e.total_empleos || 0), 0);
  const totalExport = comercial.reduce((s, c) => s + (c.valor_fob_total || 0), 0);

  async function handleAI() {
    setAiLoading(true);
    const res = await invocarAnalisis("ejecutivo", {
      periodo: periodoLabel,
      kpis: { avanceGlobal, pctSeco, completadas, totalActividades, sobregiros, desfases },
      entidades: dashboard.map(d => ({ nombre: d.nombre_corto, avance: d.pct_ejecucion_seco, sobregiros: d.sobregiros_seco })),
    });
    setAiResult(res.resultado || res.error);
    setAiLoading(false);
  }

  const kpis = [
    { label: "Avance Operativo Global", value: `${avanceGlobal.toFixed(1)}%` },
    { label: "Ejecución SECO", value: `${pctSeco.toFixed(1)}%` },
    { label: "Actividades Completadas", value: `${completadas} / ${totalActividades}` },
    { label: "Entidades", value: `${dashboard.length}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes Ejecutivos</h1>
          <p className="text-muted-foreground">Vista de alto nivel del programa</p>
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
              label="Período" type={periodType === "trimestral" ? "trimestre" : periodType === "semestral" ? "semestre" : "anual"}
              value={periodType === "trimestral" ? ps.trimestre : periodType === "semestral" ? ps.semestre : ps.anioAnual}
              onChange={periodType === "trimestral" ? ps.setTrimestre : periodType === "semestral" ? ps.setSemestre : ps.setAnioAnual}
              anio={periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual}
              onAnioChange={periodType === "trimestral" ? ps.setAnioTrimestral : periodType === "semestral" ? ps.setAnioSemestral : ps.setAnioAnual}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mec A vs B */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Comparativa Mec A vs Mec B</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Mecanismo A ({mecA.length} entidades)</p>
              <div className="h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(avgAvanceMecA, 100)}%` }} /></div>
              <p className="text-xs text-muted-foreground mt-1">{avgAvanceMecA.toFixed(1)}% ejecución promedio</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Mecanismo B ({mecB.length} entidades)</p>
              <div className="h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(avgAvanceMecB, 100)}%` }} /></div>
              <p className="text-xs text-muted-foreground mt-1">{avgAvanceMecB.toFixed(1)}% ejecución promedio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top / Bottom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">🏆 Top 3 Mejor Avance</CardTitle></CardHeader>
          <CardContent>
            {top3.map((e, i) => (
              <div key={e.entidad_id} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-sm">{i + 1}. {e.nombre_corto}</span>
                <span className="text-sm font-medium">{(e.pct_ejecucion_seco || 0).toFixed(1)}% <Semaforo value={Math.abs(50 - (e.pct_ejecucion_seco || 0))} /></span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">⚠️ Top 3 Menor Avance</CardTitle></CardHeader>
          <CardContent>
            {bottom3.map((e, i) => (
              <div key={e.entidad_id} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-sm">{i + 1}. {e.nombre_corto}</span>
                <span className="text-sm font-medium">{(e.pct_ejecucion_seco || 0).toFixed(1)}% <Semaforo value={Math.abs(50 - (e.pct_ejecucion_seco || 0))} /></span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">🚨 Alertas Críticas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-destructive/10"><p className="text-xl font-bold text-destructive">{sobregiros}</p><p className="text-xs text-muted-foreground">Sobregiros</p></div>
            <div className="p-3 rounded-lg bg-yellow-500/10"><p className="text-xl font-bold text-yellow-600">{desfases}</p><p className="text-xs text-muted-foreground">Desfases</p></div>
            <div className="p-3 rounded-lg bg-muted"><p className="text-xl font-bold">{dashboard.filter(d => (d.pct_ejecucion_seco || 0) === 0).length}</p><p className="text-xs text-muted-foreground">Sin ejecución</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Indicators */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Indicadores de Impacto Acumulado</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-primary/5"><p className="text-xl font-bold text-primary">{totalEmpleos}</p><p className="text-xs text-muted-foreground">Empleos reportados</p></div>
            <div className="p-3 rounded-lg bg-primary/5"><p className="text-xl font-bold text-primary">{formatCurrency(totalExport)}</p><p className="text-xs text-muted-foreground">Exportaciones FOB</p></div>
            <div className="p-3 rounded-lg bg-primary/5"><p className="text-xl font-bold text-primary">{comercial.length}</p><p className="text-xs text-muted-foreground">Reportes comerciales</p></div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Análisis Ejecutivo IA</h3>
            <div className="flex gap-2">
              <Button onClick={handleAI} disabled={aiLoading} size="sm">
                {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generar análisis IA
              </Button>
              <DownloadButton data={dashboard.map(d => ({
                Entidad: d.nombre_corto, Mecanismo: d.mecanismo, "Ejecución SECO %": d.pct_ejecucion_seco,
                Completadas: d.actividades_completadas, Total: d.total_actividades, Sobregiros: d.sobregiros_seco,
              }))} filename={`ejecutivo_${periodoLabel}.csv`} />
            </div>
          </div>
          {aiResult && (
            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">{aiResult}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
