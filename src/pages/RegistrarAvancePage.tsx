import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, AlertTriangle, CheckCircle2, Calendar, Loader2, ChevronDown, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/DashboardEntidad";
import {
  type PlanificacionActividad,
  type ActividadEstado,
  getCurrentYearMonth,
  formatYM,
  calcEstado,
  calcProximoEntregable,
  ESTADO_CONFIG,
} from "@/components/planificacion/MiPlanificacion";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function RegistrarAvancePage() {
  const { entidadId, entidades } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;
  const currentYM = getCurrentYearMonth();
  const now = new Date();

  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportsByActivity, setReportsByActivity] = useState<Map<string, Set<string>>>(new Map());
  const [avanceByActivity, setAvanceByActivity] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Form state per activity
  const [expandedAct, setExpandedAct] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, {
    avance: string; resumenRI: string; avanceLogrado: string; limitaciones: string; proximosPasos: string;
  }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Shared RI resumen per RI code
  const [riResumenes, setRiResumenes] = useState<Record<string, string>>({});

  function loadData() {
    if (!entidadCodigo || !entidadId) { setActividades([]); setLoading(false); return; }
    setLoading(true);

    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
      (supabase as any).from("registros_mensuales").select("actividad_id, anio, mes, avance_valor, estado_registro, actividades!inner(codigo)").eq("entidad_id", entidadId),
    ]).then(([planRes, regRes]: any[]) => {
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
      setLoading(false);
    });
  }

  useEffect(() => { loadData(); }, [entidadCodigo, entidadId]);

  // Filter: only activities with pending deliverables
  const pendientes = useMemo(() => {
    return actividades.filter((a) => {
      const meses = a.meses_programados || [];
      const reported = reportsByActivity.get(a.actividad_codigo) || new Set<string>();
      const ejecutado = avanceByActivity.get(a.actividad_codigo) || 0;
      const estado = calcEstado(meses, currentYM, reported, ejecutado, a.meta_total || 0);
      return estado === "entregable_este_mes" || estado === "con_rezago";
    }).sort((a, b) => {
      // Rezago first
      const reportedA = reportsByActivity.get(a.actividad_codigo) || new Set<string>();
      const reportedB = reportsByActivity.get(b.actividad_codigo) || new Set<string>();
      const ejecutadoA = avanceByActivity.get(a.actividad_codigo) || 0;
      const ejecutadoB = avanceByActivity.get(b.actividad_codigo) || 0;
      const estadoA = calcEstado(a.meses_programados || [], currentYM, reportedA, ejecutadoA, a.meta_total || 0);
      const estadoB = calcEstado(b.meses_programados || [], currentYM, reportedB, ejecutadoB, b.meta_total || 0);
      if (estadoA === "con_rezago" && estadoB !== "con_rezago") return -1;
      if (estadoB === "con_rezago" && estadoA !== "con_rezago") return 1;
      return 0;
    });
  }, [actividades, reportsByActivity, avanceByActivity, currentYM]);

  // Calculate next deliverable for empty state
  const proximoEntregable = useMemo(() => {
    if (pendientes.length > 0) return null;
    let earliest: { act: PlanificacionActividad; month: string } | null = null;
    for (const a of actividades) {
      const reported = reportsByActivity.get(a.actividad_codigo) || new Set<string>();
      const proximo = calcProximoEntregable(a.meses_programados || [], currentYM, reported);
      if (proximo && proximo > currentYM) {
        if (!earliest || proximo < earliest.month) earliest = { act: a, month: proximo };
      }
    }
    return earliest;
  }, [pendientes, actividades, reportsByActivity, currentYM]);

  function getForm(actId: string) {
    return formData[actId] || { avance: "1", resumenRI: "", avanceLogrado: "", limitaciones: "", proximosPasos: "" };
  }

  function updateForm(actId: string, field: string, value: string) {
    setFormData((prev) => ({ ...prev, [actId]: { ...getForm(actId), [field]: value } }));
  }

  async function handleSave(act: PlanificacionActividad, asBorrador: boolean) {
    const form = getForm(act.id);
    if (!asBorrador && !form.avanceLogrado.trim()) {
      toast.error("Describe el avance logrado antes de enviar.");
      return;
    }

    setSavingId(act.id);

    const { data: actData } = await (supabase as any)
      .from("actividades")
      .select("id")
      .eq("entidad_id", entidadId)
      .eq("codigo", act.actividad_codigo)
      .maybeSingle();

    if (!actData?.id) {
      toast.error("No se encontró la actividad vinculada en la base de datos.");
      setSavingId(null);
      return;
    }

    const resumenRI = form.resumenRI || riResumenes[act.resultado_intermedio_codigo] || "";
    const descripcion = [
      resumenRI && `**Resumen del resultado (${act.resultado_intermedio_codigo}):**\n${resumenRI}`,
      `**Avance logrado:**\n${form.avanceLogrado}`,
      form.limitaciones && `**Limitaciones:**\n${form.limitaciones}`,
      form.proximosPasos && `**Próximos pasos:**\n${form.proximosPasos}`,
    ].filter(Boolean).join("\n\n");

    const avanceNum = parseFloat(form.avance) || 0;

    const { error } = await (supabase as any).from("registros_mensuales").insert({
      actividad_id: actData.id,
      entidad_id: entidadId,
      anio: now.getFullYear(),
      mes: now.getMonth() + 1,
      descripcion_avance: descripcion,
      avance_valor: avanceNum > 0 ? avanceNum : null,
      avance_unidad_medida: act.unidad_medida,
      prioridades_proximo_mes: form.proximosPasos || null,
      limitaciones: form.limitaciones || null,
      estado_registro: asBorrador ? "borrador" : "enviado",
    });

    setSavingId(null);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success(asBorrador ? "Borrador guardado." : "Reporte enviado correctamente.");
      // Save RI resumen for other activities
      if (resumenRI) {
        setRiResumenes((prev) => ({ ...prev, [act.resultado_intermedio_codigo]: resumenRI }));
      }
      // Clear form
      setFormData((prev) => { const n = { ...prev }; delete n[act.id]; return n; });
      setExpandedAct(null);
      loadData();
    }
  }

  if (!entidadCodigo) return null;

  return (
    <div>
      <Header title="Registrar Avance" subtitle={`${entidad?.nombre_corto} · ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`} />

      {loading ? (
        <Card><CardContent className="py-6 space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent></Card>
      ) : pendientes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-70" />
            <p className="text-sm font-medium text-foreground">No hay entregables pendientes este mes.</p>
            {proximoEntregable && (
              <p className="text-xs text-muted-foreground mt-2">
                El próximo entregable es <span className="font-mono font-bold text-primary">{proximoEntregable.act.actividad_codigo}</span>
                {" — "}{proximoEntregable.act.actividad_descripcion?.slice(0, 60)}... en <span className="font-semibold">{formatYM(proximoEntregable.month)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {pendientes.length} actividad{pendientes.length > 1 ? "es" : ""} pendiente{pendientes.length > 1 ? "s" : ""} de reporte
          </p>

          {pendientes.map((act) => {
            const reported = reportsByActivity.get(act.actividad_codigo) || new Set<string>();
            const ejecutado = avanceByActivity.get(act.actividad_codigo) || 0;
            const estado = calcEstado(act.meses_programados || [], currentYM, reported, ejecutado, act.meta_total || 0);
            const cfg = ESTADO_CONFIG[estado];
            const isExpanded = expandedAct === act.id;
            const form = getForm(act.id);
            const isSaving = savingId === act.id;
            const isRezago = estado === "con_rezago";

            return (
              <Card key={act.id} className={cn("transition-shadow", isExpanded && "ring-1 ring-primary/30")}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedAct(isExpanded ? null : act.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 px-2 shrink-0">
                    {act.actividad_codigo}
                  </Badge>
                  <span className="text-sm text-foreground truncate flex-1">{act.actividad_descripcion}</span>
                  <Badge className={cn("text-[10px] gap-1 border-0 shrink-0", cfg.bgColor, cfg.color)}>
                    {isRezago ? "✗ Con rezago" : "● Entregable este mes"}
                  </Badge>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Read-only context */}
                    <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                      <div><span className="text-muted-foreground">Meta total:</span> <span className="font-semibold">{act.meta_total} {act.unidad_medida}</span></div>
                      <div><span className="text-muted-foreground">Ejecutado hasta hoy:</span> <span className="font-semibold">{ejecutado} de {act.meta_total}</span></div>
                      <div><span className="text-muted-foreground">Mes del reporte:</span> <Badge variant="default" className="text-xs ml-1">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</Badge></div>
                    </div>

                    {/* Avance numérico */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Avance este mes (cantidad) *</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number" min={0} step={1}
                          value={form.avance}
                          onChange={(e) => updateForm(act.id, "avance", e.target.value)}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">{act.unidad_medida} completadas este mes</span>
                      </div>
                    </div>

                    {/* Resumen RI */}
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Resumen del Resultado Intermedio ({act.resultado_intermedio_codigo}) *
                      </Label>
                      <Textarea
                        placeholder="Describe brevemente el estado general del resultado al que pertenece esta actividad..."
                        value={form.resumenRI || riResumenes[act.resultado_intermedio_codigo] || ""}
                        onChange={(e) => {
                          updateForm(act.id, "resumenRI", e.target.value);
                          setRiResumenes((prev) => ({ ...prev, [act.resultado_intermedio_codigo]: e.target.value }));
                        }}
                        className="mt-1" rows={3}
                      />
                    </div>

                    {/* Avance logrado */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Avance logrado en esta actividad *</Label>
                      <Textarea
                        placeholder="Describe las acciones realizadas este mes..."
                        value={form.avanceLogrado}
                        onChange={(e) => updateForm(act.id, "avanceLogrado", e.target.value)}
                        className="mt-1" rows={3}
                      />
                    </div>

                    {/* Limitaciones */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Limitaciones encontradas</Label>
                      <Textarea
                        placeholder="¿Qué dificultades se presentaron?"
                        value={form.limitaciones}
                        onChange={(e) => updateForm(act.id, "limitaciones", e.target.value)}
                        className="mt-1" rows={2}
                      />
                    </div>

                    {/* Próximos pasos */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Próximos pasos</Label>
                      <Textarea
                        placeholder="¿Qué se hará el próximo mes?"
                        value={form.proximosPasos}
                        onChange={(e) => updateForm(act.id, "proximosPasos", e.target.value)}
                        className="mt-1" rows={2}
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleSave(act, true)} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Guardar borrador
                      </Button>
                      <Button size="sm" onClick={() => handleSave(act, false)} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        {isRezago ? "Registrar rezago" : "Enviar reporte"}
                      </Button>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic">
                      Este formulario no incluye campos financieros. El avance financiero se registra en Avance del Proyecto al cierre del trimestre.
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}