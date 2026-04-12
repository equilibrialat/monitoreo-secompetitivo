import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Clock, Activity, DollarSign, CheckCircle2, AlertCircle, Loader2, Bot, Copy, Check,
} from "lucide-react";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { Header, MecanismoBadge, Semaforo, fmt, DashboardSkeleton, ClickableKpiCard } from "./DashboardEntidad";
import { SeccionRevision } from "./SeccionRevision";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import DashboardFilters from "@/components/DashboardFilters";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type ViewMode = "cadena" | "region" | "lista";

function GaugeCircle({ value, label, color = "hsl(var(--primary))" }: { value: number; label: string; color?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 34 34)" className="transition-all duration-700" />
        <text x="34" y="34" textAnchor="middle" dominantBaseline="central"
          className="text-sm font-bold fill-foreground">{pct}%</text>
      </svg>
      <span className="text-[10px] text-muted-foreground mt-0.5 text-center">{label}</span>
    </div>
  );
}

function hasSobregigoEntidad(e: DashboardEntidad): boolean {
  return e.ejecutado_seco_total > e.presupuesto_seco_total && e.presupuesto_seco_total > 0;
}

function entityAlertCount(e: DashboardEntidad): number {
  let count = 0;
  if (hasSobregigoEntidad(e)) count++;
  if (e.tiene_observado) count++;
  if (e.actividades_sin_iniciar > 0) count++;
  if (e.meses_sin_reporte.length > 0) count++;
  if (e.registros_borrador > 0) count++;
  if (e.registros_en_revision > 0) count++;
  const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
  if (desfase > 15) count++;
  return count;
}

function entityStatusLabel(e: DashboardEntidad): { label: string; className: string } {
  const alerts = entityAlertCount(e);
  if (alerts === 0) return { label: "Al día", className: "text-emerald-600" };
  return { label: `${alerts} alerta${alerts > 1 ? "s" : ""}`, className: "text-destructive" };
}

function semaforoIcon(pctEjec: number): string {
  if (pctEjec >= 60) return "🟢";
  if (pctEjec >= 30) return "🟡";
  return "🔴";
}

interface GroupData {
  key: string;
  label: string;
  entidades: DashboardEntidad[];
  avgAvance: number;
  avgEjecucion: number;
}

function groupEntidades(entidades: DashboardEntidad[], mode: ViewMode): GroupData[] {
  if (mode === "lista") {
    return [{ key: "all", label: "Todas las Entidades", entidades, avgAvance: 0, avgEjecucion: 0 }];
  }

  const keyFn = mode === "cadena" ? (e: DashboardEntidad) => e.cadena_valor || "Sin cadena" : (e: DashboardEntidad) => e.region || "Sin región";
  const map = new Map<string, DashboardEntidad[]>();

  for (const e of entidades) {
    const k = keyFn(e);
    const arr = map.get(k) || [];
    arr.push(e);
    map.set(k, arr);
  }

  return Array.from(map.entries()).map(([key, ents]) => {
    const avg = (field: keyof DashboardEntidad) =>
      ents.length > 0 ? Math.round(ents.reduce((s, e) => s + Number(e[field] || 0), 0) / ents.length) : 0;
    return {
      key,
      label: key,
      entidades: ents,
      avgAvance: avg("avance_operativo_promedio"),
      avgEjecucion: avg("pct_ejecucion_seco"),
    };
  }).sort((a, b) => b.avgAvance - a.avgAvance);
}

