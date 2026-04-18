import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { useDashboardActividades, type ActividadSemaforo } from "@/hooks/useDashboardActividades";
import { Header, ClickableKpiCard, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { DetailPanel } from "./DetailPanel";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, ArrowRight, Save, ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import NarrativeBlock from "./NarrativeBlock";
import SuccinctTreePanel from "./SuccinctTreePanel";
import ArbolIndicadoresActividades from "./ArbolIndicadoresActividades";
import BandejaReasignaciones from "@/components/planificacion/BandejaReasignaciones";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function semaforoEmoji(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴";
}

export default function DashboardCoordinadorRegional() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const { data: actividades, isLoading: actLoading } = useDashboardActividades();
  const navigate = useNavigate();
  const { setEntidadId, setRole } = useRole();

  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);
  const [obsText, setObsText] = useState("");
  const [obsSaving, setObsSaving] = useState(false);
  const [indicadoresOpen, setIndicadoresOpen] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentYM = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // Filter to Mec B non-Nacional entities
  const regionEntidades = useMemo(() => {
    if (!allEntidades) return [];
    return allEntidades.filter(e => e.has_data && e.mecanismo === "B" && e.region !== "Nacional" && e.region);
  }, [allEntidades]);

  const regionLabel = useMemo(() => {
    const regions = [...new Set(regionEntidades.map(e => e.region))];
    return regions.length === 1 ? regions[0] : regions.join(" · ");
  }, [regionEntidades]);

  const regionEntCodes = useMemo(() => new Set(regionEntidades.map(e => e.codigo)), [regionEntidades]);

  const regionActividades = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter(a => regionEntCodes.has(a.entidad_codigo));
  }, [actividades, regionEntCodes]);

  const { data: reportesMes } = useQuery({
    queryKey: ["coord-reportes-mes", currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("entidad_id, actividad_id, avance_valor, anio, mes")
        .eq("anio", currentYear).eq("mes", currentMonth);
      return data || [];
    },
  });

  const { data: observaciones, refetch: refetchObs } = useQuery({
    queryKey: ["observaciones-coordinador"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("observaciones_coordinador")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  // Per entity summary
  const entidadData = useMemo(() => {
    return regionEntidades.map(ent => {
      const entActs = regionActividades.filter(a => a.entidad_codigo === ent.codigo);
      const activasEsteMes = entActs.filter(a => a.meses_programados.includes(currentYM));
      const reportesEnt = (reportesMes || []).filter((r: any) => r.entidad_id === ent.entidad_id);

      let estadoGeneral: "verde" | "amarillo" | "rojo" = "verde";
      for (const a of entActs) {
        if (a.semaforo_global === "rojo") { estadoGeneral = "rojo"; break; }
        if (a.semaforo_global === "amarillo") estadoGeneral = "amarillo";
      }

      return { ...ent, activasEsteMes: activasEsteMes.length, reportados: reportesEnt.length, estadoGeneral, entActs };
    });
  }, [regionEntidades, regionActividades, reportesMes, currentYM]);

  const conRezago = useMemo(() => regionActividades.filter(a => a.semaforo_global === "rojo"), [regionActividades]);

  const handleNavigateEntity = (entidadId: string) => {
    const ent = regionEntidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole("entidad_mec_b");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  const handleSaveObs = async (entCodigo: string, actCodigo: string) => {
    if (!obsText.trim()) { toast.error("Escribe una observación"); return; }
    setObsSaving(true);
    await (supabase as any).from("observaciones_coordinador").insert({
      entidad_codigo: entCodigo, actividad_codigo: actCodigo,
      mes: currentYM, texto: obsText, autor: "Coordinador Regional",
    });
    toast.success("Observación registrada");
    setObsText(""); setObsSaving(false); refetchObs();
  };

  if (isLoading || actLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <Header
        title={`Coordinación Regional — ${regionLabel || "Todas las regiones"}`}
        subtitle={`${regionEntidades.length} entidades · ${MONTH_SHORT[currentMonth - 1]} ${currentYear}`}
      />

      {/* BLOQUE A — Resumen IA de la región */}
      <NarrativeBlock
        tipo="resumen_entidad"
        params={{ entidad_codigo: regionEntidades[0]?.codigo, region: regionLabel }}
      />

      {/* BLOQUE B — Tarjetas de entidades */}
      <div className="space-y-2">
        {entidadData.map(e => (
          <Card key={e.entidad_id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setPanel({ type: "arbol-entidad", data: e })}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{semaforoEmoji(e.estadoGeneral)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{e.nombre_corto}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Téc: {e.avance_operativo_promedio || 0}% · Fin: {e.pct_ejecucion_seco}%
                    {e.meses_sin_reporte.length > 0 && ` · Sin reporte: ${e.meses_sin_reporte.join(", ")}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ClickableKpiCard label="Entidades" value={String(regionEntidades.length)} onClick={() => {}} />
        <ClickableKpiCard label="Con rezago" value={String(conRezago.length)}
          sub={conRezago.length > 0 ? "Requieren atención" : "Todo al día"} onClick={() => {}}
          className={conRezago.length > 0 ? "border-red-200 dark:border-red-800" : ""} />
        <ClickableKpiCard label="Activ. este mes" value={String(entidadData.reduce((s, e) => s + e.activasEsteMes, 0))} onClick={() => {}} />
        <ClickableKpiCard label="Reportes" value={String(entidadData.reduce((s, e) => s + e.reportados, 0))} onClick={() => {}} />
      </div>

      {/* Actividades críticas */}
      {conRezago.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Actividades críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conRezago.slice(0, 8).map(a => (
                <div key={`${a.entidad_codigo}-${a.actividad_codigo}`}
                  className="flex items-start gap-3 p-2 rounded border cursor-pointer hover:bg-muted/40"
                  onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                  <span className="text-lg mt-0.5">🔴</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.entidad_nombre} · {a.actividad_codigo}</p>
                    <p className="text-xs text-muted-foreground">{a.actividad_descripcion}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BLOQUE — Reasignaciones presupuestales pendientes (Paso 2) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Reasignaciones presupuestales pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BandejaReasignaciones mode="coordinador" />
        </CardContent>
      </Card>

      {/* BLOQUE — Ver por indicadores (colapsable) */}
      <Card>
        <CardHeader className="pb-0 cursor-pointer" onClick={() => setIndicadoresOpen(!indicadoresOpen)}>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${indicadoresOpen ? "" : "-rotate-90"}`} />
            Ver por indicadores y resultados intermedios
          </CardTitle>
        </CardHeader>
        {indicadoresOpen && (
          <CardContent className="pt-3">
            <ArbolIndicadoresActividades
              filtros={{
                trimestre: `${currentYear}-T${Math.ceil(currentMonth / 3)}`,
                mecanismo: "B",
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* Panel lateral — Árbol sucinto */}
      <DetailPanel
        open={panel?.type === "arbol-entidad"}
        onClose={() => { setPanel(null); setObsText(""); }}
        title={panel?.data?.nombre_corto || "Entidad"}>
        {panel?.data && (
          <div className="space-y-4">
            <NarrativeBlock tipo="resumen_entidad" params={{ entidad_codigo: panel.data.codigo }} />
            <SuccinctTreePanel entidad={panel.data} actividades={panel.data.entActs || []} trimestre={`${currentYear}-T${Math.ceil(currentMonth / 3)}`} obsText={obsText} setObsText={setObsText} onSaveObs={handleSaveObs} obsSaving={obsSaving} />
            <div className="border-t pt-3">
              <Textarea
                placeholder="Escribir observación sobre esta entidad..."
                value={obsText}
                onChange={e => setObsText(e.target.value)}
                className="text-xs min-h-[60px]"
              />
              <Button size="sm" className="mt-2 text-xs" disabled={obsSaving}
                onClick={() => handleSaveObs(panel.data.codigo, "general")}>
                <Save className="h-3 w-3 mr-1" /> Guardar observación
              </Button>
            </div>
          </div>
        )}
      </DetailPanel>

      <DetailPanel open={panel?.type === "actividad-detalle"} onClose={() => setPanel(null)}
        title={`${panel?.data?.actividad_codigo || ""} — Detalle`}>
        {panel?.data && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{panel.data.actividad_descripcion}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="border rounded p-2"><p className="text-muted-foreground">Técnico</p><p className="font-bold">{panel.data.pct_tecnico}%</p></div>
              <div className="border rounded p-2"><p className="text-muted-foreground">Financiero</p><p className="font-bold">{panel.data.pct_seco}%</p></div>
            </div>
            <NarrativeBlock tipo="alerta_actividad" params={{ actividad_codigo: panel.data.actividad_codigo, entidad_codigo: panel.data.entidad_codigo }} />
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
