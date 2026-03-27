import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, Copy, Check, RefreshCw } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Header, ClickableKpiCard, KpiCard, MecanismoBadge, Semaforo, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import DashboardFilters from "@/components/DashboardFilters";

export default function DashboardDireccion() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { setEntidadId, filters } = useRole();

  // Apply filters
  const entidades = (allEntidades || []).filter(e => {
    if (filters.mecanismo === "mec_a" && e.mecanismo !== "A") return false;
    if (filters.mecanismo === "mec_b" && e.mecanismo !== "B") return false;
    if (filters.entidadFiltro && e.entidad_id !== filters.entidadFiltro) return false;
    if (filters.region && e.region !== filters.region) return false;
    return true;
  });

  const handleAnalysis = async () => {
    if (!entidades?.length) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    const { resultado, error } = await invokeAnalysis("ejecutivo", {
      entidad: { codigo: "PROGRAMA", nombre: "SeCompetitivo", mecanismo: "todos", tipo_entidad: "programa", cadena_valor: "múltiples", region: "nacional" },
      periodo: { tipo: "dashboard", anio: 2025 },
      actividades: entidades.map((e) => ({
        codigo: e.codigo,
        nombre: e.nombre_corto,
        mecanismo: e.mecanismo,
        region: e.region,
        cadena_valor: e.cadena_valor,
        pct_avance_tecnico: e.avance_operativo_promedio,
        pct_avance_financiero: e.pct_ejecucion_seco,
        presupuesto_seco: e.presupuesto_seco_total,
        ejecutado_seco: e.ejecutado_seco_total,
        total_actividades: e.total_actividades,
        completadas: e.actividades_completadas,
        sobregiros: e.sobregiros_seco,
        desfases: e.desfases_tecnico_financiero,
      })),
      financiero: {
        presupuesto_seco_total: entidades.reduce((s, e) => s + e.presupuesto_seco_total, 0),
        ejecutado_seco_total: entidades.reduce((s, e) => s + e.ejecutado_seco_total, 0),
        pct_seco: entidades.reduce((s, e) => s + e.presupuesto_seco_total, 0) > 0
          ? Math.round((entidades.reduce((s, e) => s + e.ejecutado_seco_total, 0) / entidades.reduce((s, e) => s + e.presupuesto_seco_total, 0)) * 100)
          : 0,
        sobregiros: entidades.filter(e => e.sobregiros_seco > 0).map(e => ({
          entidad: e.nombre_corto,
          cantidad_sobregiros: e.sobregiros_seco,
        })),
      },
    });
    setAiLoading(false);
    if (error) setAiError(error);
    else setAiResult(resultado ?? null);
  };

  const handleCopy = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    toast.success("Análisis copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <DashboardSkeleton />;

  const all = entidades;
  const totalAct = all.reduce((s, e) => s + e.total_actividades, 0);
  const completadas = all.reduce((s, e) => s + e.actividades_completadas, 0);
  const totalPpto = all.reduce((s, e) => s + e.presupuesto_seco_total, 0);
  const totalEjec = all.reduce((s, e) => s + e.ejecutado_seco_total, 0);
  const avOpGlobal = totalAct > 0 ? Math.round(all.reduce((s, e) => s + (e.avance_operativo_promedio || 0) * e.total_actividades, 0) / totalAct) : 0;
  const avFinGlobal = totalPpto > 0 ? Math.round((totalEjec / totalPpto) * 100) : 0;

  const mecA = all.filter((e) => e.mecanismo === "A");
  const mecB = all.filter((e) => e.mecanismo !== "A");
  const avgOp = (arr: typeof all) => arr.length > 0 ? Math.round(arr.reduce((s, e) => s + (e.avance_operativo_promedio || 0), 0) / arr.length) : 0;
  const avgFin = (arr: typeof all) => arr.length > 0 ? Math.round(arr.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / arr.length) : 0;

  const sorted = [...all].sort((a, b) => (b.avance_operativo_promedio || 0) - (a.avance_operativo_promedio || 0));

  const handleEntityClick = (entidadId: string) => {
    setEntidadId(entidadId);
    navigate("/mis-actividades");
  };

  return (
    <div>
      <Header title="Dashboard Ejecutivo" subtitle="Dirección" />

      <DashboardFilters showMecanismo showEntidad showRegion showPeriodo />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="Avance Operativo Global" value={`${avOpGlobal}%`} />
        <ClickableKpiCard label="Avance Financiero SECO" value={`${avFinGlobal}%`} sub={`USD ${fmt(totalEjec)} / ${fmt(totalPpto)}`} onClick={() => navigate("/desembolsos")} />
        <ClickableKpiCard label="Entidades Activas" value={String(all.length)} onClick={() => navigate("/verificacion")} />
        <ClickableKpiCard label="Actividades Completadas" value={`${completadas}/${totalAct}`} onClick={() => navigate("/mis-actividades")} />
      </div>

      {/* Mec A vs Mec B */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/reportes-mec-a")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mecanismo A — Políticas Públicas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Avance operativo</span><span>{avgOp(mecA)}%</span></div><Progress value={avgOp(mecA)} className="h-2" /></div>
            <div><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Ejecución SECO</span><span>{avgFin(mecA)}%</span></div><Progress value={avgFin(mecA)} className="h-2" /></div>
            <p className="text-xs text-muted-foreground">{mecA.length} entidades</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/reportes-mec-b")}>
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
        <Button onClick={handleAnalysis} disabled={aiLoading} variant="outline" className="mb-3 border-primary/30 text-primary hover:bg-primary/5">
          {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
          {aiLoading ? "Analizando datos del programa..." : aiResult ? "🔄 Regenerar análisis ejecutivo" : "🤖 Generar análisis ejecutivo"}
        </Button>

        {aiError && (
          <Card className="border-destructive">
            <CardContent className="py-3"><p className="text-sm text-destructive">{aiError}</p></CardContent>
          </Card>
        )}

        {aiResult && (
          <Card className="border-l-4 border-l-primary bg-background shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-primary flex items-center gap-1">
                  📊 Análisis Estratégico — Generado por IA
                  <span className="text-muted-foreground font-normal ml-2">
                    {new Date().toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                    {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-foreground">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 pt-2 border-t border-border/50 italic">
                Este análisis es una herramienta de apoyo. Los datos específicos están disponibles en las tablas del dashboard.
              </p>
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
            <Card key={e.entidad_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEntityClick(e.entidad_id)}>
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