export default function DashboardCadenasValor() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const [viewMode, setViewMode] = useState<ViewMode>("cadena");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { setEntidadId, setRole, filters } = useRole();

  const entidades = (allEntidades || []).filter(e => {
    if (e.mecanismo !== "B") return false;
    if (e.total_actividades === 0) return false;
    if (filters.entidadFiltro && e.entidad_id !== filters.entidadFiltro) return false;
    if (filters.region && e.region !== filters.region) return false;
    return true;
  });

  const groups = groupEntidades(entidades, viewMode);

  const avgAvance = entidades.length > 0 ? Math.round(entidades.reduce((s, e) => s + (e.avance_operativo_promedio || 0), 0) / entidades.length) : 0;
  const avgEjecucion = entidades.length > 0 ? Math.round(entidades.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / entidades.length) : 0;
  const pendientesTotal = entidades.reduce((s, e) => s + (e.pendientes_revision || 0), 0);
  const sobregiros = entidades.filter((e) => hasSobregigoEntidad(e));

  const handleEntityClick = (entidadId: string) => {
    setRole("entidad_mec_b");
    setEntidadId(entidadId);
    navigate("/actividades");
  };

  const handleBadgeClick = (e: React.MouseEvent, entidadId: string, route: string) => {
    e.stopPropagation();
    setRole("entidad_mec_b");
    setEntidadId(entidadId);
    navigate(route);
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    const cadenaData = groups.filter(g => g.key !== "all").map(g => ({
      cadena_valor: g.label,
      num_entidades: g.entidades.length,
      avance_operativo_promedio: g.avgAvance,
      ejecucion_financiera_promedio: g.avgEjecucion,
      entidades: g.entidades.map(e => ({
        nombre: e.nombre_corto,
        avance_operativo: e.avance_operativo_promedio,
        ejecucion_seco: e.pct_ejecucion_seco,
        actividades_sin_iniciar: e.actividades_sin_iniciar,
        sobregiros: e.sobregiros_seco,
        presupuesto: e.presupuesto_seco_total,
        ejecutado: e.ejecutado_seco_total,
      })),
    }));

    const { resultado, error } = await invokeAnalysis("ejecutivo", {
      entidad: { codigo: "MEC-B", nombre: "Cadenas de Valor" },
      instrucciones: "Compara el desempeño entre cadenas de valor. Identifica la cadena con mejor y peor desempeño. Destaca actividades sin iniciar y presupuesto en riesgo.",
      cadenas_valor: cadenaData,
      financiero: {
        avance_promedio: avgAvance,
        ejecucion_promedio: avgEjecucion,
        total_entidades: entidades.length,
      },
    });

    setAiLoading(false);
    if (error) toast.error(error);
    else setAiResult(resultado ?? null);
  };

  const handleCopy = () => {
    if (aiResult) {
      navigator.clipboard.writeText(aiResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <Header title="Dashboard Cadenas de Valor (Mec B)" subtitle="Coordinador Cadenas de Valor — Vista agrupada" />

      <DashboardFilters showMecanismo={false} showEntidad showRegion showPeriodo />

      {/* Review section */}
      <SeccionRevision
        title="Revisión Pendiente"
        estadoFiltro="enviado"
        estadoAprobar="en_revision_tecnica"
        labelAprobar="Aprobar (→ Rev. Técnica)"
        filterFn={(r: any) => r.mecanismo === "B"}
      />

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs font-medium text-muted-foreground mb-1">Entidades Mec B</p>
            <p className="text-3xl font-bold text-foreground">{entidades.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex flex-col items-center">
            <GaugeCircle value={avgAvance} label="Avance Op." />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex flex-col items-center">
            <GaugeCircle value={avgEjecucion} label="Ejec. SECO" color="hsl(var(--chart-2))" />
          </CardContent>
        </Card>
        <ClickableKpiCard
          label="Pendientes Revisión" value={String(pendientesTotal)} sub="registros"
          onClick={() => navigate("/revision-pendiente")}
          className={pendientesTotal > 0 ? "border-warning/50" : ""}
        />
        <ClickableKpiCard
          label="Sobregiros" value={String(sobregiros.length)} sub="entidades"
          onClick={() => navigate("/desembolsos")}
          className={sobregiros.length > 0 ? "border-destructive/50" : ""}
        />
      </div>

      {/* View mode selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Vista:</span>
        {([
          { value: "cadena" as ViewMode, label: "Por Cadena de Valor" },
          { value: "region" as ViewMode, label: "Por Región" },
          { value: "lista" as ViewMode, label: "Lista completa" },
        ]).map(opt => (
          <Button
            key={opt.value}
            variant={viewMode === opt.value ? "default" : "outline"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setViewMode(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Grouped entities */}
      <div className="space-y-5">
        {groups.map((group) => (
          <Card key={group.key} className="overflow-hidden">
            {viewMode !== "lista" && (
              <CardHeader className="pb-2 bg-muted/30 border-b">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide">{group.label}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{group.entidades.length} entidad{group.entidades.length !== 1 ? "es" : ""}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Avance CdV: <strong className="text-foreground">{group.avgAvance}%</strong></span>
                    <span>Ejecución: <strong className="text-foreground">{group.avgEjecucion}%</strong></span>
                  </div>
                </div>
                <Progress value={group.avgAvance} className="h-1.5 mt-2" />
              </CardHeader>
            )}
            <CardContent className="pt-3 pb-3">
              <div className="divide-y">
                {group.entidades.map((ent) => {
                  const desfase = (ent.avance_operativo_promedio || 0) - ent.pct_ejecucion_seco;
                  const status = entityStatusLabel(ent);
                  const disponible = ent.presupuesto_seco_total - ent.ejecutado_seco_total;
                  return (
                    <div
                      key={ent.entidad_id}
                      className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-muted/40 rounded transition-colors"
                      onClick={() => handleEntityClick(ent.entidad_id)}
                    >
                      <span className="text-base shrink-0">{semaforoIcon(ent.pct_ejecucion_seco)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{ent.nombre_corto}</span>
                          {ent.region && <Badge variant="outline" className="text-[9px] px-1">{ent.region}</Badge>}
                          {hasSobregigoEntidad(ent) && (
                            <Badge variant="destructive" className="text-[9px] px-1 cursor-pointer hover:bg-destructive/90"
                              onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/gestion-financiera")}>
                              Sobregiro
                            </Badge>
                          )}
                          {ent.tiene_observado && (
                            <Badge className="text-[9px] px-1 bg-orange-500/15 text-orange-600 cursor-pointer hover:bg-orange-500/25"
                              onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/revision-pendiente")}>
                              Observado
                            </Badge>
                          )}
                          {ent.meses_sin_reporte.length > 0 && (
                            <Badge className="text-[9px] px-1 bg-destructive/10 text-destructive cursor-pointer hover:bg-destructive/20"
                              onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/registro-mensual")}>
                              Sin reporte: {ent.meses_sin_reporte.join(", ")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Activity className="h-3 w-3" />
                            <span>Op: <strong className="text-foreground">{ent.avance_operativo_promedio != null && ent.avance_operativo_promedio > 0 ? `${ent.avance_operativo_promedio}%` : "Sin datos"}</strong></span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>Fin: <strong className="text-foreground">{ent.pct_ejecucion_seco}%</strong></span>
                          </div>
                          {entityAlertCount(ent) > 0 && (
                            <span
                              className={`text-[11px] font-medium ${status.className} cursor-pointer hover:underline`}
                              onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/actividades")}
                            >
                              {status.label}
                            </span>
                          )}
                          {entityAlertCount(ent) === 0 && (
                            <span className={`text-[11px] font-medium ${status.className}`}>{status.label}</span>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <div className="text-right text-[10px]">
                          <p className="text-muted-foreground">Presup.</p>
                          <p className="font-mono font-semibold">{fmt(ent.presupuesto_seco_total)}</p>
                        </div>
                        <div className="text-right text-[10px]">
                          <p className="text-muted-foreground">Ejecutado</p>
                          <p className="font-mono font-semibold">{fmt(ent.ejecutado_seco_total)}</p>
                        </div>
                        <div className="text-right text-[10px]">
                          <p className="text-muted-foreground">Disp.</p>
                          <p className={`font-mono font-semibold ${disponible < 0 ? "text-destructive" : ""}`}>{fmt(disponible)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">🤖 Análisis Comparativo por Cadena de Valor</CardTitle>
            <div className="flex gap-2">
              {aiResult && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleAIAnalysis} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
                Generar análisis
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {aiLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Analizando cadenas de valor...
            </div>
          )}
          {aiResult && (
            <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1.5">
              <ReactMarkdown>{aiResult}</ReactMarkdown>
            </div>
          )}
          {!aiLoading && !aiResult && (
            <p className="text-xs text-muted-foreground py-2">Haz clic en "Generar análisis" para obtener una comparativa entre cadenas de valor con IA.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
