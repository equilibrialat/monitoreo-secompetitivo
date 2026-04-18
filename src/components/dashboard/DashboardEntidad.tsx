import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/contexts/RoleContext";
import { useDashboardData, type DashboardEntidad as DashboardEntidadType } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, CheckCircle2, AlertTriangle, Target,
  Activity, TrendingUp, DollarSign, Calendar, ArrowRight, FileText, Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type PlanificacionActividad, getCurrentYearMonth, formatYM } from "@/components/planificacion/MiPlanificacion";
import ModalAvanceTecnico from "@/components/planificacion/ModalAvanceTecnico";
import ModalAvancePresupuestario from "@/components/planificacion/ModalAvancePresupuestario";

/* ─── Helpers ─── */

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type ActivityLifecycle = "completada" | "vencida" | "entregable_este_mes" | "en_curso" | "por_iniciar";

/* ─── Main component ─── */

export default function DashboardEntidad() {
  const { entidadId, entidades: entidadOptions } = useRole();
  const { data: dashData, isLoading: dashLoading } = useDashboardData();
  const navigate = useNavigate();

  const entidad = entidadOptions.find((e) => e.id === entidadId);
  const entidadCodigo = (entidad as any)?.codigo || (entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null);
  const ent = dashData?.find((e) => e.entidad_id === entidadId);

  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [compsByActivity, setCompsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
  const [actIdMap, setActIdMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [modalTecnico, setModalTecnico] = useState<{ open: boolean; act: PlanificacionActividad | null }>({ open: false, act: null });
  const [modalPresup, setModalPresup] = useState<{ open: boolean; act: PlanificacionActividad | null }>({ open: false, act: null });

  const currentYM = getCurrentYearMonth();
  const currentMes = parseInt(currentYM.split("-")[1]);
  const currentYear = parseInt(currentYM.split("-")[0]);

  const loadData = useCallback(() => {
    if (!entidadCodigo || !entidadId) { setLoading(false); return; }
    setLoading(true);

    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
      (supabase as any).from("registros_mensuales").select("actividad_id, anio, mes, avance_valor, estado_registro, actividades!inner(codigo)").eq("entidad_id", entidadId),
      (supabase as any).from("actividades").select("id, codigo").eq("entidad_id", entidadId),
      (supabase as any).from("comprobantes").select("actividad_codigo, mes").eq("entidad_codigo", entidadCodigo),
    ]).then(([planRes, regRes, actRes, compRes]: any[]) => {
      setActividades(planRes.data || []);

      const idMap = new Map<string, string>();
      if (actRes.data) for (const a of actRes.data) idMap.set(a.codigo, a.id);
      setActIdMap(idMap);

      const byCode = new Map<string, Set<string>>();
      const avanceMap = new Map<string, number>();
      if (regRes.data) {
        for (const r of regRes.data) {
          const code = r.actividades?.codigo;
          if (!code) continue;
          const ym = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
          if (!byCode.has(code)) byCode.set(code, new Set());
          byCode.get(code)!.add(ym);
          // Count all records (including borradores) for avance
          avanceMap.set(code, (avanceMap.get(code) || 0) + (r.avance_valor || 0));
        }
      }
      setReportsByActivity(byCode);
      setAvanceByActivity(avanceMap);

      // Build comprobantes map: actividad_codigo -> Set of "YYYY-MM"
      // The `mes` column in comprobantes can be either "YYYY-MM" or just month name; normalize.
      const compMap = new Map<string, Set<string>>();
      if (compRes.data) {
        for (const c of compRes.data) {
          const code = c.actividad_codigo;
          if (!code) continue;
          const ym = String(c.mes || "").length >= 7 ? String(c.mes).slice(0, 7) : String(c.mes);
          if (!compMap.has(code)) compMap.set(code, new Set());
          compMap.get(code)!.add(ym);
        }
      }
      setCompsByActivity(compMap);

      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Lifecycle classification ─── */
  function getLifecycle(act: PlanificacionActividad): ActivityLifecycle {
    const meses = (act.meses_programados || []) as string[];
    if (!meses.length) return "por_iniciar";
    const sorted = [...meses].sort();
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;

    const allPast = sorted.every(m => m <= currentYM);
    const allReported = sorted.every(m => reported.has(m));
    if (allPast && allReported) return "completada";

    const pastWithout = sorted.filter(m => m < currentYM && !reported.has(m));
    if (pastWithout.length > 0) return "vencida";

    if (sorted.includes(currentYM) && !reported.has(currentYM)) return "entregable_este_mes";
    if (sorted[0] > currentYM) return "por_iniciar";
    return "en_curso";
  }

  /* ─── Computed KPIs ─── */
  const kpis = useMemo(() => {
    const total = actividades.length;
    let completadas = 0;
    let vencidas = 0;
    let totalAvancePct = 0;
    let presupuestoTotal = 0;
    let ejecutadoTotal = 0;

    for (const act of actividades) {
      const lifecycle = getLifecycle(act);
      if (lifecycle === "completada") completadas++;
      if (lifecycle === "vencida") vencidas++;

      // Avance based on reported months / total scheduled months
      const meses = (act.meses_programados || []) as string[];
      const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
      if (meses.length > 0) {
        const reportedCount = meses.filter(m => reported.has(m)).length;
        totalAvancePct += (reportedCount / meses.length) * 100;
      }

      presupuestoTotal += (act.presupuesto_seco_usd || 0);
    }

    // Use ent data for financial if available
    ejecutadoTotal = ent?.ejecutado_seco_total || 0;
    presupuestoTotal = ent?.presupuesto_seco_total || presupuestoTotal;

    const avanceProducto = total > 0 ? Math.round(totalAvancePct / total) : 0;
    const nivelCumplimiento = total > 0 ? Math.round((completadas / total) * 100) : 0;
    const contribucionProducto = presupuestoTotal > 0 ? Math.round((ejecutadoTotal / presupuestoTotal) * 100) : 0;

    return { total, completadas, vencidas, avanceProducto, nivelCumplimiento, contribucionProducto };
  }, [actividades, reportsByActivity, avanceByActivity, ent, currentYM]);

  /* ─── Activities with pending deliverables (replaces tareasDelMes) ─── */
  type ActividadDesglose = PlanificacionActividad & {
    rezagados: number;
    esteMes: boolean;
    pendientes: number;
    reportados: number;
  };

  const actividadesConPendientes = useMemo(() => {
    const result: ActividadDesglose[] = [];
    for (const act of actividades) {
      const meses = (act.meses_programados || []) as string[];
      if (!meses.length) continue;
      const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();

      let rezagados = 0;
      let esteMes = false;
      let pendientes = 0;
      let reportadosCount = 0;

      for (const m of meses) {
        if (reported.has(m)) { reportadosCount++; continue; }
        if (m < currentYM) rezagados++;
        else if (m === currentYM) esteMes = true;
        else pendientes++;
      }

      if (rezagados > 0 || esteMes) {
        result.push({ ...act, rezagados, esteMes, pendientes, reportados: reportadosCount });
      }
    }
    // Sort: esteMes first, then by rezagados desc
    result.sort((a, b) => {
      if (a.esteMes !== b.esteMes) return a.esteMes ? -1 : 1;
      return b.rezagados - a.rezagados;
    });
    return result;
  }, [actividades, reportsByActivity, avanceByActivity, currentYM]);

  /* ─── Render ─── */

  if (dashLoading || loading) return <DashboardSkeleton />;

  if (!entidadCodigo) {
    if (!ent) return <div className="text-muted-foreground text-center py-12">Selecciona una entidad en el panel lateral.</div>;
    return (
      <div>
        <Header title="Mi Dashboard" subtitle={ent.nombre_corto} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <KpiCard icon={Activity} label="Actividades" value={`${ent.actividades_completadas}/${ent.total_actividades}`} sub="completadas" />
          <KpiCard icon={TrendingUp} label="Avance Operativo" value={`${ent.avance_operativo_promedio ?? 0}%`} sub="promedio" />
          <KpiCard icon={DollarSign} label="Ejecución SECO" value={`${ent.pct_ejecucion_seco}%`} sub={`USD ${fmt(ent.ejecutado_seco_total)} / ${fmt(ent.presupuesto_seco_total)}`} />
        </div>
      </div>
    );
  }

  const entidadNombre = entidad?.nombre_corto || entidadCodigo;

  return (
    <div className="space-y-5">
      {/* Header */}
      <Header title={`Hola, ${entidadNombre} 👋`} subtitle={`${MONTH_NAMES[currentMes - 1]} ${currentYear}`} />

      {/* ═══ SECCIÓN A — KPI Cards ═══ */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            icon={TrendingUp}
            label="% Avance del producto"
            value={`${kpis.avanceProducto}%`}
            accent={kpis.avanceProducto >= 50 ? "green" : kpis.avanceProducto >= 25 ? "amber" : "red"}
            tooltip="Promedio de entregables reportados respecto al total de meses programados por actividad."
          />
          <KpiCard
            icon={Target}
            label="Nivel de cumplimiento"
            value={`${kpis.nivelCumplimiento}%`}
            accent={kpis.nivelCumplimiento >= 70 ? "green" : kpis.nivelCumplimiento >= 40 ? "amber" : "red"}
            tooltip="Porcentaje de actividades que ya reportaron todos sus entregables programados."
          />
          <KpiCard
            icon={Activity}
            label="Total de actividades"
            value={String(kpis.total)}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Actividades completadas"
            value={String(kpis.completadas)}
            accent="green"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Actividades vencidas"
            value={String(kpis.vencidas)}
            accent={kpis.vencidas > 0 ? "red" : "green"}
            tooltip="Actividades con entregables cuyo mes programado ya pasó sin registro."
            onClick={() => navigate("/mi-planificacion")}
          />
          <KpiCard
            icon={DollarSign}
            label="Contribución al producto"
            value={`${kpis.contribucionProducto}%`}
            accent={kpis.contribucionProducto >= 50 ? "green" : "amber"}
            tooltip="Porcentaje de ejecución financiera SECO respecto al presupuesto asignado."
          />
        </div>
      </TooltipProvider>

      {/* ═══ SECCIÓN B — Lo que toca entregar este mes ═══ */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Lo que toca entregar este mes
        </p>

        {(() => {
          const tareasEsteMes = actividadesConPendientes.filter((a) => a.esteMes);
          const totalRezagados = actividadesConPendientes.reduce((s, a) => s + a.rezagados, 0);
          const totalPendientes = actividadesConPendientes.reduce((s, a) => s + a.pendientes, 0);
          const totalReportados = actividadesConPendientes.reduce((s, a) => s + a.reportados, 0);

          return (
            <>
              {tareasEsteMes.length === 0 ? (
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="py-4">
                    <p className="text-sm text-foreground">✓ No tienes entregables programados para este mes.</p>
                  </CardContent>
                </Card>
              ) : (
                tareasEsteMes.map((act) => (
                  <Card key={act.actividad_codigo} className="border-l-4 border-l-yellow-500">
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-start gap-1.5">
                            <p className="text-sm font-semibold flex-1 min-w-0">
                              {act.actividad_codigo} — {act.actividad_descripcion}
                            </p>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0 mt-0.5" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[280px] text-xs space-y-1">
                                  <p className="font-medium leading-snug">{act.actividad_descripcion}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    <span className="font-semibold">Unidad:</span> {act.unidad_medida || "—"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    <span className="font-semibold">Meta planificada:</span> {act.meta_total ?? "—"} {act.unidad_medida || ""}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-yellow-300 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
                            🟡 Entregable este mes
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button size="sm" className="text-xs" onClick={() => setModalTecnico({ open: true, act })}>
                            Av. Técnico <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => setModalPresup({ open: true, act })}>
                            Av. Presup. <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* ─── Summary badges → link to /mi-planificacion ─── */}
              <div className="flex flex-wrap gap-2 mt-1">
                {totalRezagados > 0 && (
                  <button
                    onClick={() => navigate("/mi-planificacion")}
                    className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    🔴 {totalRezagados} entregable{totalRezagados > 1 ? "s" : ""} rezagado{totalRezagados > 1 ? "s" : ""}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                )}
                {totalReportados > 0 && (
                  <button
                    onClick={() => navigate("/mi-planificacion")}
                    className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    🟢 {totalReportados} reportado{totalReportados > 1 ? "s" : ""}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                )}
                {totalPendientes > 0 && (
                  <button
                    onClick={() => navigate("/mi-planificacion")}
                    className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    ⚪ {totalPendientes} pendiente{totalPendientes > 1 ? "s" : ""} futuro{totalPendientes > 1 ? "s" : ""}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                )}
                {kpis.completadas > 0 && (
                  <button
                    onClick={() => navigate("/mi-planificacion")}
                    className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ✅ {kpis.completadas} actividad{kpis.completadas > 1 ? "es" : ""} completada{kpis.completadas > 1 ? "s" : ""}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pb-4">
        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/mi-planificacion")}>
          Ver planificación completa
        </Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/generar-reportes")}>
          <FileText className="h-3 w-3 mr-1" /> Generar Reportes
        </Button>
      </div>

      {/* Modal avance técnico */}
      {modalTecnico.act && (
        <ModalAvanceTecnico
          open={modalTecnico.open}
          onOpenChange={(o) => setModalTecnico({ open: o, act: o ? modalTecnico.act : null })}
          actividadCodigo={modalTecnico.act.actividad_codigo}
          actividadDescripcion={modalTecnico.act.actividad_descripcion}
          actividadId={actIdMap.get(modalTecnico.act.actividad_codigo)}
          entidadId={entidadId || ""}
          onSaved={loadData}
          mesesProgramados={(modalTecnico.act.meses_programados || []) as string[]}
          mesesReportados={reportsByActivity.get(modalTecnico.act.actividad_codigo) || new Set()}
        />
      )}
      {/* Modal avance presupuestario */}
      {modalPresup.act && (
        <ModalAvancePresupuestario
          open={modalPresup.open}
          onOpenChange={(o) => setModalPresup({ open: o, act: o ? modalPresup.act : null })}
          actividadCodigo={modalPresup.act.actividad_codigo}
          actividadDescripcion={modalPresup.act.actividad_descripcion}
          actividadId={actIdMap.get(modalPresup.act.actividad_codigo)}
          entidadId={entidadId || ""}
          onSaved={loadData}
          mesesProgramados={(modalPresup.act.meses_programados || []) as string[]}
          mesesReportados={reportsByActivity.get(modalPresup.act.actividad_codigo) || new Set()}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 shrink-0">
        <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

type AccentColor = "green" | "amber" | "red" | undefined;

export function KpiCard({ icon: Icon, label, value, sub, accent, tooltip, onClick }: { icon: typeof Activity; label: string; value: string; sub?: string; accent?: AccentColor; tooltip?: string; onClick?: () => void }) {
  const accentBorder = accent === "green" ? "border-green-200 dark:border-green-800" :
                       accent === "amber" ? "border-amber-200 dark:border-amber-800" :
                       accent === "red" ? "border-red-200 dark:border-red-800" : "";
  const accentIcon = accent === "green" ? "text-green-600" :
                     accent === "amber" ? "text-amber-600" :
                     accent === "red" ? "text-red-600" : "text-primary";

  return (
    <Card className={cn(accentBorder, onClick && "cursor-pointer hover:shadow-md hover:border-primary/30 transition-all")} onClick={onClick}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${accentIcon}`} />
          <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ClickableKpiCard({ label, value, sub, onClick, className }: { label: string; value: string; sub?: string; onClick: () => void; className?: string }) {
  return (
    <Card className={`cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group ${className || ""}`} onClick={onClick}>
      <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        <p className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1">Ver detalle →</p>
      </CardContent>
    </Card>
  );
}

export function Semaforo({ desfase }: { desfase: number }) {
  const abs = Math.abs(desfase);
  const color = abs < 15 ? "bg-green-500" : abs < 30 ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} title={`Desfase: ${desfase}%`} />;
}

export function MecanismoBadge({ mec }: { mec: string }) {
  const isA = mec === "A" || mec === "mec_a";
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold border ${
      isA
        ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
        : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
    }`}>
      Mec. {isA ? "A" : "B"}
    </span>
  );
}

export function fmt(n: number) {
  return n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-10 w-16" /></CardContent></Card>
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    </div>
  );
}
