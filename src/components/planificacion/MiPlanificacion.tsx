import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ChevronDown, Calendar, Target, DollarSign,
  CheckCircle2, Circle, Clock, AlertTriangle, Lock, Star,
  FileEdit, Wallet, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import ModalAvanceTecnico from "./ModalAvanceTecnico";
import ModalAvancePresupuestario from "./ModalAvancePresupuestario";
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

/* ─── Types ─── */

export interface PlanificacionActividad {
  id: string;
  entidad_codigo: string;
  entidad_nombre: string;
  proyecto_codigo: string;
  proyecto_nombre: string;
  mecanismo: string;
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
  presupuesto_contrapartida_usd: number;
  meses_programados: string[];
  responsable: string;
}

export type ActividadEstado =
  | "entregable_este_mes"
  | "con_rezago"
  | "en_progreso"
  | "al_dia"
  | "completada"
  | "por_iniciar";

/* ─── Helpers ─── */

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function formatYM(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES_SHORT[parseInt(m) - 1]}-${y.slice(2)}`;
}

export function calcEstado(
  meses: string[],
  currentYM: string,
  reportedMonths: Set<string>,
  ejecutado: number,
  metaTotal: number
): ActividadEstado {
  if (!meses.length) return "por_iniciar";

  const sorted = [...meses].sort();
  const allFuture = sorted.every((m) => m > currentYM);
  if (allFuture) return "por_iniciar";

  const pastOrCurrent = sorted.filter((m) => m <= currentYM);
  const pastWithoutReport = pastOrCurrent.filter((m) => !reportedMonths.has(m));
  const allReported = pastWithoutReport.length === 0;
  const allPast = sorted.every((m) => m <= currentYM);

  // Completada: all months reported and ejecutado >= meta
  if (allPast && allReported && ejecutado >= metaTotal && metaTotal > 0) return "completada";

  // Con rezago: past delivery months missing reports
  if (pastWithoutReport.length > 0) return "con_rezago";

  // Entregable este mes: current month is delivery month, not yet reported
  if (sorted.includes(currentYM) && !reportedMonths.has(currentYM)) return "entregable_este_mes";

  // Al día: all past/current reported, future months remain
  if (allReported && sorted.some((m) => m > currentYM)) return "al_dia";

  // En progreso: between first and last, not a delivery month this month
  return "en_progreso";
}

export function calcProximoEntregable(
  meses: string[],
  currentYM: string,
  reportedMonths: Set<string>
): string | null {
  const sorted = [...meses].sort();
  for (const m of sorted) {
    if (m >= currentYM && !reportedMonths.has(m)) return m;
  }
  // Check past unreported
  for (const m of sorted) {
    if (m < currentYM && !reportedMonths.has(m)) return m;
  }
  return null;
}

const ESTADO_CONFIG: Record<ActividadEstado, { color: string; bgColor: string; dotClass: string; label: string; icon: typeof Circle }> = {
  entregable_este_mes: { color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", dotClass: "bg-yellow-500 animate-pulse", label: "Entregable este mes", icon: Circle },
  con_rezago:          { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", dotClass: "bg-red-500", label: "Con rezago", icon: AlertTriangle },
  en_progreso:         { color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20", dotClass: "bg-amber-400", label: "En progreso", icon: Clock },
  al_dia:              { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", dotClass: "bg-green-500", label: "Al día", icon: CheckCircle2 },
  completada:          { color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", dotClass: "bg-emerald-600", label: "Completada", icon: Star },
  por_iniciar:         { color: "text-muted-foreground", bgColor: "bg-muted", dotClass: "bg-gray-400", label: "Por iniciar", icon: Lock },
};

export { ESTADO_CONFIG };

/* ─── Main component ─── */

interface MiPlanificacionProps {
  readOnly?: boolean;
  entidadCodigoOverride?: string;
}

export default function MiPlanificacion({ readOnly = false, entidadCodigoOverride }: MiPlanificacionProps) {
  const { entidadId, entidades } = useRole();
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  // Map actividad_codigo -> actividad UUID from actividades table
  const [actIdMap, setActIdMap] = useState<Map<string, string>>(new Map());
  // Last update timestamps
  const [lastTecnico, setLastTecnico] = useState<Map<string, string>>(new Map());
  const [lastFinanciero, setLastFinanciero] = useState<Map<string, string>>(new Map());
  // Modal state
  const [modalTecnico, setModalTecnico] = useState<{ open: boolean; act: PlanificacionActividad | null }>({ open: false, act: null });
  const [modalPresup, setModalPresup] = useState<{ open: boolean; act: PlanificacionActividad | null }>({ open: false, act: null });
  // Filter state
  const [filters, setFilters] = useState<PlanificacionFilterState>(EMPTY_FILTERS);

  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidadCodigoOverride || (entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null);
  const currentYM = getCurrentYearMonth();

  function loadData(opts?: { skipFinanciero?: boolean }) {
    if (!entidadCodigo) { setActividades([]); setLoading(false); return; }
    const skipFin = opts?.skipFinanciero === true;
    // En recargas parciales (p. ej. tras guardar avance técnico) no mostramos
    // el skeleton global y NO refetcheamos ejecución financiera, para que el
    // estado del componente presupuestario no se vea afectado.
    if (!skipFin) setLoading(true);

    const queries: Promise<any>[] = [
      (supabase as any)
        .from("planificacion_actividades")
        .select("*")
        .eq("entidad_codigo", entidadCodigo)
        .order("actividad_codigo"),
      (supabase as any)
        .from("registros_mensuales")
        .select("actividad_id, anio, mes, avance_valor, estado_registro, fecha_registro, actividades!inner(codigo)")
        .eq("entidad_id", entidadId),
      (supabase as any)
        .from("actividades")
        .select("id, codigo")
        .eq("entidad_id", entidadId),
    ];
    if (!skipFin) {
      queries.push(
        (supabase as any)
          .from("ejecucion_financiera")
          .select("actividad_id, created_at, actividades!inner(codigo)")
          .eq("entidad_id", entidadId)
          .order("created_at", { ascending: false }),
      );
    }

    Promise.all(queries).then((results: any[]) => {
      const [planRes, regRes, actRes, efRes] = results;
      setActividades(planRes.data || []);

      const idMap = new Map<string, string>();
      if (actRes.data) {
        for (const a of actRes.data) idMap.set(a.codigo, a.id);
      }
      setActIdMap(idMap);

      const byCode = new Map<string, Set<string>>();
      const avanceMap = new Map<string, number>();
      const lastTecMap = new Map<string, string>();
      if (regRes.data) {
        for (const r of regRes.data) {
          const code = r.actividades?.codigo;
          if (!code) continue;
          const ym = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
          if (!byCode.has(code)) byCode.set(code, new Set());
          byCode.get(code)!.add(ym);
          if (r.estado_registro !== "borrador") {
            const prev = avanceMap.get(code) || 0;
            avanceMap.set(code, prev + (r.avance_valor || 0));
          }
          if (r.fecha_registro) {
            const prev = lastTecMap.get(code);
            if (!prev || r.fecha_registro > prev) lastTecMap.set(code, r.fecha_registro);
          }
        }
      }
      setReportsByActivity(byCode);
      setAvanceByActivity(avanceMap);
      setLastTecnico(lastTecMap);

      // Solo recalculamos el mapa financiero si recargamos esa fuente.
      if (!skipFin && efRes) {
        const lastFinMap = new Map<string, string>();
        if (efRes.data) {
          for (const ef of efRes.data) {
            const code = ef.actividades?.codigo;
            if (!code || lastFinMap.has(code)) continue;
            lastFinMap.set(code, ef.created_at);
          }
        }
        setLastFinanciero(lastFinMap);
      }

      setLoading(false);
    });
  }

  useEffect(() => { loadData(); }, [entidadCodigo, entidadId]);

  /* ─── Build hierarchy ─── */
  const hierarchy = useMemo(() => {
    if (!actividades.length) return null;

    const first = actividades[0];
    const riMap = new Map<string, {
      codigo: string;
      desc: string;
      productos: Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }>;
    }>();

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

    return {
      resultadoImpacto: first.resultado_impacto,
      resultadoFinal: first.resultado_final,
      proyectoNombre: first.proyecto_nombre,
      entidadNombre: first.entidad_nombre,
      mecanismo: first.mecanismo,
      ris: Array.from(riMap.values()),
    };
  }, [actividades]);

  function getActStats(act: PlanificacionActividad) {
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;
    const estado = calcEstado(act.meses_programados || [], currentYM, reported, ejecutado, act.meta_total || 0);
    const proximo = calcProximoEntregable(act.meses_programados || [], currentYM, reported);
    return { reported, ejecutado, estado, proximo };
  }

  /* ─── Filter logic ─── */
  function matchesFilters(act: PlanificacionActividad): boolean {
    const { estado, proximo, reported } = getActStats(act);
    const f = filters;

    // Estado filter (multi-select)
    if (f.estados.length > 0) {
      const estadoGroup =
        estado === "con_rezago" ? "con_rezago" :
        estado === "entregable_este_mes" || estado === "en_progreso" || estado === "al_dia" ? "en_proceso" :
        estado === "completada" ? "completada" :
        "por_iniciar";
      if (!f.estados.includes(estadoGroup)) return false;
    }

    // Próximo entregable filter
    if (f.proximoEntregable) {
      if (!proximo) return false;
      const [cy, cm] = currentYM.split("-").map(Number);
      const [, pm] = proximo.split("-").map(Number);
      const py = parseInt(proximo.split("-")[0]);
      if (f.proximoEntregable === "este_mes" && proximo !== currentYM) return false;
      if (f.proximoEntregable === "proximo_mes") {
        const nextM = cm === 12 ? 1 : cm + 1;
        const nextY = cm === 12 ? cy + 1 : cy;
        const nextYM = `${nextY}-${String(nextM).padStart(2, "0")}`;
        if (proximo !== nextYM) return false;
      }
      if (f.proximoEntregable === "este_trimestre") {
        const trimQ = Math.ceil(cm / 3);
        const trimStart = (trimQ - 1) * 3 + 1;
        const trimEnd = trimQ * 3;
        if (py !== cy || pm < trimStart || pm > trimEnd) return false;
      }
    }

    // Avance técnico
    if (f.avanceTecnico === "con_registro" && reported.size === 0) return false;
    if (f.avanceTecnico === "sin_registro" && reported.size > 0) return false;

    // Avance presupuestario
    if (f.avancePresupuestario === "con_registro" && !lastFinanciero.has(act.actividad_codigo)) return false;
    if (f.avancePresupuestario === "sin_registro" && lastFinanciero.has(act.actividad_codigo)) return false;

    return true;
  }

  const filtersActive = hasActiveFilters(filters);
  const totalActCount = actividades.length;
  const filteredActCount = filtersActive ? actividades.filter(matchesFilters).length : totalActCount;

  function getRiSemaforo(acts: PlanificacionActividad[]): ActividadEstado {
    let worst: ActividadEstado = "completada";
    const priority: ActividadEstado[] = ["con_rezago", "entregable_este_mes", "en_progreso", "al_dia", "por_iniciar", "completada"];
    for (const a of acts) {
      const { estado } = getActStats(a);
      if (priority.indexOf(estado) < priority.indexOf(worst)) worst = estado;
    }
    return worst;
  }

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function formatProximo(proximo: string | null, estado: ActividadEstado): string {
    if (estado === "completada") return "Completada";
    if (!proximo) return "—";
    if (proximo === currentYM) return "Este mes";
    if (proximo < currentYM) return "Vencido";
    return formatYM(proximo);
  }

  if (!entidadCodigo) return null;

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader><CardTitle>Mi Planificación</CardTitle></CardHeader>
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
            <Calendar className="h-5 w-5 text-primary" />
            Mi Planificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Tu planificación se está configurando. Pronto verás aquí el árbol completo de tu proyecto con las actividades comprometidas y su estado de avance.</p>
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
          {hierarchy.proyectoNombre} · {hierarchy.entidadNombre} · Mecanismo {hierarchy.mecanismo}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Filter bar */}
        <PlanificacionFilters
          filters={filters}
          onChange={setFilters}
          totalCount={totalActCount}
          filteredCount={filteredActCount}
        />

        {/* Level 1: Resultado de Impacto */}
        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span>📌</span> {hierarchy.resultadoImpacto}
        </div>

        {/* Level 2: Resultado Final */}
        <div className="text-sm font-medium text-foreground flex items-center gap-2 ml-3">
          <span>🎯</span> {hierarchy.resultadoFinal}
        </div>

        {/* Level 3+: RIs */}
        {hierarchy.ris.map((ri) => {
          const allRiActs = Array.from(ri.productos.values()).flatMap((p) => p.acts);
          const filteredRiActs = filtersActive ? allRiActs.filter(matchesFilters) : allRiActs;
          if (filtersActive && filteredRiActs.length === 0) return null;
          const riSemaforo = getRiSemaforo(allRiActs);
          const riCfg = ESTADO_CONFIG[riSemaforo];
          const riPresupuesto = allRiActs.reduce((s, a) => s + (a.presupuesto_seco_usd || 0), 0);
          const riKey = `ri-${ri.codigo}`;
          const riCollapsed = collapsedSections.has(riKey);

          return (
            <div key={ri.codigo} className="ml-4">
              {/* RI header */}
              <button
                onClick={() => toggleSection(riKey)}
                className="flex items-center gap-2 w-full text-left px-2 py-2 rounded hover:bg-muted/50 transition-colors"
              >
                {riCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-sm">📊</span>
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {ri.codigo} — {ri.desc}
                </span>
                <span className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span>{allRiActs.length} activ.</span>
                  <span>${riPresupuesto.toLocaleString()}</span>
                  <span className={cn("h-2.5 w-2.5 rounded-full inline-block", riCfg.dotClass)} />
                </span>
              </button>

              {!riCollapsed && (
                <div className="ml-2">
                  {Array.from(ri.productos.values()).map((prod) => {
                    const filteredProdActs = filtersActive ? prod.acts.filter(matchesFilters) : prod.acts;
                    if (filtersActive && filteredProdActs.length === 0) return null;
                    const prodKey = `prod-${prod.codigo}`;
                    const prodCollapsed = collapsedSections.has(prodKey);

                    return (
                      <div key={prod.codigo} className="ml-3">
                        {/* Product header */}
                        <button
                          onClick={() => toggleSection(prodKey)}
                          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                        >
                          {prodCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs">📦</span>
                          <span className="text-xs font-medium text-foreground truncate">
                            {prod.codigo}. {prod.desc}
                          </span>
                        </button>

                        {!prodCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm ml-2">
                              <thead>
                                <tr className="border-b text-[11px] text-muted-foreground">
                                  <th className="py-1.5 px-2 text-center w-[60px]">Cód.</th>
                                  <th className="py-1.5 px-2 text-left">Actividad</th>
                                  <th className="py-1.5 px-2 text-left w-[80px]">Unidad</th>
                                  <th className="py-1.5 px-2 text-center w-[50px]">Meta</th>
                                  <th className="py-1.5 px-2 text-center w-[70px]">Ejecutado</th>
                                  <th className="py-1.5 px-2 text-center w-[80px]">Próximo</th>
                                  <th className="py-1.5 px-2 text-center w-[40px]">Estado</th>
                                  {!readOnly && <th className="py-1.5 px-2 text-center w-[110px]">Av. Técnico</th>}
                                  {!readOnly && <th className="py-1.5 px-2 text-center w-[110px]">Av. Presup.</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {(filtersActive ? filteredProdActs : prod.acts).map((act) => {
                                  const { reported, ejecutado, estado, proximo } = getActStats(act);
                                  const cfg = ESTADO_CONFIG[estado];
                                  const isExpanded = expandedRow === act.id;
                                  const proximoLabel = formatProximo(proximo, estado);
                                  const proximoClass =
                                    proximoLabel === "Vencido" ? "text-red-600 font-semibold" :
                                    proximoLabel === "Este mes" ? "text-yellow-600 font-semibold" :
                                    proximoLabel === "Completada" ? "text-emerald-600" : "";

                                    return (
                                      <ActividadRow
                                        key={act.id}
                                        act={act}
                                        ejecutado={ejecutado}
                                        estado={estado}
                                        cfg={cfg}
                                        proximo={proximoLabel}
                                        proximoClass={proximoClass}
                                        isExpanded={isExpanded}
                                        reported={reported}
                                        currentYM={currentYM}
                                        readOnly={readOnly}
                                        lastTecnicoDate={lastTecnico.get(act.actividad_codigo)}
                                        lastFinancieroDate={lastFinanciero.get(act.actividad_codigo)}
                                        onToggle={() => setExpandedRow(isExpanded ? null : act.id)}
                                        onOpenTecnico={() => setModalTecnico({ open: true, act })}
                                        onOpenPresup={() => setModalPresup({ open: true, act })}
                                      />
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

    {/* Modals */}
    {modalTecnico.act && (
      <ModalAvanceTecnico
        open={modalTecnico.open}
        onOpenChange={(o) => setModalTecnico({ open: o, act: o ? modalTecnico.act : null })}
        actividadCodigo={modalTecnico.act.actividad_codigo}
        actividadDescripcion={modalTecnico.act.actividad_descripcion}
        actividadId={actIdMap.get(modalTecnico.act.actividad_codigo)}
        entidadId={entidadId || ""}
        onSaved={() => loadData({ skipFinanciero: true })}
        mesesProgramados={modalTecnico.act.meses_programados || []}
        mesesReportados={reportsByActivity.get(modalTecnico.act.actividad_codigo) || new Set()}
      />
    )}
    {modalPresup.act && (
      <ModalAvancePresupuestario
        open={modalPresup.open}
        onOpenChange={(o) => setModalPresup({ open: o, act: o ? modalPresup.act : null })}
        actividadCodigo={modalPresup.act.actividad_codigo}
        actividadDescripcion={modalPresup.act.actividad_descripcion}
        actividadId={actIdMap.get(modalPresup.act.actividad_codigo)}
        entidadId={entidadId || ""}
        onSaved={loadData}
        mesesProgramados={modalPresup.act.meses_programados || []}
        mesesReportados={reportsByActivity.get(modalPresup.act.actividad_codigo) || new Set()}
      />
    )}
    </>
  );
}

/* ─── Activity row + expandable detail ─── */

function ActividadRow({
  act, ejecutado, estado, cfg, proximo, proximoClass, isExpanded, reported, currentYM, readOnly,
  lastTecnicoDate, lastFinancieroDate, onToggle, onOpenTecnico, onOpenPresup,
}: {
  act: PlanificacionActividad;
  ejecutado: number;
  estado: ActividadEstado;
  cfg: (typeof ESTADO_CONFIG)[ActividadEstado];
  proximo: string;
  proximoClass: string;
  isExpanded: boolean;
  reported: Set<string>;
  currentYM: string;
  readOnly: boolean;
  lastTecnicoDate?: string;
  lastFinancieroDate?: string;
  onToggle: () => void;
  onOpenTecnico: () => void;
  onOpenPresup: () => void;
}) {
  const meses = (act.meses_programados || []).sort();

  return (
    <>
      <tr
        className={cn(
          "border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors",
          isExpanded && "bg-muted/20",
          estado === "con_rezago" && "bg-red-50/60 dark:bg-red-950/20",
          estado === "entregable_este_mes" && "bg-amber-50/60 dark:bg-amber-950/20",
        )}
        onClick={onToggle}
      >
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
        <td className="py-2 px-2 text-center text-xs font-semibold">{act.meta_total}</td>
        <td className="py-2 px-2 text-center text-xs font-mono">
          <span className={cn(ejecutado > 0 && "font-semibold")}>{ejecutado}</span>
          <span className="text-muted-foreground"> / {act.meta_total}</span>
        </td>
        <td className={cn("py-2 px-2 text-center text-xs", proximoClass)}>{proximo}</td>
        <td className="py-2 px-2 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("inline-block h-3 w-3 rounded-full", cfg.dotClass)} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{cfg.label}</TooltipContent>
          </Tooltip>
        </td>
        {!readOnly && (
          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={onOpenTecnico}>
              <FileEdit className="h-3 w-3" />
              Registrar
            </Button>
            {lastTecnicoDate && (
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {new Date(lastTecnicoDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
              </div>
            )}
          </td>
        )}
        {!readOnly && (
          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={onOpenPresup}>
              <Wallet className="h-3 w-3" />
              Registrar
            </Button>
            {lastFinancieroDate && (
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {new Date(lastFinancieroDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
              </div>
            )}
          </td>
        )}
      </tr>

      {/* Expanded detail panel */}
      {isExpanded && (
        <tr>
          <td colSpan={readOnly ? 7 : 9} className="p-0">
            <div className="bg-muted/30 border-t border-b px-4 py-3 space-y-2 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground font-medium">Descripción completa:</span>
                  <p className="text-foreground mt-0.5">{act.actividad_descripcion}</p>
                </div>
                <div className="space-y-1">
                  <div><span className="text-muted-foreground">Medio de verificación:</span> {act.medio_verificacion || "—"}</div>
                  <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> <span className="text-muted-foreground">Presupuesto SECO:</span> USD {(act.presupuesto_seco_usd || 0).toLocaleString()}</div>
                  <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> <span className="text-muted-foreground">Contrapartida:</span> USD {(act.presupuesto_contrapartida_usd || 0).toLocaleString()}</div>
                  <div><span className="text-muted-foreground">Responsable:</span> {act.responsable || "—"}</div>
                </div>
              </div>

              {/* Month badges */}
              <div>
                <span className="text-muted-foreground font-medium">Meses de entrega:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {meses.map((m) => {
                    const isPast = m < currentYM;
                    const isCurrent = m === currentYM;
                    const hasReport = reported.has(m);

                    let badgeClass = "border-muted-foreground/30 text-muted-foreground"; // future
                    let icon = "○";
                    if (isPast && hasReport) { badgeClass = "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20"; icon = "✓"; }
                    else if (isPast && !hasReport) { badgeClass = "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20"; icon = "✗"; }
                    else if (isCurrent && !hasReport) { badgeClass = "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 animate-pulse"; icon = "●"; }
                    else if (isCurrent && hasReport) { badgeClass = "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20"; icon = "✓"; }

                    return (
                      <Badge key={m} variant="outline" className={cn("text-[10px] gap-1 px-1.5", badgeClass)}>
                        {icon} {formatYM(m)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Report history - placeholder */}
              {reported.size > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium">Historial de reportes:</span>
                  <div className="mt-1 text-muted-foreground">
                    {Array.from(reported).sort().map((m) => (
                      <span key={m} className="inline-block mr-2">✓ {formatYM(m)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}