import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight, ChevronDown, DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PlanificacionFilters, {
  type PlanificacionFilterState,
  EMPTY_FILTERS,
  hasActiveFilters,
} from "./PlanificacionFilters";
import {
  type PlanificacionActividad,
  getCurrentYearMonth,
  calcEstado,
} from "./MiPlanificacion";

/* ─── Period helpers ─── */

type PeriodType = "mes" | "trimestre" | "anio";

function getCurrentTrimestre(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

function getMonthsForPeriod(type: PeriodType): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (type === "mes") return [`${y}-${String(m).padStart(2, "0")}`];
  if (type === "trimestre") {
    const q = getCurrentTrimestre();
    const start = (q - 1) * 3 + 1;
    return [1, 2, 3].map((i) => `${y}-${String(start + i - 1).padStart(2, "0")}`);
  }
  return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
}

function getPeriodLabel(type: PeriodType): string {
  const now = new Date();
  const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  if (type === "mes") return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (type === "trimestre") return `T${getCurrentTrimestre()} ${now.getFullYear()}`;
  return `${now.getFullYear()}`;
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ─── Main component ─── */

interface Props {
  readOnly?: boolean;
  entidadCodigoOverride?: string;
}

export default function MiEjecucionPresupuestaria({ readOnly = false, entidadCodigoOverride }: Props) {
  const { entidadId, entidades } = useRole();
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [ejecutadoByActivity, setEjecutadoByActivity] = useState<Map<string, number>>(new Map());
  const [lastFinanciero, setLastFinanciero] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<PeriodType>("trimestre");
  const [filters, setFilters] = useState<PlanificacionFilterState>(EMPTY_FILTERS);

  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidadCodigoOverride || (entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null);
  const currentYM = getCurrentYearMonth();
  const periodMonths = useMemo(() => getMonthsForPeriod(period), [period]);

  useEffect(() => {
    if (!entidadCodigo) { setActividades([]); setLoading(false); return; }
    setLoading(true);

    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
      (supabase as any).from("registros_mensuales").select("actividad_id, anio, mes, avance_valor, estado_registro, actividades!inner(codigo)").eq("entidad_id", entidadId),
      (supabase as any).from("ejecucion_financiera").select("actividad_id, monto, fecha_gasto, created_at, actividades!inner(codigo)").eq("entidad_id", entidadId),
    ]).then(([planRes, regRes, efRes]: any[]) => {
      setActividades(planRes.data || []);

      // Reports by activity code
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

      // Financial execution by activity code (period-aware via fecha_gasto)
      const ejMap = new Map<string, number>();
      const lastFinMap = new Map<string, string>();
      if (efRes.data) {
        for (const ef of efRes.data) {
          const code = ef.actividades?.codigo;
          if (!code) continue;
          // Sum all financial records (period filtering done at render)
          const key = code;
          ejMap.set(key, (ejMap.get(key) || 0) + (ef.monto || 0));
          if (!lastFinMap.has(code)) lastFinMap.set(code, ef.created_at);
        }
      }
      setEjecutadoByActivity(ejMap);
      setLastFinanciero(lastFinMap);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  /* ─── Stats ─── */
  function getActStats(act: PlanificacionActividad) {
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = 0; // avance técnico not needed here
    const estado = calcEstado(act.meses_programados || [], currentYM, reported, ejecutado, act.meta_total || 0);
    return { reported, estado };
  }

  function getFinMetrics(act: PlanificacionActividad) {
    const presupuesto = (act.presupuesto_seco_usd || 0) + (act.presupuesto_contrapartida_usd || 0);
    const ejecutado = ejecutadoByActivity.get(act.actividad_codigo) || 0;
    const pendiente = Math.max(0, presupuesto - ejecutado);
    const meses = act.meses_programados || [];
    const mesesEnPeriodo = meses.filter((m) => periodMonths.includes(m)).length;
    const totalMeses = meses.length || 1;
    const programadoPeriodo = presupuesto * (mesesEnPeriodo / totalMeses);
    const pctEjecucion = presupuesto > 0 ? Math.round((ejecutado / presupuesto) * 100) : null;
    const pctVsProgramado = programadoPeriodo > 0 ? (ejecutado / programadoPeriodo) * 100 : null;
    return { presupuesto, ejecutado, pendiente, programadoPeriodo, pctEjecucion, pctVsProgramado };
  }

  function getSemaforo(pctVsProgramado: number | null): { color: string; dot: string; label: string } {
    if (pctVsProgramado === null) return { color: "text-muted-foreground", dot: "bg-gray-300", label: "Sin programación" };
    if (pctVsProgramado >= 80) return { color: "text-green-600", dot: "bg-green-500", label: "En línea" };
    if (pctVsProgramado >= 50) return { color: "text-yellow-600", dot: "bg-yellow-500", label: "Atención" };
    return { color: "text-red-600", dot: "bg-red-500", label: "Crítico" };
  }

  function getWorstSemaforo(acts: PlanificacionActividad[]): { color: string; dot: string; label: string } {
    let worst: number | null = null;
    for (const a of acts) {
      const { pctVsProgramado } = getFinMetrics(a);
      if (pctVsProgramado !== null && (worst === null || pctVsProgramado < worst)) worst = pctVsProgramado;
    }
    return getSemaforo(worst);
  }

  /* ─── Filter logic ─── */
  function matchesFilters(act: PlanificacionActividad): boolean {
    const { estado, reported } = getActStats(act);
    const f = filters;
    if (f.estados.length > 0) {
      const estadoGroup =
        estado === "con_rezago" ? "con_rezago" :
        ["entregable_este_mes", "en_progreso", "al_dia"].includes(estado) ? "en_proceso" :
        estado === "completada" ? "completada" : "por_iniciar";
      if (!f.estados.includes(estadoGroup)) return false;
    }
    if (f.avanceTecnico === "con_registro" && reported.size === 0) return false;
    if (f.avanceTecnico === "sin_registro" && reported.size > 0) return false;
    if (f.avancePresupuestario === "con_registro" && !lastFinanciero.has(act.actividad_codigo)) return false;
    if (f.avancePresupuestario === "sin_registro" && lastFinanciero.has(act.actividad_codigo)) return false;
    return true;
  }

  const filtersActive = hasActiveFilters(filters);
  const totalActCount = actividades.length;
  const filteredActCount = filtersActive ? actividades.filter(matchesFilters).length : totalActCount;

  /* ─── Hierarchy ─── */
  const hierarchy = useMemo(() => {
    if (!actividades.length) return null;
    const first = actividades[0];
    const riMap = new Map<string, {
      codigo: string; desc: string;
      productos: Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }>;
    }>();
    for (const a of actividades) {
      const riKey = a.resultado_intermedio_codigo;
      if (!riMap.has(riKey)) riMap.set(riKey, { codigo: riKey, desc: a.resultado_intermedio_descripcion, productos: new Map() });
      const ri = riMap.get(riKey)!;
      const pKey = a.producto_codigo;
      if (!ri.productos.has(pKey)) ri.productos.set(pKey, { codigo: pKey, desc: a.producto_descripcion, acts: [] });
      ri.productos.get(pKey)!.acts.push(a);
    }
    return {
      proyectoNombre: first.proyecto_nombre,
      entidadNombre: first.entidad_nombre,
      mecanismo: first.mecanismo,
      ris: Array.from(riMap.values()),
    };
  }, [actividades]);

  /* ─── Global totals ─── */
  const globalTotals = useMemo(() => {
    const visible = filtersActive ? actividades.filter(matchesFilters) : actividades;
    let presupuesto = 0;
    let ejecutado = 0;
    for (const a of visible) {
      const m = getFinMetrics(a);
      presupuesto += m.presupuesto;
      ejecutado += m.ejecutado;
    }
    const pct = presupuesto > 0 ? Math.round((ejecutado / presupuesto) * 100) : 0;
    return { presupuesto, ejecutado, pct };
  }, [actividades, ejecutadoByActivity, filters, periodMonths]);

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (!entidadCodigo) return null;

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader><CardTitle>Mi Ejecución Presupuestaria</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Mi Ejecución Presupuestaria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay actividades configuradas aún.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Presupuesto total</p>
            <p className="text-xl font-bold text-foreground mt-1">USD {fmtUSD(globalTotals.presupuesto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total ejecutado</p>
            <p className="text-xl font-bold text-foreground mt-1">USD {fmtUSD(globalTotals.ejecutado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">% Ejecución global</p>
            <div className="flex items-center gap-3 mt-1">
              <p className={cn("text-xl font-bold", globalTotals.pct >= 80 ? "text-green-600" : globalTotals.pct >= 50 ? "text-yellow-600" : "text-red-600")}>
                {globalTotals.pct}%
              </p>
              <Progress value={globalTotals.pct} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" />
            Ejecución Presupuestaria por Actividad
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {hierarchy.proyectoNombre} · {hierarchy.entidadNombre} · Mecanismo {hierarchy.mecanismo}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Period selector */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(["mes", "trimestre", "anio"] as PeriodType[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "ghost"}
                  className={cn("h-7 text-xs px-3", period === p && "shadow-sm")}
                  onClick={() => setPeriod(p)}
                >
                  {p === "mes" ? "Mes" : p === "trimestre" ? "Trimestre" : "Año"}
                </Button>
              ))}
            </div>
            <Badge variant="outline" className="text-xs">{getPeriodLabel(period)}</Badge>
          </div>

          {/* Filters */}
          <PlanificacionFilters
            filters={filters}
            onChange={setFilters}
            totalCount={totalActCount}
            filteredCount={filteredActCount}
          />

          {/* Hierarchy */}
          {hierarchy.ris.map((ri) => {
            const allRiActs = Array.from(ri.productos.values()).flatMap((p) => p.acts);
            const filteredRiActs = filtersActive ? allRiActs.filter(matchesFilters) : allRiActs;
            if (filtersActive && filteredRiActs.length === 0) return null;
            const riKey = `ri-${ri.codigo}`;
            const riCollapsed = collapsedSections.has(riKey);

            return (
              <div key={ri.codigo}>
                <button
                  onClick={() => toggleSection(riKey)}
                  className="flex items-center gap-2 w-full text-left px-2 py-2 rounded hover:bg-muted/50 transition-colors"
                >
                  {riCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-sm">📊</span>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">
                    {ri.codigo} — {ri.desc}
                  </span>
                </button>

                {!riCollapsed && (
                  <div className="ml-2">
                    {Array.from(ri.productos.values()).map((prod) => {
                      const filteredProdActs = filtersActive ? prod.acts.filter(matchesFilters) : prod.acts;
                      if (filtersActive && filteredProdActs.length === 0) return null;
                      const prodKey = `prod-${prod.codigo}`;
                      const prodCollapsed = collapsedSections.has(prodKey);
                      const visibleActs = filtersActive ? filteredProdActs : prod.acts;

                      // Product summary
                      let prodPresupuesto = 0;
                      let prodEjecutado = 0;
                      for (const a of visibleActs) {
                        const m = getFinMetrics(a);
                        prodPresupuesto += m.presupuesto;
                        prodEjecutado += m.ejecutado;
                      }
                      const prodPct = prodPresupuesto > 0 ? Math.round((prodEjecutado / prodPresupuesto) * 100) : 0;
                      const prodSemaforo = getWorstSemaforo(visibleActs);

                      return (
                        <div key={prod.codigo} className="ml-3">
                          <button
                            onClick={() => toggleSection(prodKey)}
                            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                          >
                            {prodCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-xs">📦</span>
                            <span className="text-xs font-medium text-foreground truncate flex-1">
                              {prod.codigo}. {prod.desc}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-3">
                              <span>USD {fmtUSD(prodEjecutado)} / {fmtUSD(prodPresupuesto)}</span>
                              <span className={cn("font-semibold", prodPct >= 80 ? "text-green-600" : prodPct >= 50 ? "text-yellow-600" : "text-red-600")}>
                                {prodPct}%
                              </span>
                              <span className={cn("h-2.5 w-2.5 rounded-full inline-block", prodSemaforo.dot)} />
                            </span>
                          </button>

                          {!prodCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm ml-2">
                                <thead>
                                  <tr className="border-b text-[11px] text-muted-foreground">
                                    <th className="py-1.5 px-2 text-center w-[55px]">Cód.</th>
                                    <th className="py-1.5 px-2 text-left">Actividad</th>
                                    <th className="py-1.5 px-2 text-right w-[100px]">Presupuesto</th>
                                    <th className="py-1.5 px-2 text-right w-[90px]">Ejecutado</th>
                                    <th className="py-1.5 px-2 text-right w-[90px]">Pendiente</th>
                                    <th className="py-1.5 px-2 text-right w-[90px]">Prog. período</th>
                                    <th className="py-1.5 px-2 text-center w-[65px]">% Ejec.</th>
                                    <th className="py-1.5 px-2 text-center w-[45px]">Alerta</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleActs.map((act) => {
                                    const { presupuesto, ejecutado, pendiente, programadoPeriodo, pctEjecucion, pctVsProgramado } = getFinMetrics(act);
                                    const semaforo = getSemaforo(pctVsProgramado);

                                    return (
                                      <tr key={act.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="py-2 px-2 text-center font-mono text-xs font-bold text-primary">{act.actividad_codigo}</td>
                                        <td className="py-2 px-2">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-xs text-foreground line-clamp-1">{act.actividad_descripcion}</span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-sm text-xs">{act.actividad_descripcion}</TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="py-2 px-2 text-right text-xs font-mono">{fmtUSD(presupuesto)}</td>
                                        <td className="py-2 px-2 text-right text-xs font-mono font-semibold">{fmtUSD(ejecutado)}</td>
                                        <td className="py-2 px-2 text-right text-xs font-mono text-muted-foreground">{fmtUSD(pendiente)}</td>
                                        <td className="py-2 px-2 text-right text-xs font-mono text-muted-foreground">{fmtUSD(Math.round(programadoPeriodo))}</td>
                                        <td className={cn("py-2 px-2 text-center text-xs font-semibold", semaforo.color)}>
                                          {pctEjecucion !== null ? `${pctEjecucion}%` : "—"}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className={cn("inline-block h-3 w-3 rounded-full", semaforo.dot)} />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">{semaforo.label}</TooltipContent>
                                          </Tooltip>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {/* Product totals row */}
                                  <tr className="bg-muted/40 font-semibold">
                                    <td className="py-1.5 px-2" />
                                    <td className="py-1.5 px-2 text-xs">Total {prod.codigo}</td>
                                    <td className="py-1.5 px-2 text-right text-xs font-mono">{fmtUSD(prodPresupuesto)}</td>
                                    <td className="py-1.5 px-2 text-right text-xs font-mono">{fmtUSD(prodEjecutado)}</td>
                                    <td className="py-1.5 px-2 text-right text-xs font-mono text-muted-foreground">{fmtUSD(prodPresupuesto - prodEjecutado)}</td>
                                    <td className="py-1.5 px-2" />
                                    <td className={cn("py-1.5 px-2 text-center text-xs", prodPct >= 80 ? "text-green-600" : prodPct >= 50 ? "text-yellow-600" : "text-red-600")}>
                                      {prodPct}%
                                    </td>
                                    <td className="py-1.5 px-2 text-center">
                                      <span className={cn("inline-block h-3 w-3 rounded-full", prodSemaforo.dot)} />
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
