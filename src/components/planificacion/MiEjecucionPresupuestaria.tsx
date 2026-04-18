import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronDown, DollarSign, Info, Lock } from "lucide-react";
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
import {
  calcularEfectoPorActividad,
  presupuestoVigente,
  type ReasignacionPresupuestal,
  type ReasignacionAplicada,
} from "@/lib/reasignacionesPresupuestales";

/* ─── Helpers ─── */

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getCurrentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ─── Main component ─── */

interface Props {
  readOnly?: boolean;
  entidadCodigoOverride?: string;
}

export default function MiEjecucionPresupuestaria({ entidadCodigoOverride }: Props) {
  const { entidadId, entidades } = useRole();
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  // Solo cuenta ejecución aprobada (cerrada por Carmen). Se separa del histórico bloqueado.
  const [ejecutadoAprobado, setEjecutadoAprobado] = useState<Map<string, number>>(new Map());
  const [ejecutadoMesActual, setEjecutadoMesActual] = useState<Map<string, number>>(new Map());
  const [lastFinanciero, setLastFinanciero] = useState<Map<string, string>>(new Map());
  const [reasignacionesByAct, setReasignacionesByAct] = useState<Map<string, ReasignacionAplicada[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<PlanificacionFilterState>(EMPTY_FILTERS);

  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidadCodigoOverride || (entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null);
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
        .select("actividad_id, anio, mes, estado_registro, actividades!inner(codigo)")
        .eq("entidad_id", entidadId),
      (supabase as any)
        .from("ejecucion_financiera")
        .select(`
          actividad_id, monto, fecha_gasto, created_at,
          registros_mensuales!inner(anio, mes, estado_registro),
          actividades!inner(codigo)
        `)
        .eq("entidad_id", entidadId),
      (supabase as any)
        .from("reasignaciones_presupuestales")
        .select("*")
        .eq("entidad_codigo", entidadCodigo)
        .eq("estado", "aprobada"),
    ]).then(([planRes, regRes, efRes, reasigRes]: any[]) => {
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

      // Ejecución financiera: separar aprobado (histórico bloqueado) vs mes actual editable
      const ejAprobado = new Map<string, number>();
      const ejActual = new Map<string, number>();
      const lastFinMap = new Map<string, string>();
      const cur = getCurrentYM();
      if (efRes.data) {
        for (const ef of efRes.data) {
          const code = ef.actividades?.codigo;
          if (!code) continue;
          const monto = Number(ef.monto || 0);
          const reg = ef.registros_mensuales;
          const estado = reg?.estado_registro;
          const ym = reg ? `${reg.anio}-${String(reg.mes).padStart(2, "0")}` : null;

          if (estado === "aprobado") {
            ejAprobado.set(code, (ejAprobado.get(code) || 0) + monto);
          } else if (ym === cur) {
            // Mes actual aún editable (en revisión / borrador): se cuenta como ejecutado provisional
            ejActual.set(code, (ejActual.get(code) || 0) + monto);
          }
          if (!lastFinMap.has(code)) lastFinMap.set(code, ef.created_at);
        }
      }
      setEjecutadoAprobado(ejAprobado);
      setEjecutadoMesActual(ejActual);
      setLastFinanciero(lastFinMap);

      // Reasignaciones aprobadas → deltas por actividad
      const efectos = calcularEfectoPorActividad((reasigRes.data as ReasignacionPresupuestal[]) || []);
      setReasignacionesByAct(efectos);

      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  /* ─── Stats ─── */
  function getActStats(act: PlanificacionActividad) {
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const estado = calcEstado(act.meses_programados || [], currentYM, reported, 0, act.meta_total || 0);
    return { reported, estado };
  }

  function getFinMetrics(act: PlanificacionActividad) {
    const presupuestoOriginal = (act.presupuesto_seco_usd || 0) + (act.presupuesto_contrapartida_usd || 0);
    const ajustes = reasignacionesByAct.get(act.actividad_codigo);
    // Vigente = original + Σ deltas aprobados (mismo cálculo que Mi Planificación)
    const vigente = presupuestoVigente(presupuestoOriginal, ajustes);
    const aprobado = ejecutadoAprobado.get(act.actividad_codigo) || 0;
    const enCurso = ejecutadoMesActual.get(act.actividad_codigo) || 0;
    const ejecutado = aprobado + enCurso;
    const pendiente = Math.max(0, vigente - ejecutado);
    const pct = vigente > 0 ? Math.round((ejecutado / vigente) * 100) : 0;
    const tieneAjustes = !!(ajustes && ajustes.length > 0);
    return { vigente, original: presupuestoOriginal, aprobado, enCurso, ejecutado, pendiente, pct, tieneAjustes };
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
    let vigente = 0;
    let ejecutado = 0;
    for (const a of visible) {
      const m = getFinMetrics(a);
      vigente += m.vigente;
      ejecutado += m.ejecutado;
    }
    const pct = vigente > 0 ? Math.round((ejecutado / vigente) * 100) : 0;
    return { vigente, ejecutado, pendiente: Math.max(0, vigente - ejecutado), pct };
  }, [actividades, ejecutadoAprobado, ejecutadoMesActual, reasignacionesByAct, filters]);

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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Presupuesto vigente</p>
            <p className="text-xl font-bold text-foreground mt-1">USD {fmtUSD(globalTotals.vigente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Ejecutado</p>
            <p className="text-xl font-bold text-foreground mt-1">USD {fmtUSD(globalTotals.ejecutado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pendiente</p>
            <p className="text-xl font-bold text-foreground mt-1">USD {fmtUSD(globalTotals.pendiente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">% Ejecución</p>
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
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Los registros de periodos cerrados son de solo lectura. El presupuesto vigente proviene de Planificación y se actualiza al aprobarse una reasignación.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
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
                      let prodVigente = 0;
                      let prodEjecutado = 0;
                      for (const a of visibleActs) {
                        const m = getFinMetrics(a);
                        prodVigente += m.vigente;
                        prodEjecutado += m.ejecutado;
                      }
                      const prodPendiente = Math.max(0, prodVigente - prodEjecutado);
                      const prodPct = prodVigente > 0 ? Math.round((prodEjecutado / prodVigente) * 100) : 0;

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
                              <span>USD {fmtUSD(prodEjecutado)} / <span className="font-bold text-foreground">{fmtUSD(prodVigente)}</span></span>
                              <span className={cn("font-semibold", prodPct >= 80 ? "text-green-600" : prodPct >= 50 ? "text-yellow-600" : "text-red-600")}>
                                {prodPct}%
                              </span>
                            </span>
                          </button>

                          {!prodCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm ml-2">
                                <thead>
                                  <tr className="border-b text-[11px] text-muted-foreground">
                                    <th className="py-1.5 px-2 text-left">Actividad</th>
                                    <th className="py-1.5 px-2 text-right w-[120px]">Vigente</th>
                                    <th className="py-1.5 px-2 text-right w-[110px]">Ejecutado</th>
                                    <th className="py-1.5 px-2 text-right w-[110px]">Pendiente</th>
                                    <th className="py-1.5 px-2 text-left w-[180px]">% Ejecución</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleActs.map((act) => {
                                    const { vigente, original, ejecutado, aprobado, pendiente, pct, tieneAjustes } = getFinMetrics(act);
                                    const barColor =
                                      pct >= 80 ? "bg-green-500" :
                                      pct >= 50 ? "bg-yellow-500" : "bg-red-500";

                                    return (
                                      <tr key={act.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="py-2 px-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] font-bold text-primary shrink-0">{act.actividad_codigo}</span>
                                            <span className="text-xs text-foreground line-clamp-1 flex-1 min-w-0">{act.actividad_descripcion}</span>
                                            {aprobado > 0 && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="text-xs">
                                                  Incluye USD {fmtUSD(aprobado)} de periodos cerrados (solo lectura)
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
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
                                        <td className="py-2 px-2 text-right text-xs font-mono font-bold text-foreground">
                                          {tieneAjustes ? (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60">
                                                  {fmtUSD(vigente)}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="text-xs">
                                                Original USD {fmtUSD(original)} · ajustado por reasignaciones aprobadas
                                              </TooltipContent>
                                            </Tooltip>
                                          ) : (
                                            fmtUSD(vigente)
                                          )}
                                        </td>
                                        <td className="py-2 px-2 text-right text-xs font-mono">{fmtUSD(ejecutado)}</td>
                                        <td className="py-2 px-2 text-right text-xs font-mono text-muted-foreground">{fmtUSD(pendiente)}</td>
                                        <td className="py-2 px-2">
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                              <div
                                                className={cn("h-full rounded-full transition-all", barColor)}
                                                style={{ width: `${Math.min(100, pct)}%` }}
                                              />
                                            </div>
                                            <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right">{pct}%</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {/* Product totals row */}
                                  <tr className="bg-muted/40 font-semibold">
                                    <td className="py-1.5 px-2 text-xs">Total {prod.codigo}</td>
                                    <td className="py-1.5 px-2 text-right text-xs font-mono font-bold">{fmtUSD(prodVigente)}</td>
                                    <td className="py-1.5 px-2 text-right text-xs font-mono">{fmtUSD(prodEjecutado)}</td>
                                    <td className="py-1.5 px-2 text-right text-xs font-mono text-muted-foreground">{fmtUSD(prodPendiente)}</td>
                                    <td className="py-1.5 px-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={cn("h-full rounded-full",
                                              prodPct >= 80 ? "bg-green-500" :
                                              prodPct >= 50 ? "bg-yellow-500" : "bg-red-500"
                                            )}
                                            style={{ width: `${Math.min(100, prodPct)}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-semibold w-8 text-right">{prodPct}%</span>
                                      </div>
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
