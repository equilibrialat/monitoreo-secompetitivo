import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, CheckCircle2, Loader2, ChevronDown, ChevronRight, AlertTriangle, Send, Save, Clock, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/DashboardEntidad";
import {
  type PlanificacionActividad,
  getCurrentYearMonth,
  formatYM,
} from "@/components/planificacion/MiPlanificacion";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function getMonthOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: ym, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return options;
}

function getTrimestreForMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const mi = parseInt(m);
  if (mi <= 3) return `${y}-T1`;
  if (mi <= 6) return `${y}-T2`;
  if (mi <= 9) return `${y}-T3`;
  return `${y}-T4`;
}

interface FormState {
  avance: string;
  avanceLogrado: string;
  limitaciones: string;
  proximosPasos: string;
}

interface ReportExisting {
  id: string;
  actividad_codigo: string;
  mes_ym: string;
  estado_registro: string;
  avance_valor: number | null;
  descripcion_avance: string | null;
  limitaciones: string | null;
  prioridades_proximo_mes: string | null;
}

type ActivityLifecycle = "completada" | "vencida" | "entregable_este_mes" | "en_curso" | "por_iniciar";

interface VencidaEntry {
  act: PlanificacionActividad;
  mesVencido: string;
}

export default function RegistrarAvancePage() {
  const { entidadId, entidades } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [financieroByActivity, setFinancieroByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
  const [existingReports, setExistingReports] = useState<Map<string, ReportExisting>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedRI, setExpandedRI] = useState<Set<string>>(new Set());
  const [expandedAct, setExpandedAct] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, FormState>>({});
  const [riResumenes, setRiResumenes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const selectedYear = parseInt(selectedMonth.split("-")[0]);
  const selectedMes = parseInt(selectedMonth.split("-")[1]);

  const monthReportStatus = useMemo(() => {
    let hasEnviado = false;
    let hasBorrador = false;
    existingReports.forEach((r) => {
      if (r.estado_registro === "enviado" || r.estado_registro === "aprobado") hasEnviado = true;
      if (r.estado_registro === "borrador") hasBorrador = true;
    });
    if (hasEnviado) return "enviado";
    if (hasBorrador) return "borrador";
    return "sin_iniciar";
  }, [existingReports]);

  const loadData = useCallback(() => {
    if (!entidadCodigo || !entidadId) { setActividades([]); setLoading(false); return; }
    setLoading(true);

    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
      (supabase as any).from("registros_mensuales").select("id, actividad_id, anio, mes, avance_valor, estado_registro, descripcion_avance, limitaciones, prioridades_proximo_mes, actividades!inner(codigo)").eq("entidad_id", entidadId),
      (supabase as any).from("ejecucion_financiera").select("actividad_id, registro_mensual_id, registros_mensuales!inner(anio, mes), actividades!inner(codigo)").eq("entidad_id", entidadId),
    ]).then(([planRes, regRes, finRes]: any[]) => {
      const acts = planRes.data || [];
      setActividades(acts);

      const byCode = new Map<string, Set<string>>();
      const avanceMap = new Map<string, number>();
      const existing = new Map<string, ReportExisting>();

      if (regRes.data) {
        for (const r of regRes.data) {
          const code = r.actividades?.codigo;
          if (!code) continue;
          const ym = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
          if (!byCode.has(code)) byCode.set(code, new Set());
          byCode.get(code)!.add(ym);
          avanceMap.set(code, (avanceMap.get(code) || 0) + (r.avance_valor || 0));

          if (ym === selectedMonth) {
            existing.set(code, {
              id: r.id,
              actividad_codigo: code,
              mes_ym: ym,
              estado_registro: r.estado_registro,
              avance_valor: r.avance_valor,
              descripcion_avance: r.descripcion_avance,
              limitaciones: r.limitaciones,
              prioridades_proximo_mes: r.prioridades_proximo_mes,
            });
          }
        }
      }

      // Build financial-by-month map per activity
      const finMap = new Map<string, Set<string>>();
      if (finRes.data) {
        for (const f of finRes.data) {
          const code = f.actividades?.codigo;
          const rm = f.registros_mensuales;
          if (!code || !rm) continue;
          const ym = `${rm.anio}-${String(rm.mes).padStart(2, "0")}`;
          if (!finMap.has(code)) finMap.set(code, new Set());
          finMap.get(code)!.add(ym);
        }
      }

      setReportsByActivity(byCode);
      setFinancieroByActivity(finMap);
      setAvanceByActivity(avanceMap);
      setExistingReports(existing);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate lifecycle for each activity
  function getLifecycle(act: PlanificacionActividad): ActivityLifecycle {
    const meses = (act.meses_programados || []) as string[];
    if (!meses.length) return "por_iniciar";
    const sorted = [...meses].sort();
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const financiero = financieroByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;

    // A month is "fully done" only if BOTH technical (reported) AND financial entries exist
    const isFullyDone = (m: string) => reported.has(m) && financiero.has(m);

    // COMPLETADA — every month fully done + meta met
    const allPast = sorted.every(m => m <= selectedMonth);
    const allFullyDone = sorted.every(isFullyDone);
    if (allPast && allFullyDone && ejecutado >= (act.meta_total || 0) && (act.meta_total || 0) > 0) return "completada";

    // VENCIDA — past delivery month missing technical OR financial
    const pastIncomplete = sorted.filter(m => m < selectedMonth && !isFullyDone(m));
    if (pastIncomplete.length > 0) return "vencida";

    // ENTREGABLE ESTE MES — current month is delivery and missing technical OR financial
    if (sorted.includes(selectedMonth) && !isFullyDone(selectedMonth)) return "entregable_este_mes";

    // POR INICIAR
    if (sorted[0] > selectedMonth) return "por_iniciar";

    // EN CURSO
    return "en_curso";
  }

  // Separate activities into sections
  const { vencidas, entregablesEsteMes, completadas, proximoEntregable } = useMemo(() => {
    const vencidas: VencidaEntry[] = [];
    const entregablesEsteMes: PlanificacionActividad[] = [];
    const completadas: PlanificacionActividad[] = [];
    let proximoEntregable: { act: PlanificacionActividad; mes: string } | null = null;

    for (const act of actividades) {
      const lifecycle = getLifecycle(act);
      const meses = (act.meses_programados || []) as string[];
      const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
      const financiero = financieroByActivity.get(act.actividad_codigo) || new Set<string>();
      const isFullyDone = (m: string) => reported.has(m) && financiero.has(m);

      if (lifecycle === "completada") {
        completadas.push(act);
      } else if (lifecycle === "vencida") {
        // Create one entry per past month missing técnico OR financiero
        const sorted = [...meses].sort();
        const pastIncomplete = sorted.filter(m => m < selectedMonth && !isFullyDone(m));
        for (const mesVencido of pastIncomplete) {
          vencidas.push({ act, mesVencido });
        }
        // Current month also pending if delivery and not fully done
        if (meses.includes(selectedMonth) && !isFullyDone(selectedMonth)) {
          entregablesEsteMes.push(act);
        }
      } else if (lifecycle === "entregable_este_mes") {
        entregablesEsteMes.push(act);
      } else if (lifecycle === "en_curso" || lifecycle === "por_iniciar") {
        const sorted = [...meses].sort();
        const nextMonth = sorted.find(m => m >= selectedMonth && !isFullyDone(m));
        if (nextMonth && (!proximoEntregable || nextMonth < proximoEntregable.mes)) {
          proximoEntregable = { act, mes: nextMonth };
        }
      }
    }

    vencidas.sort((a, b) => a.mesVencido.localeCompare(b.mesVencido));

    return { vencidas, entregablesEsteMes, completadas, proximoEntregable };
  }, [actividades, reportsByActivity, financieroByActivity, avanceByActivity, selectedMonth]);

  // Group entregables by RI
  const riGroups = useMemo(() => {
    const groups = new Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }>();
    for (const a of entregablesEsteMes) {
      const key = a.resultado_intermedio_codigo || "SIN_RI";
      if (!groups.has(key)) {
        groups.set(key, { codigo: key, desc: a.resultado_intermedio_descripcion || "", acts: [] });
      }
      groups.get(key)!.acts.push(a);
    }
    return Array.from(groups.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [entregablesEsteMes]);

  useEffect(() => {
    setExpandedRI(new Set(riGroups.map((g) => g.codigo)));
    // Auto-expand overdue activities
    setExpandedAct(new Set(vencidas.map(v => `${v.act.actividad_codigo}_${v.mesVencido}`)));
  }, [riGroups, vencidas]);

  function getFormKey(actCode: string, mesYM?: string): string {
    return mesYM ? `${actCode}_${mesYM}` : actCode;
  }

  function getForm(key: string): FormState {
    return formData[key] || { avance: "1", avanceLogrado: "", limitaciones: "", proximosPasos: "" };
  }

  function updateForm(key: string, field: keyof FormState, value: string) {
    setFormData((prev) => ({ ...prev, [key]: { ...getForm(key), [field]: value } }));
  }

  async function saveReport(act: PlanificacionActividad, mesYM: string, formKey: string, asBorrador: boolean) {
    const form = getForm(formKey);
    if (!asBorrador && !form.avanceLogrado.trim()) {
      toast.error("Describe el avance logrado antes de enviar.");
      return false;
    }

    const [yearStr, mesStr] = mesYM.split("-");
    const anio = parseInt(yearStr);
    const mes = parseInt(mesStr);

    const { data: actData } = await (supabase as any)
      .from("actividades")
      .select("id")
      .eq("entidad_id", entidadId)
      .eq("codigo", act.actividad_codigo)
      .maybeSingle();

    if (!actData?.id) {
      toast.error(`No se encontró la actividad ${act.actividad_codigo} en la base de datos.`);
      return false;
    }

    const riResumen = riResumenes[act.resultado_intermedio_codigo] || "";
    const descripcion = [
      riResumen && `**Resumen RI (${act.resultado_intermedio_codigo}):**\n${riResumen}`,
      `**Avance logrado:**\n${form.avanceLogrado}`,
      form.limitaciones && `**Limitaciones:**\n${form.limitaciones}`,
      form.proximosPasos && `**Próximos pasos:**\n${form.proximosPasos}`,
    ].filter(Boolean).join("\n\n");

    const avanceNum = parseFloat(form.avance) || 0;

    const { error } = await (supabase as any).from("registros_mensuales").insert({
      actividad_id: actData.id,
      entidad_id: entidadId,
      anio,
      mes,
      descripcion_avance: descripcion,
      avance_valor: avanceNum > 0 ? avanceNum : null,
      avance_unidad_medida: act.unidad_medida,
      prioridades_proximo_mes: form.proximosPasos || null,
      limitaciones: form.limitaciones || null,
      estado_registro: asBorrador ? "borrador" : "enviado",
    });

    if (error) {
      toast.error("Error: " + error.message);
      return false;
    }
    return true;
  }

  async function handleSaveSingle(act: PlanificacionActividad, mesYM: string, formKey: string, asBorrador: boolean) {
    setSavingId(formKey);
    const ok = await saveReport(act, mesYM, formKey, asBorrador);
    setSavingId(null);
    if (ok) {
      toast.success(asBorrador ? "Borrador guardado." : "Reporte enviado.");
      loadData();
    }
  }

  async function handleSaveAll(asBorrador: boolean) {
    setGlobalSaving(true);
    let errors = 0;
    let saved = 0;

    // Save overdue activities
    for (const { act, mesVencido } of vencidas) {
      const formKey = getFormKey(act.actividad_codigo, mesVencido);
      const form = getForm(formKey);
      if (!form.avanceLogrado.trim() && !asBorrador) continue;
      const ok = await saveReport(act, mesVencido, formKey, asBorrador);
      if (!ok) errors++; else saved++;
    }

    // Save current month activities
    for (const act of entregablesEsteMes) {
      const formKey = getFormKey(act.actividad_codigo);
      const form = getForm(formKey);
      if (!form.avanceLogrado.trim() && !asBorrador) continue;
      const ok = await saveReport(act, selectedMonth, formKey, asBorrador);
      if (!ok) errors++; else saved++;
    }

    setGlobalSaving(false);
    if (errors === 0 && saved > 0) {
      toast.success(asBorrador ? "Borradores guardados." : "Reportes enviados correctamente.");
      loadData();
    } else if (errors > 0) {
      toast.error(`${errors} actividad(es) no se pudieron guardar.`);
      loadData();
    }
  }

  const isReadOnly = monthReportStatus === "enviado";
  const hasContent = vencidas.length > 0 || entregablesEsteMes.length > 0;
  const trimestreKey = getTrimestreForMonth(selectedMonth);
  const trimestreLabel = trimestreKey.split("-")[1];

  if (!entidadCodigo) return null;

  function renderActivityForm(act: PlanificacionActividad, mesYM: string, formKey: string, isOverdue: boolean) {
    const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
    const financiero = financieroByActivity.get(act.actividad_codigo) || new Set<string>();
    const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;
    const isActExpanded = expandedAct.has(formKey);
    const form = getForm(formKey);
    const isSaving = savingId === formKey;
    const existingReport = existingReports.get(act.actividad_codigo);
    const isThisMonthReport = mesYM === selectedMonth && existingReport;

    // Per-month dual status for THIS row (mesYM)
    const tecnicoOk = reported.has(mesYM);
    const financieroOk = financiero.has(mesYM);

    return (
      <div key={formKey} className={cn("border rounded-lg", isActExpanded && "ring-1 ring-primary/20", isOverdue && "border-destructive/30")}>
        <div
          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpandedAct((prev) => {
            const next = new Set(prev);
            next.has(formKey) ? next.delete(formKey) : next.add(formKey);
            return next;
          })}
        >
          {isActExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <span className="text-xs font-mono font-bold text-primary shrink-0">{act.actividad_codigo}</span>
          <span className="text-sm truncate flex-1">{act.actividad_descripcion}</span>

          {/* Dual status: técnico + financiero per month */}
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] gap-1 border",
                tecnicoOk
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/40"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40"
              )}
              title={tecnicoOk ? "Avance técnico presentado" : "Avance técnico pendiente"}
            >
              {tecnicoOk ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              Técnico
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] gap-1 border",
                financieroOk
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/40"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40"
              )}
              title={financieroOk ? "Avance financiero presentado" : "Avance financiero pendiente"}
            >
              {financieroOk ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              Financiero
            </Badge>
            {isOverdue && (
              <Badge className="text-[10px] gap-1 border-0 bg-destructive/10 text-destructive">
                ✗ {formatYM(mesYM)}
              </Badge>
            )}
          </div>
        </div>

        {isActExpanded && (
          <div className="px-3 pb-3 space-y-3">
            {/* Context bar */}
            <div className="bg-muted/50 rounded p-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-muted-foreground">Meta:</span> <strong>{act.meta_total}</strong> {act.unidad_medida}</span>
              <span><span className="text-muted-foreground">Ejecutado:</span> <strong>{ejecutado}/{act.meta_total}</strong></span>
              {isOverdue && (
                <span className="text-destructive font-medium">
                  Entregable programado en {formatYM(mesYM)} — no fue reportado
                </span>
              )}
            </div>

            {isThisMonthReport && isThisMonthReport.estado_registro !== "borrador" ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-sm">
                <p className="text-green-700 dark:text-green-400 font-medium text-xs">✓ Reporte registrado</p>
                {isThisMonthReport.avance_valor && (
                  <p className="text-xs mt-1">Avance reportado: {isThisMonthReport.avance_valor} {act.unidad_medida}</p>
                )}
              </div>
            ) : (
              <>
                {isOverdue && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded p-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                    Esta actividad tenía un entregable en <strong>{formatYM(mesYM)}</strong> que no fue reportado. Puedes registrarlo ahora.
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Avance este mes (cantidad)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number" min={0} step={1}
                      value={form.avance}
                      onChange={(e) => updateForm(formKey, "avance", e.target.value)}
                      className="w-24 h-8 text-sm"
                      disabled={isReadOnly}
                    />
                    <span className="text-xs text-muted-foreground">{act.unidad_medida}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Avance logrado *</Label>
                  <Textarea
                    placeholder="¿Qué se hizo concretamente?"
                    value={form.avanceLogrado}
                    onChange={(e) => updateForm(formKey, "avanceLogrado", e.target.value)}
                    className="mt-1" rows={2}
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Limitaciones</Label>
                  <Textarea
                    placeholder="Dificultades encontradas"
                    value={form.limitaciones}
                    onChange={(e) => updateForm(formKey, "limitaciones", e.target.value)}
                    className="mt-1" rows={2}
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Próximos pasos</Label>
                  <Textarea
                    placeholder="Acciones planificadas"
                    value={form.proximosPasos}
                    onChange={(e) => updateForm(formKey, "proximosPasos", e.target.value)}
                    className="mt-1" rows={2}
                    disabled={isReadOnly}
                  />
                </div>

                {!isReadOnly && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSaveSingle(act, mesYM, formKey, true)} disabled={isSaving || globalSaving}>
                      {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      <Save className="h-3 w-3 mr-1" /> Borrador
                    </Button>
                    <Button size="sm" onClick={() => handleSaveSingle(act, mesYM, formKey, false)} disabled={isSaving || globalSaving}>
                      {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      <Send className="h-3 w-3 mr-1" /> Enviar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Header title="Registrar Avance" subtitle={entidad?.nombre_corto} />

      {/* Month selector + status */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant={monthReportStatus === "enviado" ? "default" : monthReportStatus === "borrador" ? "secondary" : "outline"}
          className={cn("text-xs", monthReportStatus === "enviado" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
          {monthReportStatus === "enviado" ? "✓ Enviado" : monthReportStatus === "borrador" ? "Borrador" : "Sin iniciar"}
        </Badge>
        {isReadOnly && (
          <span className="text-xs text-muted-foreground italic">Reporte enviado — modo solo lectura</span>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="py-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent></Card>
      ) : !hasContent && completadas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-70" />
            <p className="text-sm font-medium text-foreground">No hay entregables pendientes para {MONTH_NAMES[selectedMes - 1]} {selectedYear}.</p>
            {proximoEntregable && (
              <p className="text-xs text-muted-foreground mt-2">
                Próximo entregable: <strong>{proximoEntregable.act.actividad_codigo}</strong> — {proximoEntregable.act.actividad_descripcion} — <strong>{formatYM(proximoEntregable.mes)}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">REPORTE MENSUAL — {MONTH_NAMES[selectedMes - 1]} {selectedYear}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{entidad?.nombre_corto}</p>
          </div>

          {/* SECTION 1: OVERDUE / VENCIDAS */}
          {vencidas.length > 0 && (
            <Card className="border-destructive/30">
              <div className="px-4 py-3 bg-destructive/5 border-b border-destructive/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">⚠ PENDIENTES DE PERIODOS ANTERIORES</span>
                  <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">{vencidas.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Estos entregables estaban programados y no fueron reportados a tiempo.</p>
              </div>
              <CardContent className="pt-3 space-y-3">
                {vencidas.map(({ act, mesVencido }) => {
                  const formKey = getFormKey(act.actividad_codigo, mesVencido);
                  return renderActivityForm(act, mesVencido, formKey, true);
                })}
              </CardContent>
            </Card>
          )}

          {/* SECTION 2: ENTREGABLES ESTE MES */}
          {entregablesEsteMes.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-sm font-semibold text-foreground">● ENTREGABLES DE ESTE MES</span>
                <Badge variant="outline" className="text-[10px]">{entregablesEsteMes.length}</Badge>
              </div>

              {riGroups.map((ri) => {
                const isRIExpanded = expandedRI.has(ri.codigo);
                return (
                  <Card key={ri.codigo}>
                    <div
                      className="flex items-start gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedRI((prev) => {
                        const next = new Set(prev);
                        next.has(ri.codigo) ? next.delete(ri.codigo) : next.add(ri.codigo);
                        return next;
                      })}
                    >
                      {isRIExpanded ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 shrink-0">{ri.codigo}</Badge>
                          <span className="text-sm font-medium truncate">{ri.desc}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ri.acts.length} actividad{ri.acts.length > 1 ? "es" : ""} activa{ri.acts.length > 1 ? "s" : ""} este mes
                        </p>
                      </div>
                    </div>

                    {isRIExpanded && (
                      <CardContent className="pt-0 space-y-4">
                        {/* RI Executive Summary */}
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <Label className="text-xs font-medium text-primary">
                            Resumen ejecutivo del Resultado Intermedio ({ri.codigo})
                          </Label>
                          <Textarea
                            placeholder={`¿Qué está ocurriendo a nivel del ${ri.codigo}?`}
                            value={riResumenes[ri.codigo] || ""}
                            onChange={(e) => setRiResumenes((prev) => ({ ...prev, [ri.codigo]: e.target.value }))}
                            className="mt-1.5" rows={3}
                            disabled={isReadOnly}
                          />
                        </div>

                        {ri.acts.map((act) => renderActivityForm(act, selectedMonth, getFormKey(act.actividad_codigo), false))}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </>
          )}

          {/* SECTION 3: COMPLETED */}
          {completadas.length > 0 && (
            <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 pt-2 cursor-pointer hover:opacity-80">
                  {completedOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-muted-foreground">✓ COMPLETADAS ESTE PROYECTO</span>
                  <Badge variant="outline" className="text-[10px]">{completadas.length}</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {completadas.map((act) => {
                        const meses = (act.meses_programados || []) as string[];
                        const lastMonth = [...meses].sort().pop();
                        return (
                          <Badge key={act.id} variant="outline" className="text-xs gap-1 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3" />
                            {act.actividad_codigo} ✓ {lastMonth ? formatYM(lastMonth) : ""}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Global actions */}
          {!isReadOnly && hasContent && (
            <div className="flex justify-end gap-3 pt-2 pb-4">
              <Button variant="outline" onClick={() => handleSaveAll(true)} disabled={globalSaving}>
                {globalSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Save className="h-4 w-4 mr-1" /> Guardar borrador
              </Button>
              <Button onClick={() => handleSaveAll(false)} disabled={globalSaving}>
                {globalSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Send className="h-4 w-4 mr-1" /> Enviar reporte
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="text-[10px] text-muted-foreground italic text-center pb-4 space-y-1">
            <p>Este formulario no incluye campos financieros. El avance financiero se registra en "Avance del Proyecto" al cierre del trimestre.</p>
            <p>Este reporte alimenta el <strong>Trimestral {trimestreLabel} {selectedYear}</strong>. <a href="/avance-proyecto" className="text-primary underline">Ver avance del proyecto →</a></p>
          </div>
        </div>
      )}
    </div>
  );
}
