import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, Loader2, ChevronRight, ChevronDown, DollarSign, TrendingUp, Wallet, Trophy, AlertTriangle, CalendarClock, FileCheck, Receipt, Lock, CheckCircle2, Clock, Circle, ArrowLeft, EyeOff } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchActividadesByEntidad, type ActividadDB } from "@/lib/supabaseQueries";
import { fetchRegistrosEntidad, type RegistroPendiente } from "@/lib/registroAprobacion";
import { fetchPlanTrimestral, aceptarPlan, disputarPlan, solicitarAjuste, getTrimesterFromMonth, getTrimesterMonths, getTrimesterMonthNumbers, type PlanTrimestral, type PlanEstado } from "@/lib/planTrimestral";
import { useTrimestreSeleccionado, getTrimestreLabel } from "@/hooks/useTrimestreActivo";
import { HistoricalBanner } from "@/components/TrimestreHeader";
import { RegistroMensualDialog } from "@/components/RegistroMensualDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ResultadoDB {
  id: string;
  codigo: string;
  nombre: string;
}

function getSemaforoAvance(pct: number) {
  if (pct >= 66) return { color: "bg-success", text: "text-success", label: "En curso" };
  if (pct >= 35) return { color: "bg-warning", text: "text-warning", label: "Atención" };
  return { color: "bg-destructive", text: "text-destructive", label: "Crítico" };
}

