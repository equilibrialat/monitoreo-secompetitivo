import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ChevronDown, BarChart3, Target, Info,
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
  type ActividadEstado,
  getCurrentYearMonth,
  formatYM,
  calcEstado,
  ESTADO_CONFIG,
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

  if (type === "mes") {
    return [`${y}-${String(m).padStart(2, "0")}`];
  }
  if (type === "trimestre") {
    const q = getCurrentTrimestre();
    const start = (q - 1) * 3 + 1;
    return [1, 2, 3].map((i) => `${y}-${String(start + i - 1).padStart(2, "0")}`);
  }
  // anio
  return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
}

function getPeriodLabel(type: PeriodType): string {
  const now = new Date();
  const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  if (type === "mes") return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (type === "trimestre") return `T${getCurrentTrimestre()} ${now.getFullYear()}`;
  return `${now.getFullYear()}`;
}

/* ─── Main component ─── */

interface Props {
  readOnly?: boolean;
  entidadCodigoOverride?: string;
}

export default function MiEjecucionTecnica({ readOnly = false, entidadCodigoOverride }: Props) {
  const { entidadId, entidades } = useRole();
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
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
      (supabase as any).from("ejecucion_financiera").select("actividad_id, created_at, actividades!inner(codigo)").eq("entidad_id", entidadId).order("created_at", { ascending: false }),
    ]).then(([planRes, regRes, efRes]: any[]) => {
      setActividades(planRes.data || []);

      const byCode = new Map<string, Set<string>>();
      const avanceMap = new Map<string, number>();
      if (regRes.data) {
        for (const r of regRes.data) {
          const code = r.actividades?.codigo;
          if (!code) continue;
          const ym = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
          if (!byCode.has(code)) byCode.set(code, new Set());
          byCode.get(code)!.add(ym);
          if (r.estado_registro !== "borrador") {
            avanceMap.set(code, (avanceMap.get(code) || 0) + (r.avance_valor || 0));
          }
        }
      }
      setReportsByActivity(byCode);
      setAvanceByActivity(avanceMap);

      const lastFinMap = new Map<string, string>();
      if (efRes.data) {
        for (const ef of efRes.data) {
          const code = ef.actividades?.codigo;
          if (!code || lastFinMap.has(code)) continue;
          lastFinMap.set(code, ef.created_at);
        }
      }
      setLastFinanciero(lastFinMap);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  /* ─── Compute per-activity stats ─── */
  function getActStats(act: PlanificacionActividad) {
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;
    const estado = calcEstado(act.meses_programados || [], currentYM, reported, ejecutado, act.meta_total || 0);
    return { reported, ejecutado, estado };
  }

  /* ─── Period-scoped metrics ─── */
  function getPeriodMetrics(act: PlanificacionActividad) {
    const meses = act.meses_programados || [];
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    // Meta = how many programmed months fall inside this period
    const metaPeriodo = meses.filter((m) => periodMonths.includes(m)).length;
    // Reportado = how many of those period months have a report
    const reportadoPeriodo = meses.filter((m) => periodMonths.includes(m) && reported.has(m)).length;
    const pctAvance = metaPeriodo > 0 ? Math.round((reportadoPeriodo / metaPeriodo) * 100) : null;
    return { metaPeriodo, reportadoPeriodo, pctAvance };
  }

  function getSemaforo(pct: number | null): { color: string; dot: string; label: string } {
    if (pct === null) return { color: "text-muted-foreground", dot: "bg-gray-300", label: "Sin meta" };
    if (pct >= 80) return { color: "text-green-600", dot: "bg-green-500", label: "Bueno" };
    if (pct >= 50) return { color: "text-yellow-600", dot: "bg-yellow-500", label: "Medio" };
    return { color: "text-red-600", dot: "bg-red-500", label: "Bajo" };
  }

  /* ─── Filter logic (reused from MiPlanificacion) ─── */
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

  /* ─── Build hierarchy ─── */
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
        <CardHeader><CardTitle>Mi Ejecución Técnica</CardTitle></CardHeader>
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
            <BarChart3 className="h-5 w-5 text-primary" />
            Mi Ejecución Técnica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay actividades configuradas aún.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Mi Ejecución Técnica
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
          <Badge variant="outline" className="text-xs">
            {getPeriodLabel(period)}
          </Badge>
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

                    // Product summary
                    const visibleActs = filtersActive ? filteredProdActs : prod.acts;
                    const actsWithReport = visibleActs.filter((a) => {
                      const rep = reportsByActivity.get(a.actividad_codigo) || new Set();
                      const meses = a.meses_programados || [];
                      return meses.some((m) => periodMonths.includes(m) && rep.has(m));
                    }).length;
                    const pctProducto = visibleActs.length > 0 ? Math.round((actsWithReport / visibleActs.length) * 100) : 0;

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
                          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-2">
                            <span>{actsWithReport}/{visibleActs.length} reportadas</span>
                            <span className={cn(
                              "font-semibold",
                              pctProducto >= 80 ? "text-green-600" : pctProducto >= 50 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {pctProducto}%
                            </span>
                          </span>
                        </button>

                        {!prodCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm ml-2">
                              <thead>
                                <tr className="border-b text-[11px] text-muted-foreground">
                                  <th className="py-1.5 px-2 text-center w-[60px]">Cód.</th>
                                  <th className="py-1.5 px-2 text-left">Actividad</th>
                                  <th className="py-1.5 px-2 text-left w-[90px]">Unidad</th>
                                  <th className="py-1.5 px-2 text-center w-[70px]">Meta período</th>
                                  <th className="py-1.5 px-2 text-center w-[70px]">Reportado</th>
                                  <th className="py-1.5 px-2 text-center w-[70px]">% Avance</th>
                                  <th className="py-1.5 px-2 text-center w-[50px]">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleActs.map((act) => {
                                  const { metaPeriodo, reportadoPeriodo, pctAvance } = getPeriodMetrics(act);
                                  const semaforo = getSemaforo(pctAvance);

                                  return (
                                    <tr key={act.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                      <td className="py-2 px-2 text-center font-mono text-xs font-bold text-primary">{act.actividad_codigo}</td>
                                      <td className="py-2 px-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs text-foreground line-clamp-1 flex-1 min-w-0">{act.actividad_descripcion}</span>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
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
                                        </div>
                                      </td>
                                      <td className="py-2 px-2 text-xs text-muted-foreground">{act.unidad_medida}</td>
                                      <td className="py-2 px-2 text-center text-xs font-semibold">
                                        {metaPeriodo > 0 ? metaPeriodo : "—"}
                                      </td>
                                      <td className="py-2 px-2 text-center text-xs font-mono">
                                        {metaPeriodo > 0 ? reportadoPeriodo : "—"}
                                      </td>
                                      <td className={cn("py-2 px-2 text-center text-xs font-semibold", semaforo.color)}>
                                        {pctAvance !== null ? `${pctAvance}%` : "—"}
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
  );
}
