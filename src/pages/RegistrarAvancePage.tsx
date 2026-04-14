import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, CheckCircle2, Loader2, ChevronDown, ChevronRight, AlertTriangle, Send, Save
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
  calcEstado,
  ESTADO_CONFIG,
} from "@/components/planificacion/MiPlanificacion";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function getMonthOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  // Show last 3 months + current month
  for (let i = -3; i <= 0; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: ym, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return options;
}

interface FormState {
  avance: string;
  avanceLogrado: string;
  limitaciones: string;
  proximosPasos: string;
}

interface ReportExisting {
  actividad_codigo: string;
  estado_registro: string;
  avance_valor: number | null;
  descripcion_avance: string | null;
  limitaciones: string | null;
  prioridades_proximo_mes: string | null;
}

export default function RegistrarAvancePage() {
  const { entidadId, entidades } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
  const [existingReports, setExistingReports] = useState<Map<string, ReportExisting>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedRI, setExpandedRI] = useState<Set<string>>(new Set());
  const [expandedAct, setExpandedAct] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, FormState>>({});
  const [riResumenes, setRiResumenes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);

  const selectedYear = parseInt(selectedMonth.split("-")[0]);
  const selectedMes = parseInt(selectedMonth.split("-")[1]);

  // Determine report status for the selected month
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
      (supabase as any).from("registros_mensuales").select("actividad_id, anio, mes, avance_valor, estado_registro, descripcion_avance, limitaciones, prioridades_proximo_mes, actividades!inner(codigo)").eq("entidad_id", entidadId),
    ]).then(([planRes, regRes]: any[]) => {
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

          // Store existing report for selected month
          if (ym === selectedMonth) {
            existing.set(code, {
              actividad_codigo: code,
              estado_registro: r.estado_registro,
              avance_valor: r.avance_valor,
              descripcion_avance: r.descripcion_avance,
              limitaciones: r.limitaciones,
              prioridades_proximo_mes: r.prioridades_proximo_mes,
            });
          }
        }
      }
      setReportsByActivity(byCode);
      setAvanceByActivity(avanceMap);
      setExistingReports(existing);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter activities that have a deliverable in selectedMonth or have rezago
  const activeActivities = useMemo(() => {
    return actividades.filter((a) => {
      const meses = a.meses_programados || [];
      // Activity has a deliverable in the selected month
      if (meses.includes(selectedMonth)) {
        const reported = reportsByActivity.get(a.actividad_codigo) || new Set<string>();
        if (!reported.has(selectedMonth)) return true;
      }
      // Or has rezago (past months without report)
      const reported = reportsByActivity.get(a.actividad_codigo) || new Set<string>();
      const pastWithout = meses.filter((m: string) => m < selectedMonth && !reported.has(m));
      if (pastWithout.length > 0) return true;
      return false;
    });
  }, [actividades, reportsByActivity, selectedMonth]);

  // Group by RI
  const riGroups = useMemo(() => {
    const groups = new Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }>();
    for (const a of activeActivities) {
      const key = a.resultado_intermedio_codigo || "SIN_RI";
      if (!groups.has(key)) {
        groups.set(key, { codigo: key, desc: a.resultado_intermedio_descripcion || "", acts: [] });
      }
      groups.get(key)!.acts.push(a);
    }
    return Array.from(groups.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [activeActivities]);

  // Auto-expand all RIs
  useEffect(() => {
    setExpandedRI(new Set(riGroups.map((g) => g.codigo)));
  }, [riGroups]);

  function getForm(actCode: string): FormState {
    return formData[actCode] || { avance: "1", avanceLogrado: "", limitaciones: "", proximosPasos: "" };
  }

  function updateForm(actCode: string, field: keyof FormState, value: string) {
    setFormData((prev) => ({ ...prev, [actCode]: { ...getForm(actCode), [field]: value } }));
  }

  async function saveActivity(act: PlanificacionActividad, asBorrador: boolean) {
    const form = getForm(act.actividad_codigo);
    if (!asBorrador && !form.avanceLogrado.trim()) {
      toast.error("Describe el avance logrado antes de enviar.");
      return false;
    }

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
      riResumen && `**Resumen del resultado (${act.resultado_intermedio_codigo}):**\n${riResumen}`,
      `**Avance logrado:**\n${form.avanceLogrado}`,
      form.limitaciones && `**Limitaciones:**\n${form.limitaciones}`,
      form.proximosPasos && `**Próximos pasos:**\n${form.proximosPasos}`,
    ].filter(Boolean).join("\n\n");

    const avanceNum = parseFloat(form.avance) || 0;

    const { error } = await (supabase as any).from("registros_mensuales").insert({
      actividad_id: actData.id,
      entidad_id: entidadId,
      anio: selectedYear,
      mes: selectedMes,
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

  async function handleSaveSingle(act: PlanificacionActividad, asBorrador: boolean) {
    setSavingId(act.actividad_codigo);
    const ok = await saveActivity(act, asBorrador);
    setSavingId(null);
    if (ok) {
      toast.success(asBorrador ? "Borrador guardado." : "Reporte enviado.");
      loadData();
    }
  }

  async function handleSaveAll(asBorrador: boolean) {
    if (activeActivities.length === 0) return;
    setGlobalSaving(true);
    let errors = 0;
    for (const act of activeActivities) {
      const form = getForm(act.actividad_codigo);
      if (!form.avanceLogrado.trim() && !asBorrador) continue; // skip empty
      const ok = await saveActivity(act, asBorrador);
      if (!ok) errors++;
    }
    setGlobalSaving(false);
    if (errors === 0) {
      toast.success(asBorrador ? "Borradores guardados." : "Reportes enviados correctamente.");
      loadData();
    } else {
      toast.error(`${errors} actividad(es) no se pudieron guardar.`);
      loadData();
    }
  }

  const isReadOnly = monthReportStatus === "enviado";

  if (!entidadCodigo) return null;

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
          <span className="text-xs text-muted-foreground italic">
            Reporte enviado — modo solo lectura
          </span>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="py-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent></Card>
      ) : riGroups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-70" />
            <p className="text-sm font-medium text-foreground">No hay entregables pendientes para {MONTH_NAMES[selectedMes - 1]} {selectedYear}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">REPORTE MENSUAL — {MONTH_NAMES[selectedMes - 1]} {selectedYear}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{entidad?.nombre_corto} · {entidad?.titulo_proyecto || "Chocolate Bean to Bar"}</p>
          </div>

          {riGroups.map((ri) => {
            const isRIExpanded = expandedRI.has(ri.codigo);
            return (
              <Card key={ri.codigo}>
                {/* RI Header */}
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
                        placeholder={`¿Qué está ocurriendo a nivel del ${ri.codigo}? Ej: "Los módulos eco-eficientes se encuentran en funcionamiento..."`}
                        value={riResumenes[ri.codigo] || ""}
                        onChange={(e) => setRiResumenes((prev) => ({ ...prev, [ri.codigo]: e.target.value }))}
                        className="mt-1.5"
                        rows={3}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Activities within this RI */}
                    {ri.acts.map((act) => {
                      const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
                      const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;
                      const estado = calcEstado(act.meses_programados || [], selectedMonth, reported, ejecutado, act.meta_total || 0);
                      const cfg = ESTADO_CONFIG[estado];
                      const isActExpanded = expandedAct.has(act.actividad_codigo);
                      const form = getForm(act.actividad_codigo);
                      const isSaving = savingId === act.actividad_codigo;
                      const isRezago = estado === "con_rezago";
                      const existingReport = existingReports.get(act.actividad_codigo);

                      return (
                        <div key={act.id} className={cn("border rounded-lg", isActExpanded && "ring-1 ring-primary/20")}>
                          <div
                            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedAct((prev) => {
                              const next = new Set(prev);
                              next.has(act.actividad_codigo) ? next.delete(act.actividad_codigo) : next.add(act.actividad_codigo);
                              return next;
                            })}
                          >
                            {isActExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            <span className="text-xs font-mono font-bold text-primary shrink-0">{act.actividad_codigo}</span>
                            <span className="text-sm truncate flex-1">{act.actividad_descripcion}</span>
                            <Badge className={cn("text-[10px] gap-1 border-0 shrink-0", cfg.bgColor, cfg.color)}>
                              {isRezago ? "🔴 HOY" : "● HOY"}
                            </Badge>
                          </div>

                          {isActExpanded && (
                            <div className="px-3 pb-3 space-y-3">
                              {/* Context bar */}
                              <div className="bg-muted/50 rounded p-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
                                <span><span className="text-muted-foreground">Meta:</span> <strong>{act.meta_total}</strong> {act.unidad_medida}</span>
                                <span><span className="text-muted-foreground">Ejecutado:</span> <strong>{ejecutado}/{act.meta_total}</strong></span>
                              </div>

                              {existingReport && existingReport.estado_registro !== "borrador" ? (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-sm">
                                  <p className="text-green-700 dark:text-green-400 font-medium text-xs">✓ Reporte registrado</p>
                                  {existingReport.avance_valor && (
                                    <p className="text-xs mt-1">Avance reportado: {existingReport.avance_valor} {act.unidad_medida}</p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {/* Avance numérico */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Avance este mes (cantidad)</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input
                                        type="number" min={0} step={1}
                                        value={form.avance}
                                        onChange={(e) => updateForm(act.actividad_codigo, "avance", e.target.value)}
                                        className="w-24 h-8 text-sm"
                                        disabled={isReadOnly}
                                      />
                                      <span className="text-xs text-muted-foreground">{act.unidad_medida}</span>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">Avance logrado *</Label>
                                    <Textarea
                                      placeholder="¿Qué se hizo concretamente este mes?"
                                      value={form.avanceLogrado}
                                      onChange={(e) => updateForm(act.actividad_codigo, "avanceLogrado", e.target.value)}
                                      className="mt-1" rows={2}
                                      disabled={isReadOnly}
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">Limitaciones</Label>
                                    <Textarea
                                      placeholder="Dificultades encontradas"
                                      value={form.limitaciones}
                                      onChange={(e) => updateForm(act.actividad_codigo, "limitaciones", e.target.value)}
                                      className="mt-1" rows={2}
                                      disabled={isReadOnly}
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">Próximos pasos</Label>
                                    <Textarea
                                      placeholder="Acciones planificadas"
                                      value={form.proximosPasos}
                                      onChange={(e) => updateForm(act.actividad_codigo, "proximosPasos", e.target.value)}
                                      className="mt-1" rows={2}
                                      disabled={isReadOnly}
                                    />
                                  </div>

                                  {!isReadOnly && (
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => handleSaveSingle(act, true)} disabled={isSaving || globalSaving}>
                                        {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                        <Save className="h-3 w-3 mr-1" />
                                        Borrador
                                      </Button>
                                      <Button size="sm" onClick={() => handleSaveSingle(act, false)} disabled={isSaving || globalSaving}>
                                        {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                        <Send className="h-3 w-3 mr-1" />
                                        Enviar
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Global actions */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-2 pb-6">
              <Button variant="outline" onClick={() => handleSaveAll(true)} disabled={globalSaving}>
                {globalSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Save className="h-4 w-4 mr-1" />
                Guardar borrador
              </Button>
              <Button onClick={() => handleSaveAll(false)} disabled={globalSaving}>
                {globalSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Send className="h-4 w-4 mr-1" />
                Enviar reporte
              </Button>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground italic text-center pb-4">
            Este formulario no incluye campos financieros. El avance financiero se registra en "Avance del Proyecto" al cierre del trimestre.
          </p>
        </div>
      )}
    </div>
  );
}