function formatUSD(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

/** Status dot for a month */
function MonthDot({ ejecutado, meta, monthNum }: { ejecutado: number; meta: number; monthNum: number }) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  if (meta === 0 && ejecutado === 0) {
    return <span className="h-2.5 w-2.5 rounded-full bg-muted inline-block" title="Sin meta" />;
  }
  if (ejecutado >= meta && meta > 0) {
    return <span className="h-2.5 w-2.5 rounded-full bg-success inline-block" title="Completo" />;
  }
  if (ejecutado > 0 && ejecutado < meta) {
    if (monthNum <= currentMonth) {
      return <span className="h-2.5 w-2.5 rounded-full bg-warning inline-block" title="En progreso" />;
    }
    return <span className="h-2.5 w-2.5 rounded-full bg-muted inline-block" title="Futuro" />;
  }
  if (monthNum < currentMonth) {
    return <span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" title="Sin avance" />;
  }
  if (monthNum === currentMonth) {
    return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 inline-block" title="Mes actual" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-muted inline-block" title="Futuro" />;
}

export default function MisActividades() {
  const { entidadId, filteredEntidades } = useRole();
  const [actividades, setActividades] = useState<ActividadDB[]>([]);
  const [registros, setRegistros] = useState<RegistroPendiente[]>([]);
  const [resultados, setResultados] = useState<ResultadoDB[]>([]);
  const [voucherTotals, setVoucherTotals] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedActividad, setSelectedActividad] = useState<ActividadDB | null>(null);
  const [plans, setPlans] = useState<PlanTrimestral[]>([]);
  const [disputeText, setDisputeText] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Adjustment state
  const [adjustingPlanId, setAdjustingPlanId] = useState<string | null>(null);
  const [adjustMonth, setAdjustMonth] = useState(1);
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustJustification, setAdjustJustification] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Active/selected trimester
  const { seleccionado, activo: trimestreActivo, isHistorical } = useTrimestreSeleccionado();
  const isClosed = seleccionado?.estado === "cerrado";

  // Current period - use selected trimester
  const now = new Date();
  const currentMes = now.getMonth() + 1;
  const currentAnio = seleccionado?.anio ?? now.getFullYear();
  const currentTrimestre = seleccionado?.trimestre ?? getTrimesterFromMonth(currentMes);
  const monthNames = getTrimesterMonths(currentTrimestre);
  const monthNumbers = getTrimesterMonthNumbers(currentTrimestre);

  // Accordion state
  const [openResultado, setOpenResultado] = useState<string | null>(null);
  const [openActividad, setOpenActividad] = useState<string | null>(null);

  const selectedEntidadData = filteredEntidades.find(e => e.id === entidadId);

  const loadData = useCallback(async () => {
    if (!entidadId) {
      setActividades([]); setRegistros([]); setResultados([]); setPlans([]); setLoading(false);
      return;
    }
    setLoading(true);
    const [acts, regs, resResult, vouchersResult, planData] = await Promise.all([
      fetchActividadesByEntidad(entidadId),
      fetchRegistrosEntidad(entidadId),
      (supabase as any).from("resultados").select("id, codigo, nombre").eq("entidad_id", entidadId).order("codigo"),
      (supabase as any).from("vouchers_gasto").select("codigo_actividad, monto_usd").eq("entidad_id", entidadId),
      fetchPlanTrimestral(entidadId, currentTrimestre, currentAnio),
    ]);
    setActividades(acts);
    setRegistros(regs);
    setResultados((resResult.data || []).map((r: any) => ({ id: r.id, codigo: r.codigo, nombre: r.nombre })));
    const vtMap = new Map<string, number>();
    for (const v of (vouchersResult.data || [])) {
      const key = v.codigo_actividad;
      if (key) vtMap.set(key, (vtMap.get(key) || 0) + (v.monto_usd || 0));
    }
    setVoucherTotals(vtMap);
    setPlans(planData);
    setLoading(false);
  }, [entidadId, currentAnio, currentTrimestre]);

  useEffect(() => { loadData(); }, [loadData]);

  // Plan map: actividad_id -> PlanTrimestral
  const planMap = useMemo(() => {
    const m = new Map<string, PlanTrimestral>();
    for (const p of plans) m.set(p.actividad_id, p);
    return m;
  }, [plans]);

  function getPlanEstado(actividadId: string): PlanEstado | "sin_plan" {
    if (isClosed) return "aprobada"; // Closed trimesters: treat all as historical, no plan warnings
    const plan = planMap.get(actividadId);
    if (!plan) return "sin_plan";
    return plan.estado;
  }

  function isRegistroEnabled(actividadId: string): boolean {
    if (isClosed) return false; // Closed = read-only, no registration
    return getPlanEstado(actividadId) === "aprobada";
  }

  // Is there a pending proposal from coordinator?
  const hasPendingProposal = plans.length > 0 && plans[0].estado === "propuesta_coordinador";
  const hasDispute = plans.length > 0 && plans[0].estado === "en_disputa";
  const isApproved = plans.length > 0 && plans[0].estado === "aprobada";

  // Group activities by resultado
  const actsByResultado = useMemo(() => {
    const map = new Map<string, ActividadDB[]>();
    actividades.forEach(a => {
      const key = a.resultado_codigo;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [actividades]);

  const registroMap = useMemo(() => {
    const m = new Map<string, RegistroPendiente>();
    for (const r of registros) {
      const existing = m.get(r.actividad_id);
      if (!existing || r.anio > existing.anio || (r.anio === existing.anio && r.mes > existing.mes)) {
        m.set(r.actividad_id, r);
      }
    }
    return m;
  }, [registros]);

  function getResultadoFinance(resCodigo: string) {
    const acts = actsByResultado.get(resCodigo) || [];
    const presupuesto = acts.reduce((s, a) => s + (a.presupuesto_seco || 0), 0);
    const ejecutado = acts.reduce((s, a) => s + (voucherTotals.get(a.codigo) || 0), 0);
    return { presupuesto, ejecutado, saldo: presupuesto - ejecutado };
  }

  function getResultadoAvance(resCodigo: string): number {
    const acts = actsByResultado.get(resCodigo) || [];
    if (isClosed) {
      // For closed trimesters, use all activities with any data
      if (acts.length === 0) return -1;
      return Math.round(acts.reduce((s, a) => s + a.avance_operativo_pct, 0) / acts.length);
    }
    const withPlan = acts.filter(a => getPlanEstado(a.id) === "aprobada");
    if (withPlan.length === 0) return -1;
    return Math.round(withPlan.reduce((s, a) => s + a.avance_operativo_pct, 0) / withPlan.length);
  }

  const handleAcceptPlan = async () => {
    if (!entidadId) return;
    setAccepting(true);
    const result = await aceptarPlan(entidadId, currentTrimestre, currentAnio);
    setAccepting(false);
    if (result.success) {
      toast.success("Plan trimestral aceptado — ya puedes registrar avances");
      loadData();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  const handleDispute = async () => {
    if (!entidadId || !disputeText.trim() || !selectedEntidadData) return;
    setDisputing(true);
    const result = await disputarPlan(entidadId, currentTrimestre, currentAnio, disputeText, selectedEntidadData.nombre_corto);
    setDisputing(false);
    if (result.success) {
      toast.success("Comentario enviado al coordinador regional");
      setDisputeText("");
      loadData();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  const handleAjuste = async () => {
    if (!adjustingPlanId || !adjustJustification.trim()) return;
    setAdjustSubmitting(true);
    const result = await solicitarAjuste(adjustingPlanId, {
      month: adjustMonth,
      new_value: Number(adjustValue) || 0,
      justification: adjustJustification,
    });
    setAdjustSubmitting(false);
    if (result.success) {
      toast.success("Solicitud de ajuste enviada");
      setAdjustingPlanId(null);
      setAdjustValue("");
      setAdjustJustification("");
      loadData();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  // Read-only mode detection
  const searchParams = new URLSearchParams(window.location.search);
  const readonlyRole = searchParams.get("readonly");
  const isReadOnly = !!readonlyRole;
  const readOnlyLabel = readonlyRole === "monitoreo" ? "Monitoreo" : readonlyRole === "direccion" ? "Dirección" : readonlyRole || "";

  return (
    <div>
      {/* Read-only banner */}
      {isReadOnly && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <EyeOff className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium flex-1">
            Vista de solo lectura — {readOnlyLabel}. No puedes modificar datos.
          </p>
          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => {
            window.history.back();
          }}>
            <ArrowLeft className="h-3 w-3 mr-1" /> Volver al dashboard
          </Button>
        </div>
      )}

      {/* Historical mode banner */}
      <HistoricalBanner />

      {/* No plan info — only for active trimesters */}
      {!loading && !isClosed && plans.length === 0 && (
        <Card className="mb-4 border-muted bg-muted/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                El coordinador regional aún no ha enviado el plan para {monthNames.join(" / ")} {currentAnio}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved plan compact bar — only for active trimesters */}
      {!isClosed && isApproved && (
        <Card className="mb-4 border-success/40 bg-success/5">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-sm text-success font-medium">
                ✓ Plan {monthNames.join("-")} {currentAnio} aprobado — puedes registrar tu avance mensual.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Actividades</h1>
          <p className="text-sm text-muted-foreground">Vista jerárquica: Resultado → Actividades → Detalle</p>
        </div>
      </div>

      {/* Plan trimestral banner */}
      {!isClosed && hasPendingProposal && (
        <Card className="mb-4 border-primary/40 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary mb-1">
                  Plan {monthNames.join("-")} {currentAnio} propuesto por el coordinador regional
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Revisa las metas mensuales propuestas y acepta o comenta.
                </p>

                {/* Summary table */}
                <div className="overflow-x-auto rounded-lg border mb-3 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Actividad</TableHead>
                        <TableHead className="text-xs text-center">{monthNames[0]}</TableHead>
                        <TableHead className="text-xs text-center">{monthNames[1]}</TableHead>
                        <TableHead className="text-xs text-center">{monthNames[2]}</TableHead>
                        <TableHead className="text-xs text-center">Total</TableHead>
                        <TableHead className="text-xs text-center">Meta Trim.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map(p => {
                        const act = actividades.find(a => a.id === p.actividad_id);
                        const total = p.meta_mes_1 + p.meta_mes_2 + p.meta_mes_3;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs">
                              <span className="font-mono text-muted-foreground mr-1">{act?.codigo}</span>
                              {act?.nombre}
                            </TableCell>
                            <TableCell className="text-xs text-center font-mono">{p.meta_mes_1}</TableCell>
                            <TableCell className="text-xs text-center font-mono">{p.meta_mes_2}</TableCell>
                            <TableCell className="text-xs text-center font-mono">{p.meta_mes_3}</TableCell>
                            <TableCell className="text-xs text-center font-mono font-semibold">{total}</TableCell>
                            <TableCell className="text-xs text-center font-mono">{p.meta_trimestral}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleAcceptPlan} disabled={accepting}>
                    {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    Aceptar plan
                  </Button>
                  <div className="flex-1 min-w-[200px] flex gap-2">
                    <Textarea
                      placeholder="Comentar / disputar (describe las diferencias)..."
                      className="text-xs h-9 min-h-[36px] resize-none"
                      value={disputeText}
                      onChange={(e) => setDisputeText(e.target.value)}
                    />
                    <Button size="sm" variant="outline" onClick={handleDispute} disabled={disputeText.trim().length === 0 || disputing}>
                      {disputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isClosed && hasDispute && (
        <Card className="mb-4 border-warning/40 bg-warning/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm text-warning font-medium">
                Plan en disputa — esperando respuesta del coordinador regional.
              </p>
            </div>
            {plans[0]?.comentario_entidad && (
              <p className="text-xs text-muted-foreground mt-1 italic">Tu comentario: "{plans[0].comentario_entidad}"</p>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Cargando actividades...</span>
        </div>
      ) : actividades.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No se encontraron actividades para esta entidad.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resultados.map((res) => {
            const isOpen = openResultado === res.id;
            const avgAvance = getResultadoAvance(res.codigo);
            const isPlanning = avgAvance < 0;
            const displayAvance = isPlanning ? 0 : avgAvance;
            const semaforo = isPlanning
              ? { color: "bg-muted", text: "text-muted-foreground", label: "Planificación" }
              : getSemaforoAvance(displayAvance);
            const acts = actsByResultado.get(res.codigo) || [];
            const finance = getResultadoFinance(res.codigo);
            const financePct = finance.presupuesto > 0
              ? Math.round((finance.ejecutado / finance.presupuesto) * 100)
              : 0;

            return (
              <div key={res.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {/* NIVEL 1 - BOSQUE */}
                <button
                  onClick={() => {
                    setOpenResultado(isOpen ? null : res.id);
                    setOpenActividad(null);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <ChevronRight className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-90")} />
                  <div className={cn("h-3 w-3 rounded-full shrink-0", semaforo.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{res.codigo}</p>
                    <p className="text-sm font-semibold text-card-foreground leading-snug truncate">{res.nombre}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {isPlanning ? (
                        <>
                          <p className="text-sm font-medium text-muted-foreground">En planificación</p>
                          <p className="text-[10px] text-muted-foreground">Sin plan aprobado</p>
                        </>
                      ) : (
                        <>
                          <p className={cn("text-lg font-bold", semaforo.text)}>{displayAvance}%</p>
                          <p className="text-[10px] text-muted-foreground">Avance prom.</p>
                        </>
                      )}
                    </div>
                    <Badge className="text-xs" variant="secondary">{acts.length} act.</Badge>
                  </div>
                </button>

                {/* NIVEL 2 - PARCELA */}
                {isOpen && (
                  <div className="border-t">
                    {/* Panel financiero */}
                    <div className="bg-muted/20 px-4 py-3 border-b">
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Presupuesto</p>
                            <p className="text-sm font-bold text-foreground">{formatUSD(finance.presupuesto)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ejecutado</p>
                            <p className="text-sm font-bold text-success">{formatUSD(finance.ejecutado)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
                            <p className="text-sm font-bold text-warning">{formatUSD(finance.saldo)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={financePct} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground">{financePct}%</span>
                      </div>
                    </div>

                    {/* Lista de actividades */}
                    <div className="divide-y">
                      {acts.map((act) => {
                        const isActOpen = openActividad === act.id;
                        const planEstado = getPlanEstado(act.id);
                        const plan = planMap.get(act.id);
                        const canRegister = isRegistroEnabled(act.id);
                        const actSemaforo = canRegister
                          ? getSemaforoAvance(act.avance_operativo_pct)
                          : { color: "bg-muted", text: "text-muted-foreground", label: "Bloqueado" };
                        const reg = registroMap.get(act.id);

                        return (
                          <div key={act.id}>
                            <button
                              onClick={() => setOpenActividad(isActOpen ? null : act.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                            >
                              <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isActOpen && "rotate-90")} />
                              <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", actSemaforo.color)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono text-muted-foreground">{act.codigo}</span>
                                  <PlanStatusBadge estado={planEstado} />
                                </div>
                                <span className="text-sm text-card-foreground">{act.nombre}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {canRegister && plan ? (
                                  <div className="flex items-center gap-1.5">
                                    {[0, 1, 2].map(mi => {
                                      const meta = mi === 0 ? plan.meta_mes_1 : mi === 1 ? plan.meta_mes_2 : plan.meta_mes_3;
                                      const ejec = mi === 0 ? plan.ejecutado_mes_1 : mi === 1 ? plan.ejecutado_mes_2 : plan.ejecutado_mes_3;
                                      return (
                                        <div key={mi} className="flex items-center gap-0.5">
                                          <MonthDot ejecutado={ejec} meta={meta} monthNum={monthNumbers[mi]} />
                                        </div>
                                      );
                                    })}
                                    <span className={cn("text-sm font-bold ml-1", actSemaforo.text)}>{act.avance_operativo_pct}%</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Lock className="h-3 w-3" /> Registro bloqueado
                                  </span>
                                )}
                              </div>
                            </button>

                            {/* NIVEL 3 - ÁRBOL */}
                            {isActOpen && (
                              <div className="px-6 pb-4 bg-muted/10 border-t">
                                <div className="py-3 space-y-4">
                                  {/* Trimestral progress display */}
                                  {plan && canRegister && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                        Avance Trimestral T{currentTrimestre} {currentAnio}
                                      </h5>
                                      <div className="grid grid-cols-3 gap-2 mb-2">
                                        {[0, 1, 2].map(mi => {
                                          const meta = mi === 0 ? plan.meta_mes_1 : mi === 1 ? plan.meta_mes_2 : plan.meta_mes_3;
                                          const ejec = mi === 0 ? plan.ejecutado_mes_1 : mi === 1 ? plan.ejecutado_mes_2 : plan.ejecutado_mes_3;
                                          const pct = meta > 0 ? Math.round((ejec / meta) * 100) : 0;
                                          return (
                                            <div key={mi} className="rounded-lg border bg-card p-2">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-medium text-muted-foreground">{monthNames[mi]}</span>
                                                <MonthDot ejecutado={ejec} meta={meta} monthNum={monthNumbers[mi]} />
                                              </div>
                                              <p className="text-xs font-mono font-bold">
                                                {ejec}<span className="text-muted-foreground font-normal">/{meta}</span>
                                              </p>
                                              <Progress value={pct} className="h-1 mt-1" />
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Trimestre: <strong className="text-foreground">
                                          {plan.ejecutado_mes_1 + plan.ejecutado_mes_2 + plan.ejecutado_mes_3}
                                          /{plan.meta_mes_1 + plan.meta_mes_2 + plan.meta_mes_3}
                                        </strong></span>
                                        <span>({plan.meta_trimestral > 0 ? Math.round(((plan.ejecutado_mes_1 + plan.ejecutado_mes_2 + plan.ejecutado_mes_3) / plan.meta_trimestral) * 100) : 0}% meta trim.)</span>
                                      </div>

                                      {/* Adjustment request button */}
                                      <div className="mt-2">
                                        {adjustingPlanId === plan.id ? (
                                          <div className="rounded-lg border bg-card p-3 space-y-2">
                                            <p className="text-xs font-medium">Solicitar ajuste de meta</p>
                                            <div className="flex gap-2">
                                              <select
                                                className="text-xs border rounded px-2 py-1"
                                                value={adjustMonth}
                                                onChange={(e) => setAdjustMonth(Number(e.target.value))}
                                              >
                                                {monthNames.map((m, i) => (
                                                  <option key={i} value={i + 1}>{m}</option>
                                                ))}
                                              </select>
                                              <Input
                                                type="number"
                                                placeholder="Nuevo valor"
                                                className="h-7 text-xs w-24"
                                                value={adjustValue}
                                                onChange={(e) => setAdjustValue(e.target.value)}
                                              />
                                            </div>
                                            <Textarea
                                              placeholder="Justificación (requerida)"
                                              className="text-xs min-h-[50px]"
                                              value={adjustJustification}
                                              onChange={(e) => setAdjustJustification(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                              <Button size="sm" className="text-xs h-7" onClick={handleAjuste} disabled={adjustSubmitting || !adjustJustification.trim()}>
                                                {adjustSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enviar solicitud"}
                                              </Button>
                                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setAdjustingPlanId(null)}>
                                                Cancelar
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs h-7 text-muted-foreground"
                                            onClick={() => setAdjustingPlanId(plan.id)}
                                          >
                                            Solicitar ajuste
                                          </Button>
                                        )}
                                      </div>

                                      {/* Pending adjustments */}
                                      {plan.solicitudes_ajuste.filter(a => a.status === "pendiente").length > 0 && (
                                        <div className="mt-2 rounded-lg border border-warning/30 bg-warning/5 p-2">
                                          <p className="text-[10px] text-warning font-medium mb-1">Ajustes pendientes:</p>
                                          {plan.solicitudes_ajuste.filter(a => a.status === "pendiente").map((a, i) => (
                                            <p key={i} className="text-[10px] text-muted-foreground">
                                              {monthNames[a.month - 1]}: {a.new_value} — "{a.justification}"
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Lock status banner */}
                                  {!canRegister && (
                                    <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3">
                                      {planEstado === "sin_plan" && (
                                        <p className="text-xs text-muted-foreground">
                                          El coordinador regional aún no ha propuesto un plan trimestral para esta actividad. El registro estará disponible una vez aprobado el plan.
                                        </p>
                                      )}
                                      {planEstado === "propuesta_coordinador" && (
                                        <p className="text-xs text-warning">
                                          ⏳ Plan propuesto — revisa la propuesta del coordinador arriba y acepta o comenta.
                                        </p>
                                      )}
                                      {planEstado === "en_disputa" && (
                                        <p className="text-xs text-warning">
                                          ⚠️ Plan en disputa — esperando respuesta del coordinador.
                                        </p>
                                      )}
                                      {planEstado === "borrador" && (
                                        <p className="text-xs text-muted-foreground">
                                          📝 El coordinador está elaborando el plan trimestral.
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Avance operativo - only show progress if plan approved */}
                                  {canRegister && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avance Operativo</h5>
                                      <div className="flex items-center gap-3">
                                        <Progress value={act.avance_operativo_pct} className="h-2.5 flex-1" />
                                        <span className={cn("text-sm font-bold", actSemaforo.text)}>{act.avance_operativo_pct}%</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Meta trim: {plan?.meta_trimestral} {act.meta_unidad_medida} · Estado: {act.estado_actual?.replace(/_/g, ' ')}
                                      </p>
                                    </div>
                                  )}

                                  {/* Secciones narrativas */}
                                  {reg?.descripcion_avance && (
                                    <CollapsibleNarrative
                                      icon={<Trophy className="h-4 w-4 text-success" />}
                                      title="Logros del trimestre"
                                      content={reg.descripcion_avance}
                                    />
                                  )}
                                  {reg?.limitaciones && (
                                    <CollapsibleNarrative
                                      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
                                      title="Dificultades y limitaciones"
                                      content={reg.limitaciones}
                                    />
                                  )}
                                  {reg?.prioridades_proximo_mes && (
                                    <CollapsibleNarrative
                                      icon={<CalendarClock className="h-4 w-4 text-primary" />}
                                      title="Programado para el siguiente trimestre"
                                      content={reg.prioridades_proximo_mes}
                                    />
                                  )}

                                  {/* Ejecución financiera */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ejecución Financiera</h5>
                                    <div className="grid grid-cols-3 gap-2">
                                      <FinanceCard label="SECO" executed={voucherTotals.get(act.codigo) || 0} budget={act.presupuesto_seco} />
                                      <FinanceCard label="Contrap. Monet." executed={act.ejecutado_cm_acum} budget={act.presupuesto_contrapartida_monetaria} />
                                      <FinanceCard label="Contrap. No Monet." executed={act.ejecutado_cnm_acum} budget={act.presupuesto_contrapartida_no_monetaria} />
                                    </div>
                                  </div>

                                  {/* Contratos y Gastos */}
                                  <ActividadContratosGastos actCodigo={act.codigo} entidadId={act.entidad_id} />

                                  {/* Último registro */}
                                  {reg && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Último Registro ({reg.mes}/{reg.anio})</h5>
                                      {reg.observaciones_revision?.startsWith("Sin reporte") ? (
                                        <Badge className="bg-destructive text-destructive-foreground text-xs">Sin reporte</Badge>
                                      ) : (
                                        <Card>
                                          <CardContent className="p-3 space-y-2 text-sm">
                                            {reg.descripcion_avance && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground">Logros:</p>
                                                <p className="text-card-foreground">{reg.descripcion_avance}</p>
                                              </div>
                                            )}
                                            {reg.observaciones_revision && (
                                              <div>
                                                <p className="text-xs font-medium text-destructive">Observaciones:</p>
                                                <p className="text-destructive/80">{reg.observaciones_revision}</p>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  )}

                                  {/* Botón registrar */}
                                  {canRegister ? (
                                    <button
                                      onClick={() => setSelectedActividad(act)}
                                      className="w-full py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                    >
                                      Registrar avance mensual
                                    </button>
                                  ) : (
                                    <div className="w-full py-2 text-xs font-medium text-muted-foreground bg-muted/30 rounded-lg text-center flex items-center justify-center gap-1.5">
                                      <Lock className="h-3.5 w-3.5" />
                                      {planEstado === "sin_plan"
                                        ? "Esperando plan del coordinador"
                                        : planEstado === "propuesta_coordinador"
                                        ? "Acepta el plan para habilitar el registro"
                                        : planEstado === "en_disputa"
                                        ? "Esperando resolución del coordinador"
                                        : "Esperando plan del coordinador"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RegistroMensualDialog
        actividad={selectedActividad}
        open={!!selectedActividad}
        onClose={() => {
          setSelectedActividad(null);
          if (entidadId) {
            fetchRegistrosEntidad(entidadId).then(setRegistros);
          }
        }}
      />
    </div>
  );
}

/** Plan status badge */
function PlanStatusBadge({ estado }: { estado: PlanEstado | "sin_plan" }) {
  const configs: Record<string, { label: string; className: string; icon: typeof Lock }> = {
    sin_plan: { label: "Sin plan", className: "bg-muted text-muted-foreground", icon: Lock },
    borrador: { label: "Borrador", className: "bg-muted text-muted-foreground", icon: Clock },
    propuesta_coordinador: { label: "Plan propuesto", className: "bg-warning/15 text-warning", icon: Clock },
    en_disputa: { label: "En disputa", className: "bg-destructive/15 text-destructive", icon: AlertTriangle },
    aprobada: { label: "Plan aprobado", className: "bg-success/15 text-success", icon: CheckCircle2 },
  };
  const cfg = configs[estado] || configs.sin_plan;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.className} text-[10px] px-1.5 py-0.5 gap-1`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function CollapsibleNarrative({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
      >
        {icon}
        <span className="text-xs font-semibold text-card-foreground flex-1">{title}</span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
        </div>
      )}
    </div>
  );
}

function FinanceCard({ label, executed, budget }: { label: string; executed: number; budget: number }) {
  const pct = budget > 0 ? Math.round((executed / budget) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card p-2">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-xs font-bold text-foreground">{formatUSD(executed)} <span className="font-normal text-muted-foreground">/ {formatUSD(budget)}</span></p>
      <Progress value={pct} className="h-1.5 mt-1" />
    </div>
  );
}

function ActividadContratosGastos({ actCodigo, entidadId }: { actCodigo: string; entidadId: string }) {
  const [contratos, setContratos] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      (supabase as any).from("contratos").select("*").eq("entidad_id", entidadId).order("nombre_contratado"),
      (supabase as any).from("vouchers_gasto").select("*").eq("entidad_id", entidadId).eq("codigo_actividad", actCodigo).order("fecha"),
    ]).then(([cRes, vRes]) => {
      setContratos(cRes.data || []);
      setVouchers(vRes.data || []);
      setLoading(false);
    });
  }, [actCodigo, entidadId]);

  if (loading) return <p className="text-xs text-muted-foreground py-2">Cargando...</p>;

  const totalVouchersUSD = vouchers.reduce((s: number, v: any) => s + (v.monto_usd || 0), 0);
  const totalVouchersPEN = vouchers.reduce((s: number, v: any) => s + (v.monto_pen || 0), 0);

  return (
    <Tabs defaultValue="contratos" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-8">
        <TabsTrigger value="contratos" className="text-xs gap-1">
          <FileCheck className="h-3 w-3" /> Contratos
        </TabsTrigger>
        <TabsTrigger value="gastos" className="text-xs gap-1">
          <Receipt className="h-3 w-3" /> Gastos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contratos" className="mt-2">
        {contratos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sin contratos vinculados</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Consultor</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-right">Monto USD</TableHead>
                  <TableHead className="text-xs">Vencimiento</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c: any) => {
                  const vencido = c.estado === "en_proceso" && c.fecha_vencimiento_producto && new Date(c.fecha_vencimiento_producto) < new Date();
                  return (
                    <TableRow key={c.id} className={vencido ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs font-medium max-w-[140px] truncate">{c.nombre_contratado}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{c.producto_entregable ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{c.monto != null ? formatUSD(c.monto) : "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.fecha_vencimiento_producto ? (
                          <span className={vencido ? "text-destructive font-medium" : ""}>
                            {c.fecha_vencimiento_producto}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className={cn("h-2.5 w-2.5 rounded-full", vencido ? "bg-destructive" : c.estado === "finalizado" ? "bg-success" : "bg-warning")} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="gastos" className="mt-2">
        {vouchers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sin gastos registrados para {actCodigo}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Proveedor</TableHead>
                  <TableHead className="text-xs">Concepto</TableHead>
                  <TableHead className="text-xs text-right">USD</TableHead>
                  <TableHead className="text-xs text-right">PEN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs font-mono">{v.fecha ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{v.proveedor ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">{v.concepto ?? "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{v.monto_usd != null ? formatUSD(v.monto_usd) : "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">S/{(v.monto_pen ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={3} className="text-xs">Total</TableCell>
                  <TableCell className="text-xs text-right font-mono">{formatUSD(totalVouchersUSD)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">S/{totalVouchersPEN.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
