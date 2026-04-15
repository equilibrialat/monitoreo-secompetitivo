import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
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
import { AlertTriangle, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function semaforoEmoji(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴";
}

function getCurrentTrimestreLabel() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const t = m < 3 ? "T1" : m < 6 ? "T2" : m < 9 ? "T3" : "T4";
  return { t, y, label: `${t} ${y}` };
}

function getCurrentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Hardcoded region mapping for coordinadores (from spec)
const COORDINATOR_REGIONS: Record<string, string> = {
  // In production this would come from the user's profile
};

export default function DashboardCoordinadorRegional() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const { data: actividades, isLoading: actLoading } = useDashboardActividades();
  const navigate = useNavigate();
  const { setEntidadId, setRole, entidades: entidadOptions, filters, setFilters } = useRole();

  // For demo: determine region from filters or default to showing all non-Nacional
  // In production, this would be derived from the logged-in coordinator's profile
  const [selectedRegion] = useState<string | null>(null);

  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);
  const [entidadFilter, setEntidadFilter] = useState<"todas" | "rezago" | "sin_reporte">("todas");

  // Observation state
  const [obsText, setObsText] = useState("");
  const [obsSaving, setObsSaving] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentYM = getCurrentYM();
  const trimInfo = getCurrentTrimestreLabel();

  // Filter entidades to only region-relevant ones (non-Nacional for coordinador)
  const regionEntidades = useMemo(() => {
    if (!allEntidades) return [];
    return allEntidades.filter(e => {
      if (!e.has_data) return false;
      if (e.mecanismo !== "B") return false;
      if (e.region === "Nacional" || !e.region) return false;
      if (selectedRegion && e.region !== selectedRegion) return false;
      return true;
    });
  }, [allEntidades, selectedRegion]);

  // Detect region from entidades shown
  const regionLabel = useMemo(() => {
    const regions = [...new Set(regionEntidades.map(e => e.region))];
    return regions.length === 1 ? regions[0] : regions.join(" · ");
  }, [regionEntidades]);

  // Actividades filtered by region entities
  const regionEntCodes = useMemo(() => new Set(regionEntidades.map(e => e.codigo)), [regionEntidades]);

  const regionActividades = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter(a => regionEntCodes.has(a.entidad_codigo));
  }, [actividades, regionEntCodes]);

  // Monthly reports for current month
  const { data: reportesMes } = useQuery({
    queryKey: ["coord-reportes-mes", currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("entidad_id, actividad_id, avance_valor, anio, mes, estado_registro")
        .eq("anio", currentYear)
        .eq("mes", currentMonth);
      return data || [];
    },
  });

  // Observaciones
  const { data: observaciones, refetch: refetchObs } = useQuery({
    queryKey: ["observaciones-coordinador"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("observaciones_coordinador")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Comprobantes for trimestre
  const { data: comprobantesTrim } = useQuery({
    queryKey: ["coord-comprobantes-trim", trimInfo.label],
    queryFn: async () => {
      const tKey = `${trimInfo.t}-${trimInfo.y}`;
      // comprobantes trimestre field format varies; try both
      const { data } = await (supabase as any).from("comprobantes")
        .select("entidad_codigo, actividad_codigo, monto_usd, trimestre");
      return (data || []).filter((c: any) =>
        c.trimestre === `T${trimInfo.t}-${trimInfo.y}` || c.trimestre === `${trimInfo.t}-${trimInfo.y}`
      );
    },
  });

  // KPI calculations
  const totalEntidades = regionEntidades.length;

  const actividadesActivasEsteMes = useMemo(() => {
    return regionActividades.filter(a => a.meses_programados.includes(currentYM));
  }, [regionActividades, currentYM]);

  const conRezago = useMemo(() => {
    return regionActividades.filter(a => a.semaforo_global === "rojo");
  }, [regionActividades]);

  const sinReporte = useMemo(() => {
    const entidadesConReporte = new Set((reportesMes || []).map((r: any) => r.entidad_id));
    return regionEntidades.filter(e => !entidadesConReporte.has(e.entidad_id));
  }, [regionEntidades, reportesMes]);

  // Per-entidad table data
  const entidadTableData = useMemo(() => {
    return regionEntidades.map(ent => {
      const entActs = regionActividades.filter(a => a.entidad_codigo === ent.codigo);
      const activasEsteMes = entActs.filter(a => a.meses_programados.includes(currentYM));

      // Reportes este mes para esta entidad
      const reportesEnt = (reportesMes || []).filter((r: any) => r.entidad_id === ent.entidad_id);
      const reportados = reportesEnt.length;
      const programados = activasEsteMes.length;

      // Financial: comprobantes del trimestre
      const compTrim = (comprobantesTrim || []).filter((c: any) => c.entidad_codigo === ent.codigo);
      const ejecutadoTrim = compTrim.reduce((s: number, c: any) => s + Number(c.monto_usd || 0), 0);
      const pptoTotal = entActs.reduce((s, a) => s + a.presupuesto_seco_usd, 0);
      const ejecutadoTotal = entActs.reduce((s, a) => s + a.ejecutado_seco, 0);
      const pctFin = pptoTotal > 0 ? Math.round((ejecutadoTotal / pptoTotal) * 100) : 0;

      // Semáforo general: worst of all activities
      let estadoGeneral: "verde" | "amarillo" | "rojo" = "verde";
      for (const a of entActs) {
        if (a.semaforo_global === "rojo") { estadoGeneral = "rojo"; break; }
        if (a.semaforo_global === "amarillo") estadoGeneral = "amarillo";
      }

      return {
        ...ent,
        activasEsteMes: programados,
        reportados,
        programados,
        pctFin,
        estadoGeneral,
        entActs,
      };
    });
  }, [regionEntidades, regionActividades, reportesMes, comprobantesTrim, currentYM]);

  // Filtered table
  const filteredEntidades = useMemo(() => {
    return entidadTableData.filter(e => {
      if (entidadFilter === "rezago") return e.estadoGeneral === "rojo";
      if (entidadFilter === "sin_reporte") return e.reportados === 0;
      return true;
    });
  }, [entidadTableData, entidadFilter]);

  // Critical activities
  const actividadesCriticas = useMemo(() => {
    return regionActividades
      .filter(a => a.semaforo_global === "rojo" || a.semaforo_global === "amarillo")
      .sort((a, b) => {
        if (a.semaforo_global === "rojo" && b.semaforo_global !== "rojo") return -1;
        if (b.semaforo_global === "rojo" && a.semaforo_global !== "rojo") return 1;
        return 0;
      });
  }, [regionActividades]);

  const handleNavigateEntity = (entidadId: string) => {
    const ent = regionEntidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  const handleSaveObs = async (entCodigo: string, actCodigo: string) => {
    if (!obsText.trim()) { toast.error("Escribe una observación"); return; }
    setObsSaving(true);
    const mesKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    await (supabase as any).from("observaciones_coordinador").insert({
      entidad_codigo: entCodigo,
      actividad_codigo: actCodigo,
      mes: mesKey,
      texto: obsText,
      autor: "Coordinador Regional",
    });
    toast.success("Observación registrada");
    setObsText("");
    setObsSaving(false);
    refetchObs();
  };

  if (isLoading || actLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <Header
        title={`Coordinación Regional — ${regionLabel || "Todas las regiones"}`}
        subtitle={`${totalEntidades} entidades bajo supervisión · Mes actual: ${MONTH_SHORT[currentMonth - 1]} ${currentYear}`}
      />

      {/* BLOQUE 1 — KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ClickableKpiCard
          label="Entidades en mi región"
          value={String(totalEntidades)}
          onClick={() => setPanel({ type: "lista-entidades" })}
        />
        <ClickableKpiCard
          label="Activ. activas este mes"
          value={String(actividadesActivasEsteMes.length)}
          onClick={() => setPanel({ type: "activas-mes" })}
        />
        <ClickableKpiCard
          label="Con rezago"
          value={String(conRezago.length)}
          sub={conRezago.length > 0 ? "Requieren atención" : "Todo al día"}
          onClick={() => setPanel({ type: "con-rezago" })}
          className={conRezago.length > 0 ? "border-red-200 dark:border-red-800" : ""}
        />
        <ClickableKpiCard
          label="Sin reporte este mes"
          value={String(sinReporte.length)}
          sub={sinReporte.length > 0 ? sinReporte.map(e => e.nombre_corto).join(", ") : "Todas reportaron"}
          onClick={() => setPanel({ type: "sin-reporte" })}
          className={sinReporte.length > 0 ? "border-yellow-200 dark:border-yellow-800" : ""}
        />
      </div>

      {/* BLOQUE 2 — Mis entidades */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">Mis entidades</CardTitle>
            <div className="flex gap-1.5">
              {(["todas", "rezago", "sin_reporte"] as const).map(f => (
                <Button key={f} variant={entidadFilter === f ? "default" : "outline"} size="sm" className="text-xs h-7"
                  onClick={() => setEntidadFilter(f)}>
                  {f === "todas" ? "Todas" : f === "rezago" ? "Solo con rezago 🔴" : "Sin reporte este mes"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Entidad</TableHead>
                  <TableHead className="text-xs text-center">Activ. activas</TableHead>
                  <TableHead className="text-xs text-center">Téc. este mes</TableHead>
                  <TableHead className="text-xs text-center">Fin. {trimInfo.label}</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntidades.map(e => (
                  <TableRow key={e.entidad_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setPanel({ type: "arbol-entidad", data: e })}
                    >
                      {e.nombre_corto}
                    </TableCell>
                    <TableCell
                      className="text-xs text-center cursor-pointer hover:underline"
                      onClick={() => setPanel({ type: "activas-entidad", data: e })}
                    >
                      {e.activasEsteMes}
                    </TableCell>
                    <TableCell
                      className="text-xs text-center cursor-pointer hover:underline"
                      onClick={() => setPanel({ type: "tec-entidad", data: e })}
                    >
                      {e.programados > 0 ? (
                        <span className={e.reportados < e.programados ? "text-red-600 font-semibold" : "text-green-600"}>
                          {e.reportados}/{e.programados} {e.reportados >= e.programados ? "✓" : "✗"}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell
                      className="text-xs text-center font-mono cursor-pointer hover:underline"
                      onClick={() => setPanel({ type: "fin-entidad", data: e })}
                    >
                      {e.pctFin}%
                    </TableCell>
                    <TableCell
                      className="text-center cursor-pointer"
                      onClick={() => setPanel({ type: "cruce-entidad", data: e })}
                    >
                      {semaforoEmoji(e.estadoGeneral)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEntidades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                      No hay entidades con este filtro
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 4 — Actividades críticas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Actividades críticas de mi región
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actividadesCriticas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Todas las actividades de tu región están al día. 🟢
            </p>
          ) : (
            <div className="space-y-2">
              {actividadesCriticas.slice(0, 10).map(a => (
                <div
                  key={`${a.entidad_codigo}-${a.actividad_codigo}`}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setPanel({ type: "actividad-detalle", data: a })}
                >
                  <span className="text-lg mt-0.5">{semaforoEmoji(a.semaforo_global)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {a.entidad_nombre} · <span className="font-mono">{a.actividad_codigo}</span> — {a.actividad_descripcion}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.semaforo_global === "rojo" && a.ejecutado_seco > 0 && a.avance_tecnico === 0
                        ? `Gasto sin avance técnico · USD ${fmt(a.ejecutado_seco)} ejecutados · 0 ${a.unidad_medida || "unidades"} reportadas`
                        : a.semaforo_global === "rojo" && a.avance_tecnico > 0 && a.ejecutado_seco === 0
                        ? `Avance técnico sin gasto registrado · ${a.avance_tecnico}/${a.meta_total} ${a.unidad_medida || ""}`
                        : `Téc: ${a.pct_tecnico}% · Fin: ${a.pct_seco}% · Variación: ${Math.abs(a.pct_tecnico - a.pct_seco)}pp`
                      }
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              ))}
              {actividadesCriticas.length > 10 && (
                <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setPanel({ type: "todas-criticas" })}>
                  Ver todas ({actividadesCriticas.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PANEL LATERAL */}
      <DetailPanel
        open={!!panel}
        onClose={() => { setPanel(null); setObsText(""); }}
        title={
          panel?.type === "lista-entidades" ? "Entidades de mi región"
          : panel?.type === "activas-mes" ? `Actividades activas — ${MONTH_SHORT[currentMonth - 1]} ${currentYear}`
          : panel?.type === "con-rezago" ? "Actividades con rezago"
          : panel?.type === "sin-reporte" ? "Entidades sin reporte este mes"
          : panel?.type === "arbol-entidad" ? `${panel.data?.nombre_corto} — Planificación`
          : panel?.type === "activas-entidad" ? `${panel.data?.nombre_corto} — Activas este mes`
          : panel?.type === "tec-entidad" ? `${panel.data?.nombre_corto} — Reportes técnicos`
          : panel?.type === "fin-entidad" ? `${panel.data?.nombre_corto} — Financiero ${trimInfo.label}`
          : panel?.type === "cruce-entidad" ? `${panel.data?.nombre_corto} — Análisis cruce`
          : panel?.type === "actividad-detalle" ? `${panel.data?.actividad_codigo} — ${panel.data?.entidad_nombre}`
          : panel?.type === "todas-criticas" ? "Todas las actividades críticas"
          : "Detalle"
        }
      >
        {/* List panels */}
        {panel?.type === "lista-entidades" && (
          <div className="space-y-2">
            {regionEntidades.map(e => (
              <div key={e.entidad_id} className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                onClick={() => handleNavigateEntity(e.entidad_id)}>
                <p className="text-sm font-medium">{e.nombre_corto}</p>
                <p className="text-xs text-muted-foreground">{e.region} · Mec {e.mecanismo} · {e.total_actividades} actividades</p>
              </div>
            ))}
          </div>
        )}

        {panel?.type === "activas-mes" && (
          <div className="space-y-2">
            {actividadesActivasEsteMes.map(a => (
              <div key={`${a.entidad_codigo}-${a.actividad_codigo}`}
                className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                <p className="text-sm font-medium">{a.entidad_nombre} · <span className="font-mono">{a.actividad_codigo}</span></p>
                <p className="text-xs text-muted-foreground">{a.actividad_descripcion}</p>
                <p className="text-xs mt-1">Avance: {a.avance_tecnico}/{a.meta_total} {a.unidad_medida}</p>
              </div>
            ))}
            {actividadesActivasEsteMes.length === 0 && <p className="text-sm text-muted-foreground">Sin actividades activas este mes</p>}
          </div>
        )}

        {panel?.type === "con-rezago" && (
          <div className="space-y-2">
            {conRezago.map(a => (
              <div key={`${a.entidad_codigo}-${a.actividad_codigo}`}
                className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                <p className="text-sm font-medium">{semaforoEmoji(a.semaforo_global)} {a.entidad_nombre} · {a.actividad_codigo}</p>
                <p className="text-xs text-muted-foreground">{a.actividad_descripcion}</p>
              </div>
            ))}
          </div>
        )}

        {panel?.type === "sin-reporte" && (
          <div className="space-y-2">
            {sinReporte.map(e => (
              <div key={e.entidad_id} className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                onClick={() => handleNavigateEntity(e.entidad_id)}>
                <p className="text-sm font-medium">{e.nombre_corto}</p>
                <p className="text-xs text-muted-foreground">{e.total_actividades} actividades · Sin reporte en {MONTH_SHORT[currentMonth - 1]}</p>
              </div>
            ))}
          </div>
        )}

        {/* Árbol de entidad — read-only planificación */}
        {panel?.type === "arbol-entidad" && panel.data && (
          <EntidadArbolPanel
            entidad={panel.data}
            actividades={regionActividades.filter(a => a.entidad_codigo === panel.data.codigo)}
            observaciones={observaciones || []}
            obsText={obsText}
            setObsText={setObsText}
            onSaveObs={handleSaveObs}
            obsSaving={obsSaving}
            onNavigate={() => handleNavigateEntity(panel.data.entidad_id)}
          />
        )}

        {/* Entidad sub-panels */}
        {panel?.type === "activas-entidad" && panel.data && (
          <div className="space-y-2">
            {regionActividades
              .filter(a => a.entidad_codigo === panel.data.codigo && a.meses_programados.includes(currentYM))
              .map(a => (
                <div key={a.actividad_codigo} className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                  <p className="text-sm font-medium"><span className="font-mono">{a.actividad_codigo}</span> — {a.actividad_descripcion}</p>
                  <p className="text-xs text-muted-foreground">Avance: {a.avance_tecnico}/{a.meta_total} · SECO: {a.pct_seco}%</p>
                </div>
              ))}
          </div>
        )}

        {panel?.type === "tec-entidad" && panel.data && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Actividades con entregable este mes y su estado de reporte</p>
            {regionActividades
              .filter(a => a.entidad_codigo === panel.data.codigo && a.meses_programados.includes(currentYM))
              .map(a => (
                <div key={a.actividad_codigo} className="p-3 rounded-lg border">
                  <p className="text-sm font-medium"><span className="font-mono">{a.actividad_codigo}</span> — {a.actividad_descripcion}</p>
                  <p className="text-xs mt-1">
                    {a.avance_tecnico > 0
                      ? <Badge variant="default" className="text-[10px]">Reportado ✓ — {a.avance_tecnico} {a.unidad_medida}</Badge>
                      : <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-700">Pendiente ○</Badge>
                    }
                  </p>
                </div>
              ))}
          </div>
        )}

        {panel?.type === "fin-entidad" && panel.data && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Comprobantes del trimestre {trimInfo.label} para {panel.data.nombre_corto}</p>
            {(() => {
              const comps = (comprobantesTrim || []).filter((c: any) => c.entidad_codigo === panel.data.codigo);
              if (comps.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Sin comprobantes este trimestre</p>;
              return comps.map((c: any, i: number) => (
                <div key={i} className="p-2 rounded border text-xs">
                  <p className="font-mono">{c.actividad_codigo} — USD {fmt(Number(c.monto_usd || 0))}</p>
                </div>
              ));
            })()}
          </div>
        )}

        {panel?.type === "cruce-entidad" && panel.data && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Análisis técnico-financiero de {panel.data.nombre_corto}</p>
            {regionActividades
              .filter(a => a.entidad_codigo === panel.data.codigo)
              .map(a => (
                <div key={a.actividad_codigo} className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span>{semaforoEmoji(a.semaforo_global)}</span>
                    <p className="text-sm font-medium font-mono">{a.actividad_codigo}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Téc: {a.pct_tecnico}% · Fin SECO: {a.pct_seco}% · Δ {Math.abs(a.pct_tecnico - a.pct_seco)}pp</p>
                </div>
              ))}
          </div>
        )}

        {/* Actividad detalle */}
        {panel?.type === "actividad-detalle" && panel.data && (
          <ActividadDetallePanel
            actividad={panel.data}
            observaciones={(observaciones || []).filter((o: any) => o.actividad_codigo === panel.data.actividad_codigo && o.entidad_codigo === panel.data.entidad_codigo)}
            obsText={obsText}
            setObsText={setObsText}
            onSaveObs={() => handleSaveObs(panel.data.entidad_codigo, panel.data.actividad_codigo)}
            obsSaving={obsSaving}
          />
        )}

        {/* Todas las críticas */}
        {panel?.type === "todas-criticas" && (
          <div className="space-y-2">
            {actividadesCriticas.map(a => (
              <div key={`${a.entidad_codigo}-${a.actividad_codigo}`}
                className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                <p className="text-sm font-medium">{semaforoEmoji(a.semaforo_global)} {a.entidad_nombre} · {a.actividad_codigo}</p>
                <p className="text-xs text-muted-foreground">{a.actividad_descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}

/* ─── Sub-components ─── */

function EntidadArbolPanel({
  entidad, actividades, observaciones, obsText, setObsText, onSaveObs, obsSaving, onNavigate,
}: {
  entidad: any;
  actividades: ActividadSemaforo[];
  observaciones: any[];
  obsText: string;
  setObsText: (t: string) => void;
  onSaveObs: (entCodigo: string, actCodigo: string) => void;
  obsSaving: boolean;
  onNavigate: () => void;
}) {
  const [selectedAct, setSelectedAct] = useState<ActividadSemaforo | null>(null);

  // Group by RI
  const byRI = useMemo(() => {
    const map = new Map<string, ActividadSemaforo[]>();
    for (const a of actividades) {
      const ri = a.resultado_intermedio_codigo || "Sin RI";
      const arr = map.get(ri) || [];
      arr.push(a);
      map.set(ri, arr);
    }
    return map;
  }, [actividades]);

  if (selectedAct) {
    const actObs = observaciones.filter((o: any) => o.actividad_codigo === selectedAct.actividad_codigo && o.entidad_codigo === selectedAct.entidad_codigo);
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedAct(null)}>
          ← Volver al árbol
        </Button>
        <ActividadDetallePanel
          actividad={selectedAct}
          observaciones={actObs}
          obsText={obsText}
          setObsText={setObsText}
          onSaveObs={() => onSaveObs(selectedAct.entidad_codigo, selectedAct.actividad_codigo)}
          obsSaving={obsSaving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Vista solo lectura del árbol de planificación</p>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={onNavigate}>
          Abrir Mi Planificación →
        </Button>
      </div>

      {[...byRI.entries()].map(([ri, acts]) => (
        <div key={ri} className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground px-1">📊 {ri} — {acts[0]?.resultado_intermedio || ""}</p>
          {acts.map(a => (
            <div
              key={a.actividad_codigo}
              className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 ml-3"
              onClick={() => setSelectedAct(a)}
            >
              <span className="text-sm">{semaforoEmoji(a.semaforo_global)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  <span className="font-mono">{a.actividad_codigo}</span> — {a.actividad_descripcion}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {a.avance_tecnico}/{a.meta_total} {a.unidad_medida} · SECO: USD {fmt(a.ejecutado_seco)}
                </p>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ActividadDetallePanel({
  actividad, observaciones, obsText, setObsText, onSaveObs, obsSaving,
}: {
  actividad: ActividadSemaforo;
  observaciones: any[];
  obsText: string;
  setObsText: (t: string) => void;
  onSaveObs: () => void;
  obsSaving: boolean;
}) {
  const { data: reportes } = useQuery({
    queryKey: ["coord-reportes-actividad", actividad.entidad_codigo, actividad.actividad_codigo],
    queryFn: async () => {
      // Find entidad ID and actividad ID
      const { data: ent } = await (supabase as any).from("entidades").select("id").eq("codigo", actividad.entidad_codigo).single();
      if (!ent) return [];
      const { data: act } = await (supabase as any).from("actividades").select("id").eq("codigo", actividad.actividad_codigo).eq("entidad_id", ent.id).single();
      if (!act) return [];
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("anio, mes, avance_valor, avance_unidad_medida, descripcion_avance, limitaciones, prioridades_proximo_mes, estado_registro")
        .eq("entidad_id", ent.id)
        .eq("actividad_id", act.id)
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { data: comprobantes } = useQuery({
    queryKey: ["coord-comprobantes-act", actividad.entidad_codigo, actividad.actividad_codigo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("comprobantes")
        .select("*")
        .eq("entidad_codigo", actividad.entidad_codigo)
        .eq("actividad_codigo", actividad.actividad_codigo)
        .order("fecha_documento", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      {/* Activity header */}
      <div>
        <p className="text-sm font-semibold">{semaforoEmoji(actividad.semaforo_global)} {actividad.actividad_codigo} — {actividad.actividad_descripcion}</p>
        <p className="text-xs text-muted-foreground mt-1">{actividad.entidad_nombre} · {actividad.resultado_intermedio_codigo}</p>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded border">
          <p className="text-[10px] text-muted-foreground">Avance técnico</p>
          <p className="text-sm font-bold">{actividad.avance_tecnico}/{actividad.meta_total} <span className="text-xs font-normal text-muted-foreground">{actividad.unidad_medida}</span></p>
          <p className="text-xs font-mono">{actividad.pct_tecnico}%</p>
        </div>
        <div className="p-2 rounded border">
          <p className="text-[10px] text-muted-foreground">Ejecutado SECO</p>
          <p className="text-sm font-bold">USD {fmt(actividad.ejecutado_seco)}</p>
          <p className="text-xs font-mono">{actividad.pct_seco}% de USD {fmt(actividad.presupuesto_seco_usd)}</p>
        </div>
      </div>

      {/* Reportes mensuales */}
      <div>
        <p className="text-xs font-semibold mb-2">Historial de reportes mensuales</p>
        {(!reportes || reportes.length === 0) ? (
          <p className="text-xs text-muted-foreground">Sin reportes registrados</p>
        ) : (
          <div className="space-y-2">
            {reportes.map((r: any, i: number) => (
              <div key={i} className="p-2 rounded border text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{MONTH_SHORT[(r.mes || 1) - 1]} {r.anio}</Badge>
                  <span className="text-muted-foreground">{r.avance_valor || 0} {r.avance_unidad_medida || ""}</span>
                </div>
                {r.descripcion_avance && <p><span className="font-medium">Avance:</span> {r.descripcion_avance}</p>}
                {r.limitaciones && <p><span className="font-medium">Limitaciones:</span> {r.limitaciones}</p>}
                {r.prioridades_proximo_mes && <p><span className="font-medium">Próximos pasos:</span> {r.prioridades_proximo_mes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprobantes */}
      <div>
        <p className="text-xs font-semibold mb-2">Comprobantes vinculados</p>
        {(!comprobantes || comprobantes.length === 0) ? (
          <p className="text-xs text-muted-foreground">Sin comprobantes registrados</p>
        ) : (
          <div className="space-y-1">
            {comprobantes.map((c: any) => (
              <div key={c.id} className="p-2 rounded border text-xs flex justify-between">
                <span>{c.concepto} · {c.fecha_documento}</span>
                <span className="font-mono">USD {fmt(Number(c.monto_usd || 0))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observaciones del coordinador */}
      <div>
        <p className="text-xs font-semibold mb-2">Observaciones del coordinador</p>
        {observaciones.length > 0 && (
          <div className="space-y-1 mb-2">
            {observaciones.map((o: any) => (
              <div key={o.id} className="p-2 rounded border bg-muted/30 text-xs">
                <p>{o.texto}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{o.mes} · {o.autor}</p>
              </div>
            ))}
          </div>
        )}
        <Textarea
          value={obsText}
          onChange={(e) => setObsText(e.target.value)}
          placeholder="Escribir observación sobre esta actividad..."
          className="text-xs min-h-[60px]"
        />
        <Button size="sm" className="mt-2 text-xs h-7" onClick={onSaveObs} disabled={obsSaving || !obsText.trim()}>
          <Save className="h-3 w-3 mr-1" /> Guardar observación
        </Button>
      </div>
    </div>
  );
}
