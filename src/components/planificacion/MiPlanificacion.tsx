import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight, ChevronDown, FileText, Calendar, DollarSign, Target,
  Clock, CheckCircle2, Circle, XCircle, AlertTriangle, Lock, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { RegistroAvancePlanificacionDialog } from "./RegistroAvancePlanificacionDialog";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── Types ─── */

interface PlanificacionActividad {
  id: string;
  entidad_codigo: string;
  proyecto_nombre: string;
  resultado_impacto: string;
  resultado_final: string;
  resultado_intermedio_codigo: string;
  resultado_intermedio_descripcion: string;
  producto_codigo: string;
  producto_descripcion: string;
  actividad_codigo: string;
  actividad_descripcion: string;
  unidad_medida: string;
  medio_verificacion: string;
  meta_total: number;
  presupuesto_seco_usd: number;
  meses_programados: string[];
  responsable: string;
}

type ActividadEstado = "al_dia" | "en_progreso" | "con_rezago" | "por_iniciar" | "cerrada";

/* ─── Helpers ─── */

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatYM(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES_SHORT[parseInt(m) - 1]}-${y.slice(2)}`;
}

function calcEstado(
  meses: string[],
  currentYM: string,
  reportedMonths: Set<string>
): ActividadEstado {
  const allFuture = meses.every((m) => m > currentYM);
  if (allFuture) return "por_iniciar";

  const pastOrCurrent = meses.filter((m) => m <= currentYM);
  const pastWithoutReport = pastOrCurrent.filter((m) => !reportedMonths.has(m));
  const allPast = meses.every((m) => m < currentYM);

  if (allPast && pastWithoutReport.length === 0) return "cerrada";
  if (pastWithoutReport.length > 0) return "con_rezago";
  // All past/current reported, has future months
  if (meses.some((m) => m > currentYM)) return "en_progreso";
  return "al_dia";
}

function countExecuted(reportedMonths: Set<string>): number {
  return reportedMonths.size;
}

const ESTADO_CONFIG: Record<ActividadEstado, { color: string; bgColor: string; label: string; icon: typeof Circle }> = {
  al_dia:      { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Al día", icon: CheckCircle2 },
  en_progreso: { color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", label: "En progreso", icon: Clock },
  con_rezago:  { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", label: "Con rezago", icon: AlertTriangle },
  por_iniciar: { color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "Por iniciar", icon: Circle },
  cerrada:     { color: "text-muted-foreground", bgColor: "bg-muted", label: "Cerrada", icon: Lock },
};

/* ─── Main component ─── */

export default function MiPlanificacion() {
  const { entidadId, entidades } = useRole();
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedActividad, setSelectedActividad] = useState<PlanificacionActividad | null>(null);

  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;
  const currentYM = getCurrentYearMonth();

  useEffect(() => {
    if (!entidadCodigo) { setActividades([]); setLoading(false); return; }
    setLoading(true);

    Promise.all([
      (supabase as any)
        .from("planificacion_actividades")
        .select("*")
        .eq("entidad_codigo", entidadCodigo)
        .order("actividad_codigo"),
      (supabase as any)
        .from("registros_mensuales")
        .select("actividad_id, anio, mes, actividades!inner(codigo)")
        .eq("entidad_id", entidadId),
    ]).then(([planRes, regRes]: any[]) => {
      setActividades(planRes.data || []);
      const byCode = new Map<string, Set<string>>();
      if (regRes.data) {
        for (const r of regRes.data) {
          const code = r.actividades?.codigo;
          if (!code) continue;
          const ym = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
          if (!byCode.has(code)) byCode.set(code, new Set());
          byCode.get(code)!.add(ym);
        }
      }
      setReportsByActivity(byCode);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  /* ─── Build 5-level hierarchy ─── */
  const hierarchy = useMemo(() => {
    if (!actividades.length) return null;

    const resultadoImpacto = actividades[0]?.resultado_impacto || "";
    const resultadoFinal = actividades[0]?.resultado_final || "";

    // Group: RI → Producto → Activities
    const riMap = new Map<string, { codigo: string; desc: string; productos: Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }> }>();

    for (const a of actividades) {
      const riKey = a.resultado_intermedio_codigo;
      if (!riMap.has(riKey)) {
        riMap.set(riKey, { codigo: riKey, desc: a.resultado_intermedio_descripcion, productos: new Map() });
      }
      const ri = riMap.get(riKey)!;
      const pKey = a.producto_codigo;
      if (!ri.productos.has(pKey)) {
        ri.productos.set(pKey, { codigo: pKey, desc: a.producto_descripcion, acts: [] });
      }
      ri.productos.get(pKey)!.acts.push(a);
    }

    return { resultadoImpacto, resultadoFinal, ris: Array.from(riMap.values()) };
  }, [actividades]);

  // Summary stats per RI
  function getRiStats(acts: PlanificacionActividad[]) {
    const counts: Record<ActividadEstado, number> = { al_dia: 0, en_progreso: 0, con_rezago: 0, por_iniciar: 0, cerrada: 0 };
    let presupuesto = 0;
    for (const a of acts) {
      const reported = reportsByActivity.get(a.actividad_codigo) || new Set();
      const estado = calcEstado(a.meses_programados, currentYM, reported);
      counts[estado]++;
      presupuesto += a.presupuesto_seco_usd || 0;
    }
    const hasRezago = counts.con_rezago > 0;
    const allDone = counts.al_dia + counts.cerrada === acts.length;
    return { counts, presupuesto, total: acts.length, status: hasRezago ? "con_rezago" : allDone ? "al_dia" : "en_progreso" };
  }

  if (!entidadCodigo) return null;

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader><CardTitle>Mi Planificación</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Mi Planificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Tu planificación se está configurando. Pronto verás aquí el árbol completo de tu proyecto.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Mi Planificación — Anexo B
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {actividades[0]?.proyecto_nombre || "Proyecto"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Level 1: Resultado de Impacto */}
          <CollapsibleSection
            level={1}
            icon="📌"
            label="Resultado de Impacto"
            description={hierarchy.resultadoImpacto}
            defaultOpen
          >
            {/* Level 2: Resultado Final */}
            <CollapsibleSection
              level={2}
              icon="🎯"
              label="Resultado Final"
              description={hierarchy.resultadoFinal}
              defaultOpen
            >
              {/* Level 3: Resultados Intermedios */}
              {hierarchy.ris.map((ri) => {
                const allRiActs = Array.from(ri.productos.values()).flatMap((p) => p.acts);
                const riStats = getRiStats(allRiActs);
                const statusDot = riStats.status === "con_rezago" ? "🔴" : riStats.status === "al_dia" ? "🟢" : "🟡";

                return (
                  <CollapsibleSection
                    key={ri.codigo}
                    level={3}
                    icon="📊"
                    label={`${ri.codigo} — ${ri.desc.length > 100 ? ri.desc.slice(0, 100) + "…" : ri.desc}`}
                    defaultOpen
                    badge={
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {riStats.total} activ. | ${riStats.presupuesto.toLocaleString()} | {statusDot}
                      </span>
                    }
                    summary={
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground px-2 pb-2">
                        {riStats.counts.cerrada > 0 && <span>⚫ {riStats.counts.cerrada} cerradas</span>}
                        {riStats.counts.al_dia > 0 && <span>🟢 {riStats.counts.al_dia} al día</span>}
                        {riStats.counts.en_progreso > 0 && <span>🟡 {riStats.counts.en_progreso} en progreso</span>}
                        {riStats.counts.con_rezago > 0 && <span>🔴 {riStats.counts.con_rezago} con rezago</span>}
                        {riStats.counts.por_iniciar > 0 && <span>🔵 {riStats.counts.por_iniciar} por iniciar</span>}
                      </div>
                    }
                  >
                    {/* Level 4: Productos */}
                    {Array.from(ri.productos.values()).map((prod) => (
                      <CollapsibleSection
                        key={prod.codigo}
                        level={4}
                        icon="📦"
                        label={`${prod.codigo}. ${prod.desc.length > 120 ? prod.desc.slice(0, 120) + "…" : prod.desc}`}
                        defaultOpen
                      >
                        {/* Level 5: Actividades */}
                        {prod.acts.map((act) => {
                          const reported = reportsByActivity.get(act.actividad_codigo) || new Set();
                          const estado = calcEstado(act.meses_programados, currentYM, reported);
                          const ejecutado = countExecuted(reported);
                          const pctProgress = act.meta_total > 0 ? Math.min(100, (ejecutado / act.meta_total) * 100) : 0;
                          const pendientes = (act.meses_programados || []).filter((m) => m <= currentYM && !reported.has(m)).length;
                          const canReport = act.meses_programados.includes(currentYM) && !reported.has(currentYM);

                          return (
                            <ActividadCard
                              key={act.id}
                              actividad={act}
                              estado={estado}
                              ejecutado={ejecutado}
                              pctProgress={pctProgress}
                              pendientes={pendientes}
                              reported={reported}
                              currentYM={currentYM}
                              canReport={canReport}
                              onRegistrar={() => { setSelectedActividad(act); setDialogOpen(true); }}
                            />
                          );
                        })}
                      </CollapsibleSection>
                    ))}
                  </CollapsibleSection>
                );
              })}
            </CollapsibleSection>
          </CollapsibleSection>
        </CardContent>
      </Card>

      {selectedActividad && (
        <RegistroAvancePlanificacionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          actividad={selectedActividad}
          entidadId={entidadId!}
          ejecutadoHastaHoy={countExecuted(reportsByActivity.get(selectedActividad.actividad_codigo) || new Set())}
          onSaved={() => {
            setReportsByActivity((prev) => {
              const next = new Map(prev);
              const code = selectedActividad.actividad_codigo;
              const existing = next.get(code) || new Set();
              existing.add(currentYM);
              next.set(code, existing);
              return next;
            });
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ─── Collapsible section (levels 1-4) ─── */

function CollapsibleSection({
  level, icon, label, description, children, defaultOpen = false, badge, summary,
}: {
  level: 1 | 2 | 3 | 4;
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  summary?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const indentClass = level === 1 ? "" : level === 2 ? "ml-3" : level === 3 ? "ml-4" : "ml-5";
  const textSize = level <= 2 ? "text-sm font-semibold" : level === 3 ? "text-sm font-medium" : "text-xs font-medium";
  const borderColor = level <= 2 ? "border-primary/30" : level === 3 ? "border-primary/20" : "border-muted-foreground/20";

  return (
    <div className={cn("border-l-2 rounded-sm", borderColor, indentClass, level === 1 && "border-l-0")}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors rounded"
      >
        <span className="text-sm shrink-0">{icon}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className={cn(textSize, "text-foreground min-w-0")}>
          {label}
        </span>
        {badge && <span className="ml-auto shrink-0">{badge}</span>}
      </button>
      {open && (
        <div className="pb-1">
          {description && level <= 2 && (
            <p className="text-xs text-muted-foreground px-3 pb-2 pl-9">{description}</p>
          )}
          {summary}
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Activity card (level 5) ─── */

function ActividadCard({
  actividad: a, estado, ejecutado, pctProgress, pendientes, reported, currentYM, canReport, onRegistrar,
}: {
  actividad: PlanificacionActividad;
  estado: ActividadEstado;
  ejecutado: number;
  pctProgress: number;
  pendientes: number;
  reported: Set<string>;
  currentYM: string;
  canReport: boolean;
  onRegistrar: () => void;
}) {
  const cfg = ESTADO_CONFIG[estado];
  const Icon = cfg.icon;

  return (
    <div className="ml-6 border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 px-2">
              {a.actividad_codigo}
            </Badge>
            <Badge className={cn("text-[10px] gap-1", cfg.bgColor, cfg.color, "border-0")}>
              <Icon className="h-3 w-3" />
              {cfg.label}
              {pendientes > 0 && estado === "con_rezago" && ` — ${pendientes} pendiente${pendientes > 1 ? "s" : ""}`}
            </Badge>
          </div>
          <p className="text-sm text-foreground mt-1.5">{a.actividad_descripcion}</p>
        </div>
        {canReport && (
          <Button size="sm" variant="default" className="shrink-0 text-xs" onClick={onRegistrar}>
            <FileText className="h-3.5 w-3.5 mr-1" />
            Registrar avance
          </Button>
        )}
      </div>

      {/* Details row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Meta: {a.meta_total} {a.unidad_medida}</span>
        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> USD {a.presupuesto_seco_usd?.toLocaleString()}</span>
      </div>

      {/* Month badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] text-muted-foreground mr-1 self-center">Programación:</span>
        {(a.meses_programados || []).map((m) => {
          const isCurrent = m === currentYM;
          const isPast = m < currentYM;
          const isFuture = m > currentYM;
          const hasReport = reported.has(m);

          let badgeClass = "";
          let statusIcon = "";
          if (isPast && hasReport) { badgeClass = "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"; statusIcon = "✓"; }
          else if (isPast && !hasReport) { badgeClass = "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400"; statusIcon = "✗"; }
          else if (isCurrent) { badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse"; statusIcon = "●"; }
          else { badgeClass = "bg-muted text-muted-foreground border-muted-foreground/20"; statusIcon = "○"; }

          return (
            <Badge key={m} variant="outline" className={cn("text-[10px] gap-1 font-normal", badgeClass)}>
              {statusIcon} {formatYM(m)}
            </Badge>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Ejecutado: {ejecutado} de {a.meta_total} ({Math.round(pctProgress)}%)</span>
        </div>
        <Progress value={pctProgress} className="h-2" />
      </div>
    </div>
  );
}
