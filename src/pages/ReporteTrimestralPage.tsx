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
  ChevronDown, ChevronRight, Loader2, Send, Save, DollarSign, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { type PlanificacionActividad } from "@/components/planificacion/MiPlanificacion";

const TRIMESTRE_OPTIONS = [
  { value: "T1", label: "T1 (Ene-Mar)", months: ["01", "02", "03"] },
  { value: "T2", label: "T2 (Abr-Jun)", months: ["04", "05", "06"] },
  { value: "T3", label: "T3 (Jul-Sep)", months: ["07", "08", "09"] },
  { value: "T4", label: "T4 (Oct-Dic)", months: ["10", "11", "12"] },
];

function getCurrentTrimestre() {
  const month = new Date().getMonth(); // 0-indexed
  if (month < 3) return "T1";
  if (month < 6) return "T2";
  if (month < 9) return "T3";
  return "T4";
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
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
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
      (supabase as any).from("registros_mensuales").select("actividad_id, anio, mes, avance_valor, descripcion_avance, limitaciones, prioridades_proximo_mes, estado_registro, actividades!inner(codigo)").eq("entidad_id", entidadId).eq("anio", year).in("mes", meses),
      (supabase as any).from("reportes_trimestrales").select("*").eq("entidad_codigo", entidadCodigo).eq("trimestre", trimestreKey),
    ]).then(([planRes, regRes, trimRes]: any[]) => {
      setActividades(planRes.data || []);
      setMonthlyReports(regRes.data || []);

      const trimMap = new Map<string, any>();
      if (trimRes.data) {
        for (const r of trimRes.data) {
          trimMap.set(r.actividad_codigo, r);
        }
      }
      setExistingTrimReports(trimMap);

      // Pre-load financial forms from existing data
      const forms: Record<string, FinancialForm> = {};
      if (trimRes.data) {
        for (const r of trimRes.data) {
          forms[r.actividad_codigo] = {
            consultorias: r.ejecutado_seco_consultorias > 0 ? String(r.ejecutado_seco_consultorias) : "",
            terceros: r.ejecutado_seco_terceros > 0 ? String(r.ejecutado_seco_terceros) : "",
            bienes: r.ejecutado_seco_bienes > 0 ? String(r.ejecutado_seco_bienes) : "",
            viaticos: r.ejecutado_seco_viaticos > 0 ? String(r.ejecutado_seco_viaticos) : "",
            contrapartida: r.ejecutado_contrapartida > 0 ? String(r.ejecutado_contrapartida) : "",
            justificacion: r.justificacion_variacion || "",
            avanceTecnico: r.avance_tecnico_acumulado > 0 ? String(r.avance_tecnico_acumulado) : "",
          };
        }
      }
      setFinForms(forms);

      // Pre-load RI resumenes
      const riRes: Record<string, string> = {};
      if (trimRes.data) {
        for (const r of trimRes.data) {
          if (r.resultado_intermedio_codigo && r.resumen_tecnico_ri) {
            riRes[r.resultado_intermedio_codigo] = r.resumen_tecnico_ri;
          }
        }
      }
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

  // Pre-compute monthly technical data per activity
  function getMonthlyTechData(actCode: string) {
    const reports = monthlyReports.filter((r) => r.actividades?.codigo === actCode);
    const totalAvance = reports.reduce((sum: number, r: any) => sum + (r.avance_valor || 0), 0);
    const resumenes = reports
      .filter((r: any) => r.descripcion_avance)
      .map((r: any) => r.descripcion_avance)
      .join("\n\n---\n\n");
    return { totalAvance, resumenes };
  }

  // Pre-compute RI summary from monthly reports
  function getMonthlyRISummary(riCode: string) {
    const riActs = trimActivities.filter((a) => a.resultado_intermedio_codigo === riCode);
    const codes = riActs.map((a) => a.actividad_codigo);
    const reports = monthlyReports.filter((r) => codes.includes(r.actividades?.codigo));
    return reports
      .filter((r: any) => r.descripcion_avance)
      .map((r: any) => r.descripcion_avance)
      .join("\n\n---\n\n");
  }

  function getFinForm(actCode: string): FinancialForm {
    if (finForms[actCode]) return finForms[actCode];
    // Auto-fill technical from monthly
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
    return (parseFloat(form.consultorias) || 0) +
      (parseFloat(form.terceros) || 0) +
      (parseFloat(form.bienes) || 0) +
      (parseFloat(form.viaticos) || 0);
  }

  function calcPresupuestoProgramado(act: PlanificacionActividad): number {
    const meses = act.meses_programados || [];
    if (!meses.length) return 0;
    // Count how many trimestres have deliverables
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

  async function handleSaveAll(asBorrador: boolean) {
    setSaving(true);
    let errors = 0;

    for (const act of trimActivities) {
      const form = getFinForm(act.actividad_codigo);
      const secoTotal = calcSecoTotal(form);
      const riResumen = riResumenes[act.resultado_intermedio_codigo] || getMonthlyRISummary(act.resultado_intermedio_codigo) || "";
      const tech = getMonthlyTechData(act.actividad_codigo);
      const avanceTecnico = parseFloat(form.avanceTecnico) || tech.totalAvance || 0;

      const record = {
        entidad_codigo: entidadCodigo,
        actividad_codigo: act.actividad_codigo,
        resultado_intermedio_codigo: act.resultado_intermedio_codigo,
        trimestre: trimestreKey,
        resumen_tecnico_ri: riResumen,
        avance_tecnico_acumulado: avanceTecnico,
        presupuesto_seco_programado: calcPresupuestoProgramado(act),
        ejecutado_seco_consultorias: parseFloat(form.consultorias) || 0,
        ejecutado_seco_terceros: parseFloat(form.terceros) || 0,
        ejecutado_seco_bienes: parseFloat(form.bienes) || 0,
        ejecutado_seco_viaticos: parseFloat(form.viaticos) || 0,
        ejecutado_seco_total: secoTotal,
        ejecutado_contrapartida: parseFloat(form.contrapartida) || 0,
        justificacion_variacion: form.justificacion || null,
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

  return (
    <div>
      <Header title="Avance del Proyecto" subtitle={entidad?.nombre_corto} />

      {/* Trimestre selector */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIMESTRE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
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
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">REPORTE TRIMESTRAL — {selectedTrimestre} {selectedYear} ({trimConfig.label.split("(")[1]?.replace(")", "")})</p>
            <p className="text-xs text-muted-foreground mt-0.5">{entidad?.nombre_corto} · {entidad?.titulo_proyecto || "Chocolate Bean to Bar"}</p>
          </div>

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
                      <Label className="text-xs font-medium text-primary">
                        RESUMEN TÉCNICO DEL TRIMESTRE ({ri.codigo})
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">
                        Pre-cargado desde reportes mensuales. Puede editar y sintetizar.
                      </p>
                      <Textarea
                        placeholder="Síntesis técnica del trimestre para este resultado intermedio..."
                        value={riResumenes[ri.codigo] || monthlySummary || ""}
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
                      const showJustificacion = presupuestoProg > 0 && Math.abs(diff) / presupuestoProg > 0.10;

                      return (
                        <div key={act.id} className={cn("border rounded-lg", isActExpanded && "ring-1 ring-primary/20")}>
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
                          </div>

                          {isActExpanded && (
                            <div className="px-3 pb-3 space-y-3">
                              {/* Technical section */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Técnico</p>
                                <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                                  <p><span className="text-muted-foreground">Avance mensual acumulado:</span> <strong>{tech.totalAvance}</strong> {act.unidad_medida} <span className="text-muted-foreground">(desde reportes mensuales)</span></p>
                                </div>
                                <div className="mt-2">
                                  <Label className="text-xs text-muted-foreground">Avance técnico acumulado trimestre (editable)</Label>
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

                              {/* Financial section */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financiero</p>
                                </div>

                                <div className="bg-muted/50 rounded p-2 text-xs mb-3">
                                  <p><span className="text-muted-foreground">Presupuesto SECO programado trimestre:</span> <strong>USD {presupuestoProg.toLocaleString("en", { minimumFractionDigits: 0 })}</strong></p>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">Ejecutado SECO este trimestre:</p>
                                  {[
                                    { key: "consultorias" as const, label: "Servicios de consultoría" },
                                    { key: "terceros" as const, label: "Servicios de terceros" },
                                    { key: "bienes" as const, label: "Bienes de consumo" },
                                    { key: "viaticos" as const, label: "Viáticos" },
                                  ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="text-xs w-40 shrink-0">{label}</span>
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
                                    <span className="text-xs w-40 font-semibold">TOTAL EJECUTADO SECO</span>
                                    <span className="text-xs font-bold w-28 text-right">USD {secoTotal.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <Label className="text-xs text-muted-foreground">Ejecutado Contrapartida este trimestre</Label>
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
                                <div className={cn("mt-3 rounded p-2 text-xs", diff >= 0 ? "bg-muted/50" : "bg-red-50 dark:bg-red-900/20")}>
                                  <span className="text-muted-foreground">Diferencia (programado - ejecutado): </span>
                                  <strong className={cn(diff < 0 && "text-red-600")}>
                                    USD {diff.toLocaleString("en", { minimumFractionDigits: 2 })}
                                  </strong>
                                </div>

                                {/* Justification (only if >10% variance) */}
                                {showJustificacion && (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                      <Label className="text-xs text-amber-600">Justificación de variación (&gt;10%)</Label>
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

          {/* Global actions */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-2 pb-6">
              <Button variant="outline" onClick={() => handleSaveAll(true)} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Save className="h-4 w-4 mr-1" />
                Guardar borrador
              </Button>
              <Button onClick={() => handleSaveAll(false)} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Send className="h-4 w-4 mr-1" />
                Enviar reporte
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
