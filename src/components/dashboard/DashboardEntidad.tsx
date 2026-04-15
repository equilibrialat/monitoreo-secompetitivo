import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/contexts/RoleContext";
import { useDashboardData, type DashboardEntidad as DashboardEntidadType } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Clock, ArrowRight, DollarSign, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type PlanificacionActividad, getCurrentYearMonth, formatYM } from "@/components/planificacion/MiPlanificacion";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getCurrentTrimestreInfo() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let t: number, label: string, months: string[];
  if (month < 3) { t = 1; label = "T1"; months = [`${year}-01`, `${year}-02`, `${year}-03`]; }
  else if (month < 6) { t = 2; label = "T2"; months = [`${year}-04`, `${year}-05`, `${year}-06`]; }
  else if (month < 9) { t = 3; label = "T3"; months = [`${year}-07`, `${year}-08`, `${year}-09`]; }
  else { t = 4; label = "T4"; months = [`${year}-10`, `${year}-11`, `${year}-12`]; }
  return { t, label, months, year, key: `${year}-${label}` };
}

type ActivityLifecycle = "completada" | "vencida" | "entregable_este_mes" | "en_curso" | "por_iniciar";

export default function DashboardEntidad() {
  const { entidadId, entidades: entidadOptions } = useRole();
  const { data: dashData, isLoading: dashLoading } = useDashboardData();
  const navigate = useNavigate();

  const entidad = entidadOptions.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;
  const isAppcacao = !!entidadCodigo;
  const ent = dashData?.find((e) => e.entidad_id === entidadId);

  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
  const [finSummary, setFinSummary] = useState<{ ejecutadoTotal: number; trimEjecutado: number; trimProgramado: number; comprometido: number }>({ ejecutadoTotal: 0, trimEjecutado: 0, trimProgramado: 0, comprometido: 0 });
  const [loading, setLoading] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const currentYM = getCurrentYearMonth();
  const currentMes = parseInt(currentYM.split("-")[1]);
  const currentYear = parseInt(currentYM.split("-")[0]);
  const trimInfo = getCurrentTrimestreInfo();

  const loadData = useCallback(() => {
    if (!entidadCodigo || !entidadId) { setLoading(false); return; }
    setLoading(true);

    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
      (supabase as any).from("registros_mensuales").select("id, actividad_id, anio, mes, avance_valor, estado_registro, actividades!inner(codigo)").eq("entidad_id", entidadId),
      (supabase as any).from("comprobantes").select("monto_usd, trimestre").eq("entidad_codigo", entidadCodigo),
      (supabase as any).from("contratos_financieros").select("monto_contrato_usd, estado").eq("entidad_codigo", entidadCodigo).eq("estado", "vigente"),
    ]).then(([planRes, regRes, compRes, contRes]: any[]) => {
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
          avanceMap.set(code, (avanceMap.get(code) || 0) + (r.avance_valor || 0));
        }
      }
      setReportsByActivity(byCode);
      setAvanceByActivity(avanceMap);

      // Financial summary
      const comps = compRes.data || [];
      const ejecutadoTotal = comps.reduce((s: number, c: any) => s + Number(c.monto_usd || 0), 0);
      const trimEjecutado = comps.filter((c: any) => c.trimestre === trimInfo.key).reduce((s: number, c: any) => s + Number(c.monto_usd || 0), 0);
      const comprometido = (contRes.data || []).reduce((s: number, c: any) => s + Number(c.monto_contrato_usd || 0), 0);

      // Programado for trim
      const acts = planRes.data || [];
      let trimProgramado = 0;
      for (const a of acts) {
        const meses = (a.meses_programados || []) as string[];
        if (meses.some((m: string) => trimInfo.months.includes(m))) {
          const trims = new Set<string>();
          for (const m of meses) {
            const mo = parseInt(m.split("-")[1]);
            const y = m.split("-")[0];
            if (mo <= 3) trims.add(`${y}-T1`);
            else if (mo <= 6) trims.add(`${y}-T2`);
            else if (mo <= 9) trims.add(`${y}-T3`);
            else trims.add(`${y}-T4`);
          }
          trimProgramado += trims.size > 0 ? (a.presupuesto_seco_usd || 0) / trims.size : 0;
        }
      }

      setFinSummary({ ejecutadoTotal, trimEjecutado, trimProgramado, comprometido });
      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Lifecycle calculation
  function getLifecycle(act: PlanificacionActividad): ActivityLifecycle {
    const meses = (act.meses_programados || []) as string[];
    if (!meses.length) return "por_iniciar";
    const sorted = [...meses].sort();
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;

    const allPast = sorted.every(m => m <= currentYM);
    const allReported = sorted.every(m => reported.has(m));
    if (allPast && allReported && ejecutado >= (act.meta_total || 0) && (act.meta_total || 0) > 0) return "completada";

    const pastWithout = sorted.filter(m => m < currentYM && !reported.has(m));
    if (pastWithout.length > 0) return "vencida";

    if (sorted.includes(currentYM) && !reported.has(currentYM)) return "entregable_este_mes";
    if (sorted[0] > currentYM) return "por_iniciar";
    return "en_curso";
  }

  const { pendientes, vencidas, enCurso, completadas, riCount, productoCount } = useMemo(() => {
    const pendientes: PlanificacionActividad[] = [];
    const vencidas: { act: PlanificacionActividad; mesVencido: string }[] = [];
    const enCurso: { act: PlanificacionActividad; proximoMes: string | null }[] = [];
    const completadas: PlanificacionActividad[] = [];
    const riSet = new Set<string>();
    const prodSet = new Set<string>();

    for (const act of actividades) {
      if (act.resultado_intermedio_codigo) riSet.add(act.resultado_intermedio_codigo);
      if (act.producto_codigo) prodSet.add(act.producto_codigo);

      const lifecycle = getLifecycle(act);
      const meses = (act.meses_programados || []) as string[];
      const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();

      if (lifecycle === "completada") {
        completadas.push(act);
      } else if (lifecycle === "vencida") {
        const sorted = [...meses].sort();
        const firstUnreported = sorted.find(m => m < currentYM && !reported.has(m));
        vencidas.push({ act, mesVencido: firstUnreported || sorted[0] });
        if (meses.includes(currentYM) && !reported.has(currentYM)) {
          pendientes.push(act);
        }
      } else if (lifecycle === "entregable_este_mes") {
        pendientes.push(act);
      } else {
        const sorted = [...meses].sort();
        const nextMonth = sorted.find(m => m >= currentYM && !reported.has(m));
        enCurso.push({ act, proximoMes: nextMonth || null });
      }
    }

    vencidas.sort((a, b) => a.mesVencido.localeCompare(b.mesVencido));
    return { pendientes, vencidas, enCurso, completadas, riCount: riSet.size, productoCount: prodSet.size };
  }, [actividades, reportsByActivity, avanceByActivity, currentYM]);

  const presupuestoTotal = ent?.presupuesto_seco_total || 0;
  const pctEjecutado = presupuestoTotal > 0 ? ((finSummary.ejecutadoTotal / presupuestoTotal) * 100).toFixed(1) : "0";

  if (dashLoading || loading) return <DashboardSkeleton />;

  if (!isAppcacao) {
    // Fallback for non-APPCACAO entities — simple KPIs
    if (!ent) return <div className="text-muted-foreground text-center py-12">Selecciona una entidad en el panel lateral.</div>;
    return (
      <div>
        <Header title="Mi Dashboard" subtitle={ent.nombre_corto} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard label="Actividades" value={`${ent.actividades_completadas}/${ent.total_actividades}`} sub="completadas" />
          <KpiCard label="Avance Operativo" value={`${ent.avance_operativo_promedio ?? 0}%`} sub="promedio" />
          <KpiCard label="Ejecución SECO" value={`${ent.pct_ejecucion_seco}%`} sub={`USD ${fmt(ent.ejecutado_seco_total)} / ${fmt(ent.presupuesto_seco_total)}`} />
          <KpiCard label="Pendientes revisión" value={String(ent.pendientes_revision)} sub="registros" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Mi Dashboard" subtitle={entidad?.nombre_corto} />

      {/* TOP STRIP — always visible */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {/* COMPROMISOS */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Compromisos</p>
            <p className="text-2xl font-bold">{actividades.length}</p>
            <p className="text-xs text-muted-foreground">actividades total proyecto</p>
            <div className="mt-2 text-xs space-y-0.5 text-muted-foreground">
              <p>{riCount} RI activos · {productoCount} productos</p>
            </div>
          </CardContent>
        </Card>

        {/* TÉCNICO HOY */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Técnico hoy</p>
            <p className="text-2xl font-bold">{pendientes.length}</p>
            <p className="text-xs text-muted-foreground">pendientes este mes</p>
            <div className="mt-2 text-xs space-y-0.5 text-muted-foreground">
              <p>{vencidas.length} con rezago · {enCurso.length} en curso · {completadas.length} completadas</p>
            </div>
          </CardContent>
        </Card>

        {/* FINANCIERO */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Financiero</p>
            <p className="text-2xl font-bold">USD {fmt(finSummary.ejecutadoTotal)}</p>
            <p className="text-xs text-muted-foreground">ejecutado total · {pctEjecutado}% del convenio</p>
            <div className="mt-2 text-xs space-y-0.5 text-muted-foreground">
              <p>{trimInfo.label}: USD {fmt(finSummary.trimEjecutado)} registrado / USD {fmt(finSummary.trimProgramado)} progr.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ESTADO DE ESTE MES */}
      <div className="space-y-3">
        {(pendientes.length > 0 || vencidas.length > 0) && (
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Estado de este mes — {MONTH_NAMES[currentMes - 1]} {currentYear}
              </p>
              <div className="space-y-2">
                {/* Entregables este mes */}
                {pendientes.map((act) => (
                  <div key={act.actividad_codigo} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                    <span className="text-yellow-600">●</span>
                    <span className="font-mono text-xs font-bold text-primary shrink-0">{act.actividad_codigo}</span>
                    <span className="truncate flex-1">{act.actividad_descripcion}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0 border-yellow-300 text-yellow-700">Entregable hoy</Badge>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 shrink-0" onClick={() => navigate("/actividades")}>
                      Reportar
                    </Button>
                  </div>
                ))}

                {/* Vencidas */}
                {vencidas.map(({ act, mesVencido }) => (
                  <div key={`${act.actividad_codigo}_${mesVencido}`} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                    <span className="text-destructive">✗</span>
                    <span className="font-mono text-xs font-bold text-primary shrink-0">{act.actividad_codigo}</span>
                    <span className="truncate flex-1">{act.actividad_descripcion}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0 border-destructive/30 text-destructive">Vencido {formatYM(mesVencido)}</Badge>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => navigate("/actividades")}>
                      Reportar rezago
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* EN CURSO */}
        {enCurso.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                En curso (sin entregable este mes)
              </p>
              <div className="space-y-1.5">
                {enCurso.map(({ act, proximoMes }) => (
                  <div key={act.actividad_codigo} className="flex items-center gap-2 text-sm py-1 px-2">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{act.actividad_codigo}</span>
                    <span className="truncate flex-1 text-muted-foreground">{act.actividad_descripcion}</span>
                    {proximoMes && <span className="text-[10px] text-muted-foreground shrink-0">próximo: {formatYM(proximoMes)}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* COMPLETADAS */}
        {completadas.length > 0 && (
          <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  {completedOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actividades completadas</span>
                  <Badge variant="outline" className="text-[10px]">{completadas.length}</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {completadas.map((act) => (
                      <Badge key={act.actividad_codigo} variant="outline" className="text-xs gap-1 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> {act.actividad_codigo} ✓
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 pt-2 pb-4">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/gestion-contratos-fin")}>
            <DollarSign className="h-3 w-3 mr-1" /> Ver contratos
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/gestion-contratos-fin")}>
            <FileText className="h-3 w-3 mr-1" /> Ver comprobantes
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/mi-planificacion")}>
            Ver por actividad
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Shared sub-components used across dashboards ---

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 md:mb-6">
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

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}><CardContent className="pt-5 pb-4"><div className="h-2 w-20 rounded bg-muted mb-3" /><div className="h-8 w-16 rounded bg-muted" /></CardContent></Card>
      ))}
    </div>
  );
}
