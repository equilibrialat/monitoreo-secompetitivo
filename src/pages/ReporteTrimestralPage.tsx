import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, Loader2, Send, Save, DollarSign, AlertTriangle, CheckCircle2, Eye, FileText, Plus, MinusCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { type PlanificacionActividad, formatYM } from "@/components/planificacion/MiPlanificacion";
import { useNavigate } from "react-router-dom";

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

function fmt(n: number | null | undefined): string {
  if (n == null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MonthlyReport {
  id: string;
  actividad_codigo: string;
  mes: number;
  anio: number;
  avance_valor: number | null;
  descripcion_avance: string | null;
  estado_registro: string;
}

interface FinView {
  actividad_codigo: string;
  trimestre: string;
  fuente: string;
  ejecutado_seco_consultorias: number;
  ejecutado_seco_terceros: number;
  ejecutado_seco_bienes: number;
  ejecutado_seco_otros: number;
  ejecutado_total_usd: number;
  numero_comprobantes: number;
}

interface Comprobante {
  id: string;
  fecha_documento: string;
  clase_documento: string | null;
  numero_documento: string | null;
  proveedor_nombre: string | null;
  concepto: string;
  monto_usd: number;
  tipo_gasto: string | null;
  fuente: string;
}

export default function ReporteTrimestralPage() {
  const { entidadId, entidades } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedTrimestre, setSelectedTrimestre] = useState(getCurrentTrimestre());

  const trimestreKey = `${selectedYear}-${selectedTrimestre}`;
  const trimConfig = TRIMESTRE_OPTIONS.find((t) => t.value === selectedTrimestre)!;
  const trimestreMonths = trimConfig.months.map((m) => `${selectedYear}-${m}`);

  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [finData, setFinData] = useState<FinView[]>([]);
  const [detailComprobantes, setDetailComprobantes] = useState<Comprobante[]>([]);
  const [existingTrimReports, setExistingTrimReports] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedRI, setExpandedRI] = useState<Set<string>>(new Set());
  const [expandedAct, setExpandedAct] = useState<Set<string>>(new Set());
  const [justificaciones, setJustificaciones] = useState<Record<string, string>>({});
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
      (supabase as any).from("v_reporte_financiero_trimestral").select("*").eq("entidad_codigo", entidadCodigo).eq("trimestre", trimestreKey),
    ]).then(([planRes, regRes, trimRes, finRes]: any[]) => {
      setActividades(planRes.data || []);

      const reports: MonthlyReport[] = (regRes.data || []).map((r: any) => ({
        id: r.id, actividad_codigo: r.actividades?.codigo || "",
        mes: r.mes, anio: r.anio, avance_valor: r.avance_valor,
        descripcion_avance: r.descripcion_avance, estado_registro: r.estado_registro,
      }));
      setMonthlyReports(reports);
      setFinData(finRes.data || []);

      const trimMap = new Map<string, any>();
      const justif: Record<string, string> = {};
      if (trimRes.data) {
        for (const r of trimRes.data) {
          trimMap.set(r.actividad_codigo, r);
          if (r.justificacion_variacion) justif[r.actividad_codigo] = r.justificacion_variacion;
        }
      }
      setExistingTrimReports(trimMap);
      setJustificaciones(justif);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId, selectedYear, selectedTrimestre, trimestreKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const trimActivities = useMemo(() => {
    return actividades.filter((a) => {
      const meses = a.meses_programados || [];
      return meses.some((m: string) => trimestreMonths.includes(m));
    });
  }, [actividades, trimestreMonths]);

  const riGroups = useMemo(() => {
    const groups = new Map<string, { codigo: string; desc: string; acts: PlanificacionActividad[] }>();
    for (const a of trimActivities) {
      const key = a.resultado_intermedio_codigo || "SIN_RI";
      if (!groups.has(key)) groups.set(key, { codigo: key, desc: a.resultado_intermedio_descripcion || "", acts: [] });
      groups.get(key)!.acts.push(a);
    }
    return Array.from(groups.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [trimActivities]);

  useEffect(() => { setExpandedRI(new Set(riGroups.map((g) => g.codigo))); }, [riGroups]);

  // Helpers
  function getMonthlyReportsForAct(actCode: string) {
    return monthlyReports.filter((r) => r.actividad_codigo === actCode);
  }

  function getMonthlyTechData(actCode: string) {
    const reports = getMonthlyReportsForAct(actCode);
    return { totalAvance: reports.reduce((sum, r) => sum + (r.avance_valor || 0), 0), reportIds: reports.map(r => r.id) };
  }

  function getMonthlyRISummary(riCode: string): string {
    const riActs = trimActivities.filter((a) => a.resultado_intermedio_codigo === riCode);
    const codes = riActs.map((a) => a.actividad_codigo);
    const reports = monthlyReports.filter((r) => codes.includes(r.actividad_codigo) && r.descripcion_avance);
    if (!reports.length) return "";
    return reports.sort((a, b) => a.mes - b.mes).map((r) => `${MONTH_NAMES_SHORT[r.mes - 1]}: ${r.descripcion_avance}`).join("\n\n");
  }

  function getFinForAct(actCode: string): { seco: FinView | null; contrapartida: FinView | null } {
    return {
      seco: finData.find(f => f.actividad_codigo === actCode && f.fuente === "seco") || null,
      contrapartida: finData.find(f => f.actividad_codigo === actCode && f.fuente !== "seco") || null,
    };
  }

  function calcPresupuestoProgramado(act: PlanificacionActividad): number {
    const meses = act.meses_programados || [];
    if (!meses.length) return 0;
    const trims = new Set<string>();
    for (const m of meses) {
      const mo = parseInt(m.split("-")[1]);
      const y = m.split("-")[0];
      if (mo <= 3) trims.add(`${y}-T1`);
      else if (mo <= 6) trims.add(`${y}-T2`);
      else if (mo <= 9) trims.add(`${y}-T3`);
      else trims.add(`${y}-T4`);
    }
    return trims.size > 0 ? (act.presupuesto_seco_usd || 0) / trims.size : 0;
  }

  function getVarianceInfo(programado: number, ejecutado: number) {
    if (programado <= 0) return { color: "", icon: "", level: "none" as const, pct: 0 };
    const pct = Math.abs(programado - ejecutado) / programado;
    if (pct <= 0.10) return { color: "text-green-600", icon: "🟢", level: "low" as const, pct };
    if (pct <= 0.20) return { color: "text-amber-600", icon: "🟡", level: "medium" as const, pct };
    return { color: "text-red-600", icon: "🔴", level: "high" as const, pct };
  }

  function getCruceStatus(techAvance: number, numComprobantes: number) {
    if (techAvance > 0 && numComprobantes > 0) return { icon: "✓", label: "Bien justificado", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" };
    if (numComprobantes > 0 && techAvance === 0) return { icon: "⚠", label: "Sin justificación técnica — gastó pero no reportó qué hizo", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10" };
    if (techAvance > 0 && numComprobantes === 0) return { icon: "◌", label: "Solo avance técnico — sin gasto registrado", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/10" };
    return { icon: "─", label: "Sin actividad este trimestre", color: "text-muted-foreground", bg: "bg-muted/30" };
  }

  async function loadComprobantesDetail(actCode: string) {
    const { data } = await (supabase as any).from("comprobantes").select("id, fecha_documento, clase_documento, numero_documento, proveedor_nombre, concepto, monto_usd, tipo_gasto, fuente").eq("entidad_codigo", entidadCodigo).eq("actividad_codigo", actCode).eq("trimestre", trimestreKey).order("fecha_documento");
    setDetailComprobantes(data || []);
  }

  const globalSummary = useMemo(() => {
    let totalProgramado = 0;
    let totalEjecutadoSeco = 0;
    let totalContrapartida = 0;
    let actsWithReport = 0;

    for (const act of trimActivities) {
      totalProgramado += calcPresupuestoProgramado(act);
      const fin = getFinForAct(act.actividad_codigo);
      totalEjecutadoSeco += fin.seco?.ejecutado_total_usd || 0;
      totalContrapartida += fin.contrapartida?.ejecutado_total_usd || 0;
      if (getMonthlyReportsForAct(act.actividad_codigo).length > 0) actsWithReport++;
    }
    return { totalProgramado, totalEjecutadoSeco, totalContrapartida, actsWithReport, totalActs: trimActivities.length };
  }, [trimActivities, finData, monthlyReports]);

  async function handleSaveAll(asBorrador: boolean) {
    setSaving(true);
    let errors = 0;
    for (const act of trimActivities) {
      const fin = getFinForAct(act.actividad_codigo);
      const tech = getMonthlyTechData(act.actividad_codigo);
      const presupuestoProg = calcPresupuestoProgramado(act);
      const secoTotal = fin.seco?.ejecutado_total_usd || 0;
      const riSummary = getMonthlyRISummary(act.resultado_intermedio_codigo) || "";

      const record: Record<string, any> = {
        entidad_codigo: entidadCodigo,
        actividad_codigo: act.actividad_codigo,
        trimestre: trimestreKey,
        meses_incluidos: trimestreMonths,
        resumen_tecnico_ri: riSummary,
        avance_tecnico_trimestre: tech.totalAvance,
        avance_tecnico_acumulado: tech.totalAvance,
        presupuesto_seco_programado: presupuestoProg,
        ejecutado_seco_consultorias: fin.seco?.ejecutado_seco_consultorias || 0,
        ejecutado_seco_terceros: fin.seco?.ejecutado_seco_terceros || 0,
        ejecutado_seco_bienes: fin.seco?.ejecutado_seco_bienes || 0,
        ejecutado_seco_viaticos: fin.seco?.ejecutado_seco_otros || 0,
        ejecutado_contrapartida: fin.contrapartida?.ejecutado_total_usd || 0,
        variacion_seco: presupuestoProg - secoTotal,
        justificacion_variacion: justificaciones[act.actividad_codigo] || null,
        reportes_mensuales_origen: tech.reportIds,
        estado: asBorrador ? "borrador" : "enviado",
        enviado_at: asBorrador ? null : new Date().toISOString(),
      };

      const existing = existingTrimReports.get(act.actividad_codigo);
      const { error } = existing
        ? await (supabase as any).from("reportes_trimestrales").update(record).eq("id", existing.id)
        : await (supabase as any).from("reportes_trimestrales").insert(record);
      if (error) { errors++; console.error(error); }
    }
    setSaving(false);
    if (errors === 0) {
      toast.success(asBorrador ? "Borrador guardado." : "Trimestre cerrado.");
      loadData();
    } else toast.error(`${errors} error(es) al guardar.`);
  }

  const isReadOnly = useMemo(() => {
    return Array.from(existingTrimReports.values()).some((r) => r.estado === "enviado");
  }, [existingTrimReports]);

  // Can only close trimestre if current month >= last month of trimestre
  const canClose = useMemo(() => {
    const currentYM = getCurrentYM();
    const lastMonth = trimestreMonths[trimestreMonths.length - 1];
    return currentYM >= lastMonth;
  }, [trimestreMonths]);

  if (!entidadCodigo) return null;

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(String);
  const currentYM = getCurrentYM();

  return (
    <div>
      <Header title="Avance del Proyecto" subtitle={entidad?.nombre_corto} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{TRIMESTRE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {isReadOnly && <Badge className="bg-green-100 text-green-700 text-xs">✓ Cerrado</Badge>}
      </div>

      {loading ? (
        <Card><CardContent className="py-6 space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</CardContent></Card>
      ) : riGroups.length === 0 ? (
        <Card><CardContent className="py-10 text-center"><p className="text-sm text-muted-foreground">No hay actividades programadas para este trimestre.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">REPORTE TRIMESTRAL — {selectedTrimestre} {selectedYear} ({trimConfig.months.map(m => MONTH_NAMES_SHORT[parseInt(m) - 1]).join(" · ")})</p>
            <p className="text-xs text-muted-foreground mt-0.5">{entidad?.nombre_corto}</p>
          </div>

          {/* Monthly status bar */}
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Reportes mensuales del trimestre:</p>
              <div className="flex flex-wrap gap-3">
                {trimestreMonths.map((ym) => {
                  const m = parseInt(ym.split("-")[1]);
                  const isFuture = ym > currentYM;
                  const hasEnv = monthlyReports.some(r => r.mes === m && (r.estado_registro === "enviado" || r.estado_registro === "aprobado"));
                  const hasBor = monthlyReports.some(r => r.mes === m && r.estado_registro === "borrador");
                  return (
                    <div key={ym} className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium">{MONTH_NAMES_SHORT[m - 1]}-{selectedYear.slice(2)}:</span>
                      {isFuture ? <span className="text-muted-foreground">○</span>
                        : hasEnv ? <span className="text-green-600 font-medium">✓ enviado</span>
                        : hasBor ? <span className="text-amber-600 font-medium">borrador</span>
                        : <span className="text-amber-500 font-medium">⚠ pendiente</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 italic">El técnico se toma de estos reportes automáticamente</p>
            </CardContent>
          </Card>

          {/* RI Groups */}
          {riGroups.map((ri) => {
            const isRIExpanded = expandedRI.has(ri.codigo);
            const monthlySummary = getMonthlyRISummary(ri.codigo);
            return (
              <Card key={ri.codigo}>
                <div className="flex items-start gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedRI(prev => { const n = new Set(prev); n.has(ri.codigo) ? n.delete(ri.codigo) : n.add(ri.codigo); return n; })}>
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
                    {/* RI Technical Summary — READ ONLY */}
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <Label className="text-xs font-medium text-primary">Síntesis técnica del trimestre ({ri.codigo})</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">Pre-cargado automáticamente desde los reportes mensuales — solo lectura</p>
                      {monthlySummary ? (
                        <div className="text-sm whitespace-pre-line text-foreground bg-background/50 rounded p-2 border">
                          {monthlySummary}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic bg-background/50 rounded p-2 border">
                          Sin reportes mensuales este trimestre
                        </div>
                      )}
                    </div>

                    {/* Activities */}
                    {ri.acts.map((act) => {
                      const isActExpanded = expandedAct.has(act.actividad_codigo);
                      const tech = getMonthlyTechData(act.actividad_codigo);
                      const fin = getFinForAct(act.actividad_codigo);
                      const presupuestoProg = calcPresupuestoProgramado(act);
                      const secoTotal = fin.seco?.ejecutado_total_usd || 0;
                      const diff = presupuestoProg - secoTotal;
                      const variance = getVarianceInfo(presupuestoProg, secoTotal);
                      const showJustif = variance.level === "medium" || variance.level === "high";
                      const numComprobantes = fin.seco?.numero_comprobantes || 0;
                      const cruce = getCruceStatus(tech.totalAvance, numComprobantes);

                      const monthSourceStatus = trimestreMonths.map(ym => {
                        const m = parseInt(ym.split("-")[1]);
                        const report = monthlyReports.find(r => r.actividad_codigo === act.actividad_codigo && r.mes === m);
                        const avVal = report?.avance_valor;
                        if (!report) return { label: MONTH_NAMES_SHORT[m - 1], status: "sin reporte" as const, avance: null };
                        const st = (report.estado_registro === "enviado" || report.estado_registro === "aprobado") ? "enviado" as const : "borrador" as const;
                        return { label: MONTH_NAMES_SHORT[m - 1], status: st, avance: avVal };
                      });

                      return (
                        <div key={act.id} className={cn("border rounded-lg", isActExpanded && "ring-1 ring-primary/20")}>
                          <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30"
                            onClick={() => setExpandedAct(prev => { const n = new Set(prev); n.has(act.actividad_codigo) ? n.delete(act.actividad_codigo) : n.add(act.actividad_codigo); return n; })}>
                            {isActExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                            <span className="text-xs font-mono font-bold text-primary shrink-0">{act.actividad_codigo}</span>
                            <span className="text-sm truncate flex-1">{act.actividad_descripcion}</span>
                            <span className={cn("text-xs shrink-0", cruce.color)}>{cruce.icon}</span>
                          </div>

                          {isActExpanded && (
                            <div className="px-3 pb-3 space-y-3">
                              {/* TÉCNICO — READ ONLY from mensuales */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Técnico (desde mensuales — solo lectura)</p>
                                </div>
                                <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                                  <div className="flex flex-wrap gap-2">
                                    {monthSourceStatus.map(({ label, status, avance }, i) => (
                                      <span key={i} className={cn(
                                        status === "enviado" ? "text-green-600" : status === "borrador" ? "text-amber-600" : "text-muted-foreground"
                                      )}>
                                        {label}: {status === "enviado" ? `✓ ${avance ?? 0} ${act.unidad_medida}` : status === "borrador" ? "◐ borrador" : "sin reporte"}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="pt-1">
                                    <span className="text-muted-foreground">Acumulado trimestre:</span>{" "}
                                    <strong>{tech.totalAvance} {act.unidad_medida}</strong> de {act.meta_total}
                                  </p>
                                </div>
                              </div>

                              <Separator />

                              {/* FINANCIERO */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financiero (ingreso en este formulario)</p>
                                </div>

                                <div className="bg-muted/50 rounded p-2 text-xs mb-2">
                                  <p><span className="text-muted-foreground">Presupuesto programado {selectedTrimestre}:</span> <strong>USD {fmt(presupuestoProg)}</strong></p>
                                </div>

                                <div className="text-xs mb-2">
                                  <p className="text-muted-foreground">Comprobantes registrados: <strong>USD {fmt(secoTotal)}</strong> ({numComprobantes} documentos)</p>
                                </div>

                                {numComprobantes > 0 && (
                                  <div className="space-y-1 text-xs pl-2 mb-2">
                                    {[
                                      { label: "Consultorías", val: fin.seco?.ejecutado_seco_consultorias || 0 },
                                      { label: "Terceros", val: fin.seco?.ejecutado_seco_terceros || 0 },
                                      { label: "Bienes", val: fin.seco?.ejecutado_seco_bienes || 0 },
                                      { label: "Viáticos/Honorarios", val: fin.seco?.ejecutado_seco_otros || 0 },
                                    ].filter(x => x.val > 0).map(({ label, val }) => (
                                      <div key={label} className="flex items-center gap-2">
                                        <span className="w-36 shrink-0 text-muted-foreground">{label}:</span>
                                        <span className="font-mono font-medium">USD {fmt(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate("/gestion-contratos-fin")}>
                                    <Plus className="h-3 w-3 mr-1" /> Agregar comprobante
                                  </Button>
                                  {numComprobantes > 0 && (
                                    <Sheet>
                                      <SheetTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => loadComprobantesDetail(act.actividad_codigo)}>
                                          <Eye className="h-3 w-3 mr-1" /> Ver detalle
                                        </Button>
                                      </SheetTrigger>
                                      <SheetContent className="overflow-y-auto">
                                        <SheetHeader><SheetTitle className="text-sm">Comprobantes — {act.actividad_codigo} — {trimestreKey}</SheetTitle></SheetHeader>
                                        <div className="mt-4">
                                          <Table>
                                            <TableHeader><TableRow>
                                              <TableHead className="text-xs">Fecha</TableHead>
                                              <TableHead className="text-xs">Doc</TableHead>
                                              <TableHead className="text-xs">Concepto</TableHead>
                                              <TableHead className="text-xs text-right">USD</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                              {detailComprobantes.map(c => (
                                                <TableRow key={c.id}>
                                                  <TableCell className="text-xs">{c.fecha_documento}</TableCell>
                                                  <TableCell className="text-xs">{c.clase_documento}</TableCell>
                                                  <TableCell className="text-xs max-w-[200px] truncate">{c.concepto}</TableCell>
                                                  <TableCell className="text-xs text-right font-mono">{fmt(c.monto_usd)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </SheetContent>
                                    </Sheet>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/gestion-contratos-fin")}>
                                    Ver contratos
                                  </Button>
                                </div>

                                {(fin.contrapartida?.ejecutado_total_usd || 0) > 0 && (
                                  <div className="mt-2 text-xs">
                                    <span className="text-muted-foreground">Contrapartida:</span>{" "}
                                    <strong>USD {fmt(fin.contrapartida?.ejecutado_total_usd)}</strong>
                                  </div>
                                )}

                                {/* Variance */}
                                {presupuestoProg > 0 && (
                                  <div className={cn("mt-3 rounded p-2 text-xs flex items-center gap-2",
                                    variance.level === "high" ? "bg-red-50 dark:bg-red-900/20" :
                                    variance.level === "medium" ? "bg-amber-50 dark:bg-amber-900/10" : "bg-muted/50")}>
                                    <span className="text-muted-foreground">Variación:</span>
                                    <strong className={variance.color}>
                                      USD {fmt(diff)} {presupuestoProg > 0 && `(${Math.round((diff / presupuestoProg) * 100)}%)`}
                                    </strong>
                                    <span>{variance.icon}</span>
                                  </div>
                                )}

                                {showJustif && !isReadOnly && (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                      <Label className="text-xs text-amber-600">Justificación de variación ({variance.level === "high" ? ">20%" : ">10%"}) *</Label>
                                    </div>
                                    <Textarea placeholder="Explique la razón de la variación..." rows={2}
                                      value={justificaciones[act.actividad_codigo] || ""}
                                      onChange={(e) => setJustificaciones(prev => ({ ...prev, [act.actividad_codigo]: e.target.value }))}
                                    />
                                  </div>
                                )}
                              </div>

                              <Separator />

                              {/* CRUCE TÉCNICO-FINANCIERO */}
                              <div className={cn("rounded p-2 text-xs flex items-center gap-2", cruce.bg)}>
                                <span className={cn("font-bold", cruce.color)}>{cruce.icon}</span>
                                <span className="text-muted-foreground">CRUCE:</span>
                                <span className={cruce.color}>{cruce.label}</span>
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumen del trimestre</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Presupuesto SECO programado:</span>
                  <p className="font-bold mt-0.5">USD {fmt(globalSummary.totalProgramado)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total ejecutado SECO:</span>
                  <p className="font-bold mt-0.5">USD {fmt(globalSummary.totalEjecutadoSeco)}</p>
                </div>
                <div>
                  {(() => {
                    const d = globalSummary.totalProgramado - globalSummary.totalEjecutadoSeco;
                    const v = getVarianceInfo(globalSummary.totalProgramado, globalSummary.totalEjecutadoSeco);
                    return (<>
                      <span className="text-muted-foreground">Variación:</span>
                      <p className={cn("font-bold mt-0.5", v.color)}>
                        USD {fmt(d)} {globalSummary.totalProgramado > 0 && `(${Math.round((d / globalSummary.totalProgramado) * 100)}%)`} {v.icon}
                      </p>
                    </>);
                  })()}
                </div>
                <div>
                  <span className="text-muted-foreground">Contrapartida ejecutada:</span>
                  <p className="font-bold mt-0.5">USD {fmt(globalSummary.totalContrapartida)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actividades con reporte técnico:</span>
                  <p className="font-bold mt-0.5">{globalSummary.actsWithReport} de {globalSummary.totalActs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {!isReadOnly ? (
            <div className="flex justify-end gap-3 pt-2 pb-6">
              <Button variant="outline" onClick={() => handleSaveAll(true)} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Save className="h-4 w-4 mr-1" /> Guardar borrador
              </Button>
              <Button onClick={() => handleSaveAll(false)} disabled={saving || !canClose}
                title={!canClose ? "Solo disponible a partir del último mes del trimestre" : ""}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Send className="h-4 w-4 mr-1" /> Cerrar trimestre
              </Button>
              {!canClose && (
                <span className="text-[10px] text-muted-foreground self-center">Disponible a partir de {MONTH_NAMES_SHORT[parseInt(trimConfig.months[2]) - 1]}</span>
              )}
            </div>
          ) : (
            <div className="flex justify-center pb-6">
              <Badge className="bg-green-100 text-green-700 text-sm py-1 px-4">✓ Trimestre cerrado — modo solo lectura</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
