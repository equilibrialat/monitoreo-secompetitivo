import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronDown, ChevronRight, Loader2, Send, Save, DollarSign, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { type PlanificacionActividad, formatYM } from "@/components/planificacion/MiPlanificacion";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_NAMES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const TRIMESTRE_OPTIONS = [
  { value: "T1", label: "T1 (Ene-Mar)", months: ["01", "02", "03"] },
  { value: "T2", label: "T2 (Abr-Jun)", months: ["04", "05", "06"] },
  { value: "T3", label: "T3 (Jul-Sep)", months: ["07", "08", "09"] },
  { value: "T4", label: "T4 (Oct-Dic)", months: ["10", "11", "12"] },
];

function getCurrentTrimestre() {
  const month = new Date().getMonth();
  if (month < 3) return "T1";
  if (month < 6) return "T2";
  if (month < 9) return "T3";
  return "T4";
}

function getCurrentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface FinancialForm {
  consultorias: string;
  terceros: string;
  bienes: string;
  viaticos: string;
  contrapartida: string;
  justificacion: string;
  avanceTecnico: string;
}

const emptyFinForm = (): FinancialForm => ({
  consultorias: "", terceros: "", bienes: "", viaticos: "", contrapartida: "", justificacion: "", avanceTecnico: "",
});

interface MonthlyReport {
  id: string;
  actividad_codigo: string;
  mes: number;
  anio: number;
  avance_valor: number | null;
  descripcion_avance: string | null;
  estado_registro: string;
}

