import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { useDashboardActividades, type ActividadSemaforo } from "@/hooks/useDashboardActividades";
import { Header, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { DetailPanel } from "./DetailPanel";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bot, Copy, Check, FileText, Loader2, Settings, MessageSquare, Plus } from "lucide-react";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function semaforoEmoji(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴";
}

function temporalLabel(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "al día" : sem === "amarillo" ? "atención" : "atraso";
}

export default function DashboardMonitoreoNew() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const { data: actividades, isLoading: actLoading } = useDashboardActividades();
  const navigate = useNavigate();
  const { setEntidadId, setRole, entidades: entidadOptions } = useRole();

  const mecFilter = "B" as const;
  const [semaforoFilter, setSemaforoFilter] = useState<"todos" | "rojo" | "amarillo" | "verde">("todos");
  const [entidadFilter, setEntidadFilter] = useState<string>("todas");
  const [riFilter, setRiFilter] = useState<string>("todos");
  const [soloActivas, setSoloActivas] = useState(false);
  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);

  // AI synthesis state
  const [aiEntidad, setAiEntidad] = useState<string>("");
  const [aiMes, setAiMes] = useState<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Observaciones state
  const [obsEntidad, setObsEntidad] = useState("");
  const [obsTexto, setObsTexto] = useState("");
  const [showNewObs, setShowNewObs] = useState(false);

  const entidades = useMemo(() => (allEntidades || []).filter(e => e.has_data), [allEntidades]);

  // Entregas panel data
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: reportesMes } = useQuery({
    queryKey: ["reportes-entregas", currentYear],
    queryFn: async () => {
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("entidad_id, anio, mes, estado_registro")
        .eq("anio", currentYear);
      return data || [];
    },
  });

  // Observaciones
  const { data: observaciones, refetch: refetchObs } = useQuery({
    queryKey: ["observaciones-monitoreo"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("historial_cambios")
        .select("*")
        .eq("tabla", "observacion_monitoreo")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Filtered actividades for semáforo table
  const currentYM = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const filteredActividades = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter(a => {
      if (mecFilter === "A" && a.mecanismo !== "A") return false;
      if (mecFilter === "B" && a.mecanismo !== "B") return false;
      if (semaforoFilter !== "todos" && a.semaforo_global !== semaforoFilter) return false;
      if (entidadFilter !== "todas" && a.entidad_codigo !== entidadFilter) return false;
      if (riFilter !== "todos" && a.resultado_intermedio_codigo !== riFilter) return false;
      if (soloActivas && !a.meses_programados.includes(currentYM)) return false;
      return true;
    });
  }, [actividades, mecFilter, semaforoFilter, entidadFilter, riFilter, soloActivas, currentYM]);

  const uniqueEntidades = useMemo(() => [...new Set(actividades?.map(a => a.entidad_codigo) || [])].sort(), [actividades]);
  const uniqueRIs = useMemo(() => [...new Set(actividades?.map(a => a.resultado_intermedio_codigo).filter(Boolean) || [])].sort(), [actividades]);

  // Entrega status per entity
  const entregaStatus = useMemo(() => {
    const map = new Map<string, { reportado: boolean; fecha: string | null }>();
    for (const e of entidades) {
      const reports = (reportesMes || []).filter((r: any) => r.entidad_id === e.entidad_id && r.mes === currentMonth);
      map.set(e.entidad_id, { reportado: reports.length > 0, fecha: reports.length > 0 ? `${MONTH_SHORT[currentMonth - 1]} ${currentYear}` : null });
    }
    return map;
  }, [entidades, reportesMes, currentMonth, currentYear]);

  // Filtered entidades for entregas panel
  const entregaEntidades = useMemo(() => entidades.filter(e => {
    if (mecFilter === "A" && e.mecanismo !== "A") return false;
    if (mecFilter === "B" && e.mecanismo !== "B") return false;
    return true;
  }), [entidades, mecFilter]);

  const handleAISynthesis = async () => {
    if (!aiEntidad) { toast.error("Selecciona una entidad"); return; }
    setAiLoading(true);
    setAiResult(null);

    const [anio, mes] = aiMes.split("-").map(Number);
    const { data: reports } = await (supabase as any).from("registros_mensuales")
      .select("actividad_id, descripcion_avance, limitaciones, compromisos, avance_valor, avance_unidad_medida, actividades!inner(codigo, nombre)")
      .eq("entidad_id", aiEntidad)
      .eq("anio", anio)
      .eq("mes", mes);

    if (!reports || reports.length === 0) {
      setAiLoading(false);
      toast.error("No hay reportes mensuales enviados para generar una síntesis.");
      return;
    }

    const entName = entidadOptions.find(e => e.id === aiEntidad)?.nombre_corto || "Entidad";
    const mesLabel = `${MONTH_SHORT[mes - 1]} ${anio}`;

    const reportData = reports.map((r: any) => ({
      actividad: `${r.actividades?.codigo} — ${r.actividades?.nombre}`,
      avance: `${r.avance_valor || 0} ${r.avance_unidad_medida || ""}`,
      descripcion: r.descripcion_avance,
      limitaciones: r.limitaciones,
      compromisos: r.compromisos,
    }));

    const { resultado, error } = await invokeAnalysis("narrativa", {
      entidad: { nombre: entName },
      instrucciones: `Eres el sistema de monitoreo del programa SeCompetitivo. A partir de los reportes técnicos mensuales de la entidad ${entName} para ${mesLabel}, genera una síntesis por Resultado Intermedio que: (1) describa el avance real a nivel de productos, no de actividades individuales, (2) identifique riesgos o retrasos, (3) liste los próximos compromisos del siguiente mes. Tono: técnico pero conciso. Máximo 3 párrafos por RI.`,
      reportes_mensuales: reportData,
      mes: mesLabel,
    });

    setAiLoading(false);
    if (error) toast.error(error);
    else setAiResult(resultado ?? null);
  };

  const handleCopy = () => {
    if (aiResult) {
      navigator.clipboard.writeText(aiResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveObs = async () => {
    if (!obsEntidad || !obsTexto.trim()) { toast.error("Completa todos los campos"); return; }
    await (supabase as any).from("historial_cambios").insert({
      tabla: "observacion_monitoreo",
      registro_id: obsEntidad,
      accion: "observacion",
      observaciones: obsTexto,
      nombre_usuario: "Fabiola (Monitoreo)",
    });
    toast.success("Observación registrada");
    setObsTexto("");
    setShowNewObs(false);
    refetchObs();
  };

  const handleNavigateEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  if (isLoading || actLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Header title="Dashboard de Monitoreo" subtitle="Fabiola — Vista consolidada del programa" />
        <Button variant="outline" size="sm" onClick={() => navigate("/administracion")} className="shrink-0">
          <Settings className="h-4 w-4 mr-1" /> Gestión de Trimestres
        </Button>
      </div>

      {/* Mecanismo fijo B para MVP */}

      {/* BLOQUE 1 — Panel de entregas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Panel de entregas — {MONTH_SHORT[currentMonth - 1]} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Entidad</TableHead>
                  <TableHead className="text-xs">Mecanismo</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregaEntidades.map(e => {
                  const status = entregaStatus.get(e.entidad_id);
                  return (
                    <TableRow key={e.entidad_id}>
                      <TableCell className="text-xs font-medium cursor-pointer hover:underline text-primary"
                        onClick={() => handleNavigateEntity(e.entidad_id)}>
                        {e.nombre_corto}
                      </TableCell>
                      <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">Mec {e.mecanismo}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status?.reportado ? "default" : "outline"}
                          className={`text-[10px] cursor-pointer ${!status?.reportado ? "border-yellow-500 text-yellow-700" : ""}`}
                          onClick={() => setPanel({ type: "entrega-detalle", data: e })}>
                          {status?.reportado ? "Reportado ✓" : "Pendiente ○"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{status?.fecha || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 2 — Semáforo de actividades */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vista de actividades por semáforo</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button variant={semaforoFilter === "rojo" ? "destructive" : "outline"} size="sm" className="text-xs h-7"
              onClick={() => setSemaforoFilter(semaforoFilter === "rojo" ? "todos" : "rojo")}>Solo 🔴</Button>
            <Button variant={soloActivas ? "default" : "outline"} size="sm" className="text-xs h-7"
              onClick={() => setSoloActivas(!soloActivas)}>Solo activas este mes</Button>
            <Select value={entidadFilter} onValueChange={setEntidadFilter}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue placeholder="Entidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {uniqueEntidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={riFilter} onValueChange={setRiFilter}>
              <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="RI" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {uniqueRIs.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cód.</TableHead>
                  <TableHead className="text-xs">Entidad</TableHead>
                  <TableHead className="text-xs">Actividad</TableHead>
                  <TableHead className="text-xs text-right">Téc.%</TableHead>
                  <TableHead className="text-xs text-center">Temporal</TableHead>
                  <TableHead className="text-xs text-right">SECO %</TableHead>
                  <TableHead className="text-xs text-right">Contrap.</TableHead>
                  <TableHead className="text-xs text-center">🚦</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActividades.slice(0, 50).map(a => (
                  <TableRow key={`${a.entidad_codigo}-${a.actividad_codigo}`}>
                    <TableCell className="text-xs font-mono cursor-pointer hover:underline text-primary"
                      onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                      {a.actividad_codigo}
                    </TableCell>
                    <TableCell className="text-xs cursor-pointer hover:underline"
                      onClick={() => { const ent = entidades.find(e => e.codigo === a.entidad_codigo); if (ent) handleNavigateEntity(ent.entidad_id); }}>
                      {a.entidad_nombre}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {a.solo_reporte_trimestral && <Badge variant="outline" className="text-[9px] mr-1 bg-muted">RT</Badge>}
                      {a.actividad_descripcion}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono cursor-pointer hover:underline"
                      onClick={() => setPanel({ type: "tech-detalle", data: a })}>
                      {a.solo_reporte_trimestral ? "—" : `${a.pct_tecnico}%`}
                    </TableCell>
                    <TableCell className="text-center cursor-pointer hover:opacity-80"
                      onClick={() => setPanel({ type: "temporal-detalle", data: a })}>
                      <span className="text-xs">{semaforoEmoji(a.semaforo_temporal)} <span className="text-[10px] text-muted-foreground">{temporalLabel(a.semaforo_temporal)}</span></span>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono cursor-pointer hover:underline"
                      onClick={() => setPanel({ type: "seco-detalle", data: a })}>
                      {a.pct_seco}%
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono cursor-pointer hover:underline"
                      onClick={() => setPanel({ type: "contrap-detalle", data: a })}>
                      {a.pct_contrapartida}%
                    </TableCell>
                    <TableCell className="text-center cursor-pointer"
                      onClick={() => setPanel({ type: "cruce-detalle", data: a })}>
                      {semaforoEmoji(a.semaforo_global)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredActividades.length > 50 && (
            <p className="text-xs text-muted-foreground mt-2">Mostrando 50 de {filteredActividades.length} actividades</p>
          )}
        </CardContent>
      </Card>

      {/* BLOQUE 3 — Generador de síntesis IA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4" /> Generador de síntesis mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <Select value={aiEntidad} onValueChange={setAiEntidad}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Entidad" /></SelectTrigger>
              <SelectContent>
                {entidadOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={aiMes} onValueChange={setAiMes}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
                  return <SelectItem key={m} value={m}>{MONTH_SHORT[i]} {currentYear}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Button size="sm" className="text-xs h-8" onClick={handleAISynthesis} disabled={aiLoading || !aiEntidad}>
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
              Generar síntesis
            </Button>
          </div>

          {aiResult && (
            <div className="border rounded p-3 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">SÍNTESIS — {entidadOptions.find(e => e.id === aiEntidad)?.nombre_corto} — {MONTH_SHORT[parseInt(aiMes.split("-")[1]) - 1]} {aiMes.split("-")[0]}</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <div className="prose prose-xs max-w-none text-xs">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOQUE 4 — Bandeja de observaciones */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Bandeja de observaciones
            </CardTitle>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowNewObs(!showNewObs)}>
              <Plus className="h-3 w-3 mr-1" /> Nueva observación
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewObs && (
            <div className="border rounded p-3 mb-3 space-y-2">
              <Select value={obsEntidad} onValueChange={setObsEntidad}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
                <SelectContent>
                  {entidadOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Escribir observación..." value={obsTexto} onChange={e => setObsTexto(e.target.value)} className="text-xs min-h-[60px]" />
              <div className="flex gap-2">
                <Button size="sm" className="text-xs h-7" onClick={handleSaveObs}>Guardar</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowNewObs(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {(!observaciones || observaciones.length === 0) ? (
            <p className="text-xs text-muted-foreground">Sin observaciones registradas.</p>
          ) : (
            <div className="space-y-2">
              {observaciones.map((o: any) => (
                <div key={o.id} className="flex items-start gap-2 text-xs p-2 border rounded cursor-pointer hover:bg-muted/40"
                  onClick={() => { const ent = entidades.find(e => e.entidad_id === o.registro_id); if (ent) handleNavigateEntity(ent.entidad_id); }}>
                  <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground">{o.observaciones}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{o.nombre_usuario} · {new Date(o.created_at).toLocaleDateString("es-PE")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail panels */}
      <DetailPanel open={panel?.type === "actividad-detalle"} onClose={() => setPanel(null)}
        title={`${panel?.data?.actividad_codigo || ""} — Detalle`}>
        {panel?.data && <ActividadFullPanel act={panel.data} />}
      </DetailPanel>

      <DetailPanel open={panel?.type === "tech-detalle"} onClose={() => setPanel(null)}
        title={`Reportes técnicos — ${panel?.data?.actividad_codigo || ""}`}>
        {panel?.data && <TechReportsPanel act={panel.data} />}
      </DetailPanel>

      <DetailPanel open={panel?.type === "temporal-detalle"} onClose={() => setPanel(null)}
        title={`Cronograma — ${panel?.data?.actividad_codigo || ""}`}>
        {panel?.data && <TemporalPanel act={panel.data} />}
      </DetailPanel>

      <DetailPanel open={panel?.type === "seco-detalle" || panel?.type === "contrap-detalle"} onClose={() => setPanel(null)}
        title={`Comprobantes ${panel?.type === "seco-detalle" ? "SECO" : "Contrapartida"} — ${panel?.data?.actividad_codigo || ""}`}>
        {panel?.data && <ComprobantesPanel act={panel.data} fuente={panel?.type === "seco-detalle" ? "seco" : "contrapartida"} />}
      </DetailPanel>

      <DetailPanel open={panel?.type === "cruce-detalle"} onClose={() => setPanel(null)}
        title={`Cruce técnico-financiero — ${panel?.data?.actividad_codigo || ""}`}>
        {panel?.data && <CrucePanel act={panel.data} />}
      </DetailPanel>

      <DetailPanel open={panel?.type === "entrega-detalle"} onClose={() => setPanel(null)}
        title={`Reporte — ${panel?.data?.nombre_corto || ""}`}>
        {panel?.data && (
          <div className="space-y-3">
            <p className="text-xs">Estado del reporte de {MONTH_SHORT[currentMonth - 1]} {currentYear}: {entregaStatus.get(panel.data.entidad_id)?.reportado ? "Reportado ✓" : "Pendiente ○"}</p>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setPanel(null); handleNavigateEntity(panel.data.entidad_id); }}>
              Ver entidad →
            </Button>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}

function ActividadFullPanel({ act }: { act: ActividadSemaforo }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{act.actividad_descripcion}</p>
      <Badge variant="outline" className="text-[10px]">{act.entidad_nombre} · {act.resultado_intermedio_codigo}</Badge>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border rounded p-2"><p className="text-muted-foreground">Técnico</p><p className="font-bold">{act.avance_tecnico}/{act.meta_total} {act.unidad_medida} ({act.pct_tecnico}%)</p></div>
        <div className="border rounded p-2"><p className="text-muted-foreground">SECO</p><p className="font-bold">USD {fmt(act.ejecutado_seco)} ({act.pct_seco}%)</p></div>
        <div className="border rounded p-2"><p className="text-muted-foreground">Temporal</p><p className="font-bold">{semaforoEmoji(act.semaforo_temporal)} {temporalLabel(act.semaforo_temporal)}</p></div>
        <div className="border rounded p-2"><p className="text-muted-foreground">Global</p><p className="font-bold">{semaforoEmoji(act.semaforo_global)} {act.semaforo_global}</p></div>
      </div>
      {act.ultimo_reporte_mes && <p className="text-xs text-muted-foreground">Último reporte: {act.ultimo_reporte_mes}</p>}
    </div>
  );
}

function TechReportsPanel({ act }: { act: ActividadSemaforo }) {
  return (
    <div className="space-y-2 text-xs">
      <p>Avance acumulado: <strong>{act.avance_tecnico} de {act.meta_total} {act.unidad_medida}</strong></p>
      <p>Porcentaje: <strong>{act.pct_tecnico}%</strong></p>
      {act.ultimo_reporte_mes && <p>Último reporte en: {act.ultimo_reporte_mes}</p>}
      <p className="text-muted-foreground mt-2">Los reportes técnicos detallados están en la sección de Registrar Avance de la entidad.</p>
    </div>
  );
}

function TemporalPanel({ act }: { act: ActividadSemaforo }) {
  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  return (
    <div className="space-y-2 text-xs">
      <p className="font-medium">Meses programados:</p>
      <div className="flex flex-wrap gap-1">
        {act.meses_programados.sort().map(m => {
          const isPast = m < currentYM;
          const isCurrent = m === currentYM;
          return (
            <Badge key={m} variant={isCurrent ? "default" : "outline"}
              className={`text-[10px] ${isPast ? "bg-muted text-muted-foreground" : ""}`}>
              {m}
            </Badge>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-2">
        {act.meses_programados.filter(m => m <= currentYM).length} de {act.meses_programados.length} meses transcurridos
      </p>
    </div>
  );
}

function ComprobantesPanel({ act, fuente }: { act: ActividadSemaforo; fuente: string }) {
  const monto = fuente === "seco" ? act.ejecutado_seco : act.ejecutado_contrapartida;
  const ppto = fuente === "seco" ? act.presupuesto_seco_usd : act.presupuesto_contrapartida_usd;
  const pct = fuente === "seco" ? act.pct_seco : act.pct_contrapartida;
  return (
    <div className="space-y-2 text-xs">
      <p>Presupuesto: <strong>USD {fmt(ppto)}</strong></p>
      <p>Ejecutado: <strong>USD {fmt(monto)}</strong></p>
      <p>Porcentaje: <strong>{pct}%</strong></p>
      <p className="text-muted-foreground mt-2">Los comprobantes detallados están en la sección de Contratos y Comprobantes.</p>
    </div>
  );
}

function CrucePanel({ act }: { act: ActividadSemaforo }) {
  const diff = Math.abs(act.pct_tecnico - act.pct_seco);
  let analysis = "";
  if (act.ejecutado_seco > 0 && act.avance_tecnico === 0) {
    analysis = "⚠ Gasto registrado sin avance técnico reportado. Requiere justificación.";
  } else if (act.avance_tecnico > 0 && act.ejecutado_seco === 0 && act.presupuesto_seco_usd > 0) {
    analysis = "◌ Avance técnico sin gasto registrado. Puede ser válido (actividades sin costo directo).";
  } else if (diff < 15) {
    analysis = "✓ Avance técnico y financiero alineados.";
  } else if (diff < 30) {
    analysis = "⚠ Diferencia moderada entre avance técnico y financiero.";
  } else {
    analysis = "✗ Diferencia significativa entre avance técnico y financiero. Requiere atención.";
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="border rounded p-2"><p className="text-muted-foreground">Técnico</p><p className="font-bold">{act.pct_tecnico}%</p></div>
        <div className="border rounded p-2"><p className="text-muted-foreground">Financiero</p><p className="font-bold">{act.pct_seco}%</p></div>
      </div>
      <p className="font-medium">Diferencia: {diff}pp</p>
      <div className={`border rounded p-2 ${act.semaforo_global === "verde" ? "border-emerald-300" : act.semaforo_global === "amarillo" ? "border-yellow-300" : "border-destructive/30"}`}>
        <p>{analysis}</p>
      </div>
    </div>
  );
}
