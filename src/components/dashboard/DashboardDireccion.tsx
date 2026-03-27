import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Bot } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Header, KpiCard, MecanismoBadge, Semaforo, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { invokeAnalysis } from "@/lib/aiAnalysis";

export default function DashboardDireccion() {
  const { data: entidades, isLoading } = useDashboardData();
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAnalysis = async () => {
    if (!entidades?.length) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    const { resultado, error } = await invokeAnalysis("ejecutivo", {
      entidades: entidades.map((e) => ({
        nombre: e.nombre_corto,
        mecanismo: e.mecanismo,
        region: e.region,
        avance_operativo: e.avance_operativo_promedio,
        pct_ejecucion_seco: e.pct_ejecucion_seco,
        presupuesto_seco: e.presupuesto_seco_total,
        ejecutado_seco: e.ejecutado_seco_total,
        actividades: e.total_actividades,
        completadas: e.actividades_completadas,
        sobregiros: e.sobregiros_seco,
      })),
    });
    setAiLoading(false);
    if (error) setAiError(error);
    else setAiResult(resultado ?? null);
  };

  if (isLoading) return <DashboardSkeleton />;

  const all = entidades || [];
  const totalAct = all.reduce((s, e) => s + e.total_actividades, 0);
  const completadas = all.reduce((s, e) => s + e.actividades_completadas, 0);
  const totalPpto = all.reduce((s, e) => s + e.presupuesto_seco_total, 0);
  const totalEjec = all.reduce((s, e) => s + e.ejecutado_seco_total, 0);
  const avOpGlobal = totalAct > 0 ? Math.round(all.reduce((s, e) => s + (e.avance_operativo_promedio || 0) * e.total_actividades, 0) / totalAct) : 0;
  const avFinGlobal = totalPpto > 0 ? Math.round((totalEjec / totalPpto) * 100) : 0;

  const mecA = all.filter((e) => e.mecanismo === "A");
  const mecB = all.filter((e) => e.mecanismo === "B");
  const avgOp = (arr: typeof all) => arr.length > 0 ? Math.round(arr.reduce((s, e) => s + (e.avance_operativo_promedio || 0), 0) / arr.length) : 0;
  const avgFin = (arr: typeof all) => arr.length > 0 ? Math.round(arr.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / arr.length) : 0;

  const sorted = [...all].sort((a, b) => (b.avance_operativo_promedio || 0) - (a.avance_operativo_promedio || 0));

  return (
    <div>
      <Header title="Dashboard Ejecutivo" subtitle="Dirección" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="Avance Operativo Global" value={`${avOpGlobal}%`} />
        <KpiCard label="Avance Financiero SECO" value={`${avFinGlobal}%`} sub={`USD ${fmt(totalEjec)} / ${fmt(totalPpto)}`} />
        <KpiCard label="Entidades Activas" value={String(all.length)} />
        <KpiCard label="Actividades Completadas" value={`${completadas}/${totalAct}`} />
      </div>

      {/* Mec A vs Mec B */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mecanismo A — Políticas Públicas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Avance operativo</span><span>{avgOp(mecA)}%</span></div><Progress value={avgOp(mecA)} className="h-2" /></div>
            <div><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Ejecución SECO</span><span>{avgFin(mecA)}%</span></div><Progress value={avgFin(mecA)} className="h-2" /></div>
            <p className="text-xs text-muted-foreground">{mecA.length} entidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mecanismo B — Cadenas de Valor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Avance operativo</span><span>{avgOp(mecB)}%</span></div><Progress value={avgOp(mecB)} className="h-2" /></div>
            <div><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Ejecución SECO</span><span>{avgFin(mecB)}%</span></div><Progress value={avgFin(mecB)} className="h-2" /></div>
            <p className="text-xs text-muted-foreground">{mecB.length} entidades</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      <div className="mb-6">
        <Button
          onClick={handleAnalysis}
          disabled={aiLoading}
          variant="outline"
          className="mb-3"
        >
          {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
          {aiLoading ? "Analizando datos del programa..." : "🤖 Generar análisis ejecutivo"}
        </Button>

        {aiError && (
          <Card className="border-destructive">
            <CardContent className="py-3">
              <p className="text-sm text-destructive">{aiError}</p>
            </CardContent>
          </Card>
        )}

        {aiResult && (
          <Card className="border-primary border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Análisis Ejecutivo IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{aiResult}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ranking */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Ranking de Entidades</h2>
      <div className="space-y-2">
        {sorted.map((e, i) => {
          const desfase = (e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco;
          return (
            <Card key={e.entidad_id}>
              <CardContent className="flex items-center gap-4 py-3">
                <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{e.nombre_corto}</span>
                    <MecanismoBadge mec={e.mecanismo} />
                    <Semaforo desfase={desfase} />
                  </div>
                  <Progress value={e.avance_operativo_promedio ?? 0} className="h-1.5 mt-1" />
                </div>
                <span className="text-sm font-semibold text-foreground">{e.avance_operativo_promedio ?? 0}%</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