export default function ReporteTrimestralPage() {
  const { entidadId, entidades } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedTrimestre, setSelectedTrimestre] = useState(getCurrentTrimestre());

  const trimestreKey = `${selectedYear}-${selectedTrimestre}`;
  const trimConfig = TRIMESTRE_OPTIONS.find((t) => t.value === selectedTrimestre)!;
  const trimestreMonths = trimConfig.months.map((m) => `${selectedYear}-${m}`);

  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [existingTrimReports, setExistingTrimReports] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedRI, setExpandedRI] = useState<Set<string>>(new Set());
  const [expandedAct, setExpandedAct] = useState<Set<string>>(new Set());
  const [finForms, setFinForms] = useState<Record<string, FinancialForm>>({});
  const [riResumenes, setRiResumenes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    if (!entidadCodigo || !entidadId) { setActividades([]); setLoading(false); return; }
    setLoading(true);

    const year = parseInt(selectedYear);
    const meses = trimConfig.months.map((m) => parseInt(m));

    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
      (supabase as any).from("registros_mensuales").select("id, actividad_id, anio, mes, avance_valor, descripcion_avance, estado_registro, actividades!inner(codigo)").eq("entidad_id", entidadId).eq("anio", year).in("mes", meses),
      (supabase as any).from("reportes_trimestrales").select("*").eq("entidad_codigo", entidadCodigo).eq("trimestre", trimestreKey),
    ]).then(([planRes, regRes, trimRes]: any[]) => {
      setActividades(planRes.data || []);

      const reports: MonthlyReport[] = (regRes.data || []).map((r: any) => ({
        id: r.id,
        actividad_codigo: r.actividades?.codigo || "",
        mes: r.mes,
        anio: r.anio,
        avance_valor: r.avance_valor,
        descripcion_avance: r.descripcion_avance,
        estado_registro: r.estado_registro,
      }));
      setMonthlyReports(reports);

      const trimMap = new Map<string, any>();
      if (trimRes.data) {
        for (const r of trimRes.data) trimMap.set(r.actividad_codigo, r);
      }
      setExistingTrimReports(trimMap);

      // Pre-load forms from existing quarterly data or from monthly data
      const forms: Record<string, FinancialForm> = {};
      const riRes: Record<string, string> = {};

      if (trimRes.data?.length) {
        for (const r of trimRes.data) {
          forms[r.actividad_codigo] = {
            consultorias: r.ejecutado_seco_consultorias > 0 ? String(r.ejecutado_seco_consultorias) : "",
            terceros: r.ejecutado_seco_terceros > 0 ? String(r.ejecutado_seco_terceros) : "",
            bienes: r.ejecutado_seco_bienes > 0 ? String(r.ejecutado_seco_bienes) : "",
            viaticos: r.ejecutado_seco_viaticos > 0 ? String(r.ejecutado_seco_viaticos) : "",
            contrapartida: r.ejecutado_contrapartida > 0 ? String(r.ejecutado_contrapartida) : "",
            justificacion: r.justificacion_variacion || "",
            avanceTecnico: r.avance_tecnico_trimestre > 0 ? String(r.avance_tecnico_trimestre) : "",
          };
          if (r.resumen_tecnico_ri) {
            // Find RI code for this activity
            const act = (planRes.data || []).find((a: any) => a.actividad_codigo === r.actividad_codigo);
            if (act?.resultado_intermedio_codigo) {
              riRes[act.resultado_intermedio_codigo] = r.resumen_tecnico_ri;
            }
          }
        }
      }
      setFinForms(forms);
      setRiResumenes(riRes);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId, selectedYear, selectedTrimestre, trimestreKey]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter activities that had any deliverable in the trimester months
  const trimActivities = useMemo(() => {
    return actividades.filter((a) => {
      const meses = a.meses_programados || [];
      return meses.some((m: string) => trimestreMonths.includes(m));
    });
  }, [actividades, trimestreMonths]);

  // Group by RI
  const riGroups = useMemo(() => {
    const groups = new Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }>();
    for (const a of trimActivities) {
      const key = a.resultado_intermedio_codigo || "SIN_RI";
      if (!groups.has(key)) groups.set(key, { codigo: key, desc: a.resultado_intermedio_descripcion || "", acts: [] });
      groups.get(key)!.acts.push(a);
    }
    return Array.from(groups.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [trimActivities]);

  useEffect(() => {
    setExpandedRI(new Set(riGroups.map((g) => g.codigo)));
  }, [riGroups]);

  // Monthly report helpers
  function getMonthlyReportsForAct(actCode: string): MonthlyReport[] {
    return monthlyReports.filter((r) => r.actividad_codigo === actCode);
  }

  function getMonthStatus(actCode: string, monthYM: string): "enviado" | "borrador" | "pendiente" {
    const [, m] = monthYM.split("-");
    const mes = parseInt(m);
    const report = monthlyReports.find(r => r.actividad_codigo === actCode && r.mes === mes);
    if (!report) return "pendiente";
    return report.estado_registro === "enviado" || report.estado_registro === "aprobado" ? "enviado" : "borrador";
  }

  function getMonthlyTechData(actCode: string) {
    const reports = getMonthlyReportsForAct(actCode);
    const totalAvance = reports.reduce((sum, r) => sum + (r.avance_valor || 0), 0);
    const reportIds = reports.map(r => r.id);
    return { totalAvance, reportIds };
  }

  function getMonthlyRISummary(riCode: string): string {
    const riActs = trimActivities.filter((a) => a.resultado_intermedio_codigo === riCode);
    const codes = riActs.map((a) => a.actividad_codigo);
    const reports = monthlyReports.filter((r) => codes.includes(r.actividad_codigo) && r.descripcion_avance);

    if (!reports.length) return "";

    return reports
      .sort((a, b) => a.mes - b.mes)
      .map((r) => `${MONTH_NAMES_SHORT[r.mes - 1]}: ${r.descripcion_avance}`)
      .join("\n\n");
  }

  function getFinForm(actCode: string): FinancialForm {
    if (finForms[actCode]) return finForms[actCode];
    const tech = getMonthlyTechData(actCode);
    return { ...emptyFinForm(), avanceTecnico: tech.totalAvance > 0 ? String(tech.totalAvance) : "" };
  }

  function updateFinForm(actCode: string, field: keyof FinancialForm, value: string) {
    setFinForms((prev) => ({
      ...prev,
      [actCode]: { ...(prev[actCode] || getFinForm(actCode)), [field]: value },
    }));
  }

  function calcSecoTotal(form: FinancialForm): number {
    return (parseFloat(form.consultorias) || 0) + (parseFloat(form.terceros) || 0) + (parseFloat(form.bienes) || 0) + (parseFloat(form.viaticos) || 0);
  }

  function calcPresupuestoProgramado(act: PlanificacionActividad): number {
    const meses = act.meses_programados || [];
    if (!meses.length) return 0;
    const trimestresWithDeliverables = new Set<string>();
    for (const m of meses) {
      const month = parseInt(m.split("-")[1]);
      if (month <= 3) trimestresWithDeliverables.add(`${m.split("-")[0]}-T1`);
      else if (month <= 6) trimestresWithDeliverables.add(`${m.split("-")[0]}-T2`);
      else if (month <= 9) trimestresWithDeliverables.add(`${m.split("-")[0]}-T3`);
      else trimestresWithDeliverables.add(`${m.split("-")[0]}-T4`);
    }
    const total = act.presupuesto_seco_usd || 0;
    return trimestresWithDeliverables.size > 0 ? total / trimestresWithDeliverables.size : 0;
  }

  function getVarianceClass(programado: number, ejecutado: number): { color: string; icon: string; level: string } {
    if (programado <= 0) return { color: "", icon: "", level: "none" };
    const pct = Math.abs(programado - ejecutado) / programado;
    if (pct <= 0.10) return { color: "text-green-600", icon: "🟢", level: "low" };
    if (pct <= 0.20) return { color: "text-amber-600", icon: "🟡", level: "medium" };
    return { color: "text-red-600", icon: "🔴", level: "high" };
  }

  // Compute global summary
  const globalSummary = useMemo(() => {
    let totalProgramado = 0;
    let totalEjecutado = 0;
    let totalContrapartida = 0;
    let actsWithReport = 0;

    for (const act of trimActivities) {
      const form = getFinForm(act.actividad_codigo);
      totalProgramado += calcPresupuestoProgramado(act);
      totalEjecutado += calcSecoTotal(form);
      totalContrapartida += parseFloat(form.contrapartida) || 0;

      const reports = getMonthlyReportsForAct(act.actividad_codigo);
      if (reports.length > 0) actsWithReport++;
    }

    return { totalProgramado, totalEjecutado, totalContrapartida, actsWithReport, totalActs: trimActivities.length };
  }, [trimActivities, finForms, monthlyReports]);

  async function handleSaveAll(asBorrador: boolean) {
    setSaving(true);
    let errors = 0;

    for (const act of trimActivities) {
      const form = getFinForm(act.actividad_codigo);
      const secoTotal = calcSecoTotal(form);
      const tech = getMonthlyTechData(act.actividad_codigo);
      const avanceTecTrimestre = parseFloat(form.avanceTecnico) || tech.totalAvance || 0;
      const presupuestoProg = calcPresupuestoProgramado(act);

      // Get all monthly avance for total historical
      // For simplicity, use trimester avance as trimestre value
      const riResumen = riResumenes[act.resultado_intermedio_codigo] || getMonthlyRISummary(act.resultado_intermedio_codigo) || "";

      const record: Record<string, any> = {
        entidad_codigo: entidadCodigo,
        actividad_codigo: act.actividad_codigo,
        trimestre: trimestreKey,
        meses_incluidos: trimestreMonths,
        resumen_tecnico_ri: riResumen,
        avance_tecnico_trimestre: avanceTecTrimestre,
        avance_tecnico_acumulado: avanceTecTrimestre, // Will be enhanced later with full historical
        presupuesto_seco_programado: presupuestoProg,
        ejecutado_seco_consultorias: parseFloat(form.consultorias) || 0,
        ejecutado_seco_terceros: parseFloat(form.terceros) || 0,
        ejecutado_seco_bienes: parseFloat(form.bienes) || 0,
        ejecutado_seco_viaticos: parseFloat(form.viaticos) || 0,
        ejecutado_contrapartida: parseFloat(form.contrapartida) || 0,
        variacion_seco: presupuestoProg - secoTotal,
        justificacion_variacion: form.justificacion || null,
        reportes_mensuales_origen: tech.reportIds,
        estado: asBorrador ? "borrador" : "enviado",
        enviado_at: asBorrador ? null : new Date().toISOString(),
      };

      const existing = existingTrimReports.get(act.actividad_codigo);
      let error: any;
      if (existing) {
        const { error: e } = await (supabase as any).from("reportes_trimestrales").update(record).eq("id", existing.id);
        error = e;
      } else {
        const { error: e } = await (supabase as any).from("reportes_trimestrales").insert(record);
        error = e;
      }
      if (error) { errors++; console.error(error); }
    }

    setSaving(false);
    if (errors === 0) {
      toast.success(asBorrador ? "Borrador guardado." : "Reporte trimestral enviado.");
      loadData();
    } else {
      toast.error(`${errors} error(es) al guardar.`);
    }
  }

  const isReadOnly = useMemo(() => {
    return Array.from(existingTrimReports.values()).some((r) => r.estado === "enviado");
  }, [existingTrimReports]);

  if (!entidadCodigo) return null;

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((y) => String(y));
  const currentYM = getCurrentYM();

  return (
    <div>
      <Header title="Avance del Proyecto" subtitle={entidad?.nombre_corto} />

      {/* Trimestre selector */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRIMESTRE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isReadOnly && (
          <Badge className="bg-green-100 text-green-700 text-xs">✓ Enviado</Badge>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="py-6 space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent></Card>
      ) : riGroups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No hay actividades programadas para este trimestre.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">REPORTE TRIMESTRAL — {selectedTrimestre} {selectedYear} ({trimConfig.months.map(m => MONTH_NAMES_SHORT[parseInt(m) - 1]).join(" · ")})</p>
            <p className="text-xs text-muted-foreground mt-0.5">{entidad?.nombre_corto} · {entidad?.titulo_proyecto || "Chocolate Bean to Bar"}</p>
          </div>

          {/* Monthly report status bar */}
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Estado de reportes mensuales del trimestre:</p>
              <div className="flex flex-wrap gap-3">
                {trimestreMonths.map((ym) => {
                  const [, m] = ym.split("-");
                  const mesIdx = parseInt(m) - 1;
                  const isFuture = ym > currentYM;
                  // Check if ANY activity has a report for this month
                  const hasReports = monthlyReports.some(r => r.mes === parseInt(m) && (r.estado_registro === "enviado" || r.estado_registro === "aprobado"));
                  const hasBorradores = monthlyReports.some(r => r.mes === parseInt(m) && r.estado_registro === "borrador");

                  return (
                    <div key={ym} className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium">{MONTH_NAMES_SHORT[mesIdx]}-{selectedYear.slice(2)}:</span>
                      {isFuture ? (
                        <span className="text-muted-foreground">◌ futuro</span>
                      ) : hasReports ? (
                        <span className="text-green-600 font-medium">✓ enviado</span>
                      ) : hasBorradores ? (
                        <span className="text-amber-600 font-medium">borrador</span>
                      ) : (
                        <span className="text-amber-500 font-medium">⚠ pendiente</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {monthlyReports.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Los datos técnicos no están disponibles aún. Puedes completar el trimestral igual y ajustar después.
                </p>
              )}
            </CardContent>
          </Card>

          {/* RI Groups */}
          {riGroups.map((ri) => {
            const isRIExpanded = expandedRI.has(ri.codigo);
            const monthlySummary = getMonthlyRISummary(ri.codigo);

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
                  {isRIExpanded ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 shrink-0">{ri.codigo}</Badge>
                      <span className="text-sm font-medium truncate">{ri.desc}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ri.acts.length} actividad{ri.acts.length > 1 ? "es" : ""}</p>
                  </div>
                </div>

                {isRIExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* RI Technical Summary */}
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <Label className="text-xs font-medium text-primary">Resumen técnico del trimestre ({ri.codigo})</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">
                        Pre-cargado desde reportes mensuales. Puede editar y sintetizar.
                      </p>
                      <Textarea
                        placeholder="Síntesis técnica del trimestre para este resultado intermedio..."
                        value={riResumenes[ri.codigo] ?? monthlySummary ?? ""}
                        onChange={(e) => setRiResumenes((prev) => ({ ...prev, [ri.codigo]: e.target.value }))}
                        rows={4}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Activities */}
                    {ri.acts.map((act) => {
                      const isActExpanded = expandedAct.has(act.actividad_codigo);
                      const form = getFinForm(act.actividad_codigo);
                      const tech = getMonthlyTechData(act.actividad_codigo);
                      const presupuestoProg = calcPresupuestoProgramado(act);
                      const secoTotal = calcSecoTotal(form);
                      const diff = presupuestoProg - secoTotal;
                      const variance = getVarianceClass(presupuestoProg, secoTotal);
                      const showJustificacion = variance.level === "medium" || variance.level === "high";
                      const actReports = getMonthlyReportsForAct(act.actividad_codigo);
                      const hasNoMonthlyReports = actReports.length === 0;

                      // Determine which months in this trimester have reports for this activity
                      const monthSourceStatus = trimestreMonths.map(ym => {
                        const [, m] = ym.split("-");
                        const status = getMonthStatus(act.actividad_codigo, ym);
                        return { ym, label: MONTH_NAMES_SHORT[parseInt(m) - 1], status };
                      });

                      return (
                        <div key={act.id} className={cn("border rounded-lg", isActExpanded && "ring-1 ring-primary/20", hasNoMonthlyReports && "border-amber-200")}>
                          <div
                            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30"
                            onClick={() => setExpandedAct((prev) => {
                              const next = new Set(prev);
                              next.has(act.actividad_codigo) ? next.delete(act.actividad_codigo) : next.add(act.actividad_codigo);
                              return next;
                            })}
                          >
                            {isActExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                            <span className="text-xs font-mono font-bold text-primary shrink-0">{act.actividad_codigo}</span>
                            <span className="text-sm truncate flex-1">{act.actividad_descripcion}</span>
                            {hasNoMonthlyReports && (
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 shrink-0">
                                <AlertTriangle className="h-3 w-3 mr-0.5" /> Sin rep. mensual
                              </Badge>
                            )}
                          </div>

                          {isActExpanded && (
                            <div className="px-3 pb-3 space-y-3">
                              {/* Monthly source indicator */}
                              <div className="bg-muted/50 rounded p-2 text-xs">
                                <span className="text-muted-foreground mr-1">Fuente:</span>
                                {monthSourceStatus.map(({ label, status }, i) => (
                                  <span key={i} className={cn("mr-2", status === "enviado" ? "text-green-600" : status === "borrador" ? "text-amber-600" : "text-muted-foreground")}>
                                    {label} {status === "enviado" ? "✓" : status === "borrador" ? "◐" : "⚠"}
                                  </span>
                                ))}
                              </div>

                              {hasNoMonthlyReports && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded p-2 text-xs text-amber-700">
                                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                                  Sin reporte mensual en este trimestre. El financiero sí puede registrarse aunque el técnico esté pendiente.
                                </div>
                              )}

                              {/* TECHNICAL section */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Técnico</p>
                                <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                                  <p>
                                    <span className="text-muted-foreground">Avance desde mensuales:</span>{" "}
                                    <strong>{tech.totalAvance}</strong> {act.unidad_medida}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">Acumulado histórico:</span>{" "}
                                    <strong>{tech.totalAvance} de {act.meta_total}</strong> ({act.meta_total ? Math.round((tech.totalAvance / act.meta_total) * 100) : 0}%)
                                  </p>
                                </div>
                                <div className="mt-2">
                                  <Label className="text-xs text-muted-foreground">Avance técnico trimestre (editable)</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Input
                                      type="number" min={0} step={1}
                                      value={form.avanceTecnico || String(tech.totalAvance || "")}
                                      onChange={(e) => updateFinForm(act.actividad_codigo, "avanceTecnico", e.target.value)}
                                      className="w-24 h-8 text-sm"
                                      disabled={isReadOnly}
                                    />
                                    <span className="text-xs text-muted-foreground">{act.unidad_medida}</span>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* FINANCIAL section */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financiero</p>
                                </div>

                                <div className="bg-muted/50 rounded p-2 text-xs mb-3">
                                  <p>
                                    <span className="text-muted-foreground">Presupuesto SECO programado {selectedTrimestre}:</span>{" "}
                                    <strong>USD {presupuestoProg.toLocaleString("en", { minimumFractionDigits: 0 })}</strong>
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">Ejecutado SECO {selectedTrimestre}:</p>
                                  {[
                                    { key: "consultorias" as const, label: "Serv. consultoría" },
                                    { key: "terceros" as const, label: "Serv. terceros" },
                                    { key: "bienes" as const, label: "Bienes de consumo" },
                                    { key: "viaticos" as const, label: "Viáticos" },
                                  ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="text-xs w-36 shrink-0">{label}</span>
                                      <Input
                                        type="number" min={0} step={0.01}
                                        placeholder="0"
                                        value={form[key]}
                                        onChange={(e) => updateFinForm(act.actividad_codigo, key, e.target.value)}
                                        className="w-28 h-7 text-xs"
                                        disabled={isReadOnly}
                                      />
                                      <span className="text-xs text-muted-foreground">USD</span>
                                    </div>
                                  ))}

                                  <div className="flex items-center gap-2 pt-1 border-t">
                                    <span className="text-xs w-36 font-semibold">Total ejecutado SECO</span>
                                    <span className="text-xs font-bold w-28 text-right">USD {secoTotal.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <Label className="text-xs text-muted-foreground">Ejecutado Contrapartida {selectedTrimestre}</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Input
                                      type="number" min={0} step={0.01}
                                      placeholder="0"
                                      value={form.contrapartida}
                                      onChange={(e) => updateFinForm(act.actividad_codigo, "contrapartida", e.target.value)}
                                      className="w-28 h-7 text-xs"
                                      disabled={isReadOnly}
                                    />
                                    <span className="text-xs text-muted-foreground">USD</span>
                                  </div>
                                </div>

                                {/* Difference */}
                                <div className={cn("mt-3 rounded p-2 text-xs flex items-center gap-2",
                                  variance.level === "high" ? "bg-red-50 dark:bg-red-900/20" :
                                  variance.level === "medium" ? "bg-amber-50 dark:bg-amber-900/10" : "bg-muted/50")}>
                                  <span className="text-muted-foreground">Diferencia:</span>
                                  <strong className={variance.color}>
                                    USD {diff.toLocaleString("en", { minimumFractionDigits: 2 })}
                                    {presupuestoProg > 0 && ` (${Math.round((diff / presupuestoProg) * 100)}%)`}
                                  </strong>
                                  <span>{variance.icon}</span>
                                </div>

                                {/* Justification */}
                                {showJustificacion && (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                      <Label className="text-xs text-amber-600">
                                        Justificación de variación ({variance.level === "high" ? ">20%" : ">10%"}) *
                                      </Label>
                                    </div>
                                    <Textarea
                                      placeholder="Explique la razón de la variación entre presupuesto programado y ejecutado..."
                                      value={form.justificacion}
                                      onChange={(e) => updateFinForm(act.actividad_codigo, "justificacion", e.target.value)}
                                      rows={2}
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                )}
                              </div>
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

          {/* GLOBAL SUMMARY */}
          <Card className="border-2">
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumen del trimestre (calculado automático)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Presupuesto SECO programado {selectedTrimestre}:</span>
                  <p className="font-bold mt-0.5">USD {globalSummary.totalProgramado.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total ejecutado SECO {selectedTrimestre}:</span>
                  <p className="font-bold mt-0.5">USD {globalSummary.totalEjecutado.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
                </div>
                <div>
                  {(() => {
                    const diff = globalSummary.totalProgramado - globalSummary.totalEjecutado;
                    const v = getVarianceClass(globalSummary.totalProgramado, globalSummary.totalEjecutado);
                    return (
                      <>
                        <span className="text-muted-foreground">Variación:</span>
                        <p className={cn("font-bold mt-0.5", v.color)}>
                          USD {diff.toLocaleString("en", { minimumFractionDigits: 0 })}
                          {globalSummary.totalProgramado > 0 && ` (${Math.round((diff / globalSummary.totalProgramado) * 100)}%)`}
                          {" "}{v.icon}
                        </p>
                      </>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-muted-foreground">Contrapartida ejecutada {selectedTrimestre}:</span>
                  <p className="font-bold mt-0.5">USD {globalSummary.totalContrapartida.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actividades con reporte técnico:</span>
                  <p className="font-bold mt-0.5">{globalSummary.actsWithReport} de {globalSummary.totalActs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Global actions */}
          {!isReadOnly ? (
            <div className="flex justify-end gap-3 pt-2 pb-6">
              <Button variant="outline" onClick={() => handleSaveAll(true)} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Save className="h-4 w-4 mr-1" /> Guardar borrador
              </Button>
              <Button onClick={() => handleSaveAll(false)} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Send className="h-4 w-4 mr-1" /> Enviar reporte
              </Button>
            </div>
          ) : (
            <div className="flex justify-center pb-6">
              <Badge className="bg-green-100 text-green-700 text-sm py-1 px-4">✓ Reporte enviado — modo solo lectura</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
