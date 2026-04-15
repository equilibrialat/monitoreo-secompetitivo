import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { Header, fmt, DashboardSkeleton, ClickableKpiCard } from "./DashboardEntidad";
import { DetailPanel } from "./DetailPanel";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { AlertTriangle, ArrowRight, Shuffle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CascadingFilters, { buildDefaultFilterState, type CascadingFilterState } from "./CascadingFilters";
import NarrativeBlock from "./NarrativeBlock";
import ArbolIndicadoresActividades from "./ArbolIndicadoresActividades";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SEMAFORO_COLORS = { verde: "bg-emerald-500", amarillo: "bg-yellow-500", rojo: "bg-red-500", gris: "bg-muted-foreground/40" };

function getEntitySemaforo(e: DashboardEntidad): "verde" | "amarillo" | "rojo" | "gris" {
  if (e.total_actividades === 0 && !e.has_data) return "gris";
  if (e.sin_planificacion) {
    if (e.pct_ejecucion_seco > 80) return "verde";
    if (e.pct_ejecucion_seco > 30) return "amarillo";
    if (e.pct_ejecucion_seco > 0) return "rojo";
    return "gris";
  }
  const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
  if (e.meses_sin_reporte.length >= 2 || desfase > 30) return "rojo";
  if (desfase > 15 || e.meses_sin_reporte.length > 0) return "amarillo";
  return "verde";
}

interface AlertaCritica {
  severity: "rojo" | "amarillo";
  entidad: string;
  entidadId: string;
  descripcion: string;
}

function buildAlertasCriticas(entidades: DashboardEntidad[]): AlertaCritica[] {
  const alertas: AlertaCritica[] = [];
  for (const e of entidades) {
    if (e.meses_sin_reporte.length >= 2) alertas.push({ severity: "rojo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Sin reporte de ${e.meses_sin_reporte.join(", ")}` });
    if (e.sobregiros_seco > 0) alertas.push({ severity: "rojo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Sobreejecución en ${e.sobregiros_seco} actividad(es)` });
    const desfase = e.sin_planificacion ? 0 : Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
    if (desfase > 20) alertas.push({ severity: desfase > 30 ? "rojo" : "amarillo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Desfase técnico-financiero ${desfase}pp` });
    if (e.meses_sin_reporte.length === 1) alertas.push({ severity: "amarillo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Sin reporte de ${e.meses_sin_reporte[0]}` });
  }
  alertas.sort((a, b) => (a.severity === "rojo" ? 0 : 1) - (b.severity === "rojo" ? 0 : 1));
  return alertas;
}

export default function DashboardDireccionNew() {
  const [filters, setFilters] = useState<CascadingFilterState>(
    buildDefaultFilterState({ mecanismo: "B" })
  );

  const { data: allEntidades, isLoading } = useDashboardData(filters.period);
  const navigate = useNavigate();
  const { setEntidadId, setRole } = useRole();
  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);

  const { data: reasignaciones } = useQuery({
    queryKey: ["reasignaciones-pendientes"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("reasignaciones").select("id, entidad_id, motivo, fecha_solicitud, estado, entidades!inner(nombre_corto)").eq("estado", "solicitado");
      return data || [];
    },
  });

  const filterEntidades = useMemo(() =>
    (allEntidades || []).filter(e => e.has_data && e.mecanismo === "B").map(e => ({
      codigo: e.codigo, nombre_corto: e.nombre_corto, mecanismo: e.mecanismo, region: e.region,
    })),
  [allEntidades]);

  const hasDataForTrimestre = (allEntidades || []).some(e => e.has_data);

  const entidades = useMemo(() => (allEntidades || []).filter(e => {
    if (!e.has_data) return false;
    if (filters.mecanismo && e.mecanismo !== filters.mecanismo) return false;
    if (filters.region && e.region !== filters.region) return false;
    if (filters.entidad && e.codigo !== filters.entidad) return false;
    return true;
  }), [allEntidades, filters]);

  const alertas = useMemo(() => buildAlertasCriticas(entidades), [entidades]);
  const totals = useMemo(() => {
    const presupTotal = entidades.reduce((s, e) => s + e.presupuesto_seco_total, 0);
    const ejecutTotal = entidades.reduce((s, e) => s + e.ejecutado_seco_total, 0);
    const pct = presupTotal > 0 ? ((ejecutTotal / presupTotal) * 100).toFixed(1) : "0";
    return { presupTotal, ejecutTotal, saldo: presupTotal - ejecutTotal, pct };
  }, [entidades]);

  const handleViewEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setPanel({ type: "entidad", data: ent });
  };

  const handleNavigateEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  const hasReasignaciones = reasignaciones && reasignaciones.length > 0;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <Header title="Dashboard Ejecutivo" subtitle="Paula — Dirección del Programa" />

      <CascadingFilters
        value={filters}
        onChange={(v) => setFilters({ ...v, mecanismo: "B" })}
        entidades={filterEntidades}
        hideMecanismo fixedMecanismo="B"
      />

      {!hasDataForTrimestre && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-400">
          <Info className="h-3.5 w-3.5 shrink-0" />
          No hay datos para el período seleccionado. Pruebe con "3 meses" o "6 meses".
        </div>
      )}

      {/* BLOQUE A — Briefing ejecutivo */}
      <NarrativeBlock
        tipo="briefing_director"
        params={{ trimestre: filters.trimestre }}
      />

      {/* BLOQUE B — Acciones del programa (solo si hay) */}
      {hasReasignaciones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shuffle className="h-4 w-4" /> Acciones pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reasignaciones.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-xs p-2 border rounded cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate("/reasignaciones")}>
                  <Badge variant="outline" className="text-[10px] shrink-0">Reasignación</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{r.entidades?.nombre_corto}</p>
                    <p className="text-muted-foreground truncate">{r.motivo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BLOQUE C — Mapa de estado */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Mapa de estado</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {entidades.map(e => {
              const sem = getEntitySemaforo(e);
              return (
                <div key={e.entidad_id}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => handleViewEntity(e.entidad_id)}>
                  <span className={`h-4 w-4 rounded-full shrink-0 mt-0.5 ${SEMAFORO_COLORS[sem]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{e.nombre_corto}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Téc: {e.avance_operativo_promedio || 0}% · Fin: {e.pct_ejecucion_seco}%
                    </p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Al día</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Atención</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Crítico</span>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" /> Alertas ({alertas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertas.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs rounded border p-2 cursor-pointer hover:bg-muted/40"
                  onClick={() => handleViewEntity(a.entidadId)}>
                  <span className={`h-3 w-3 rounded-full shrink-0 mt-0.5 ${a.severity === "rojo" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{a.entidad}</p>
                    <p className="text-muted-foreground">{a.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs financieros */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ClickableKpiCard label="Ejecutado total" value={`USD ${fmt(totals.ejecutTotal)}`} onClick={() => setPanel({ type: "financiero" })} />
        <ClickableKpiCard label="Del convenio" value={`${totals.pct}%`} sub={`USD ${fmt(totals.presupTotal)} total`} onClick={() => setPanel({ type: "financiero" })} />
        <ClickableKpiCard label="Saldo" value={`USD ${fmt(totals.saldo)}`} onClick={() => setPanel({ type: "financiero" })}
          className={totals.saldo < 0 ? "border-destructive/30" : ""} />
      </div>

      {/* Panel lateral entidad */}
      <DetailPanel open={panel?.type === "entidad"} onClose={() => setPanel(null)} title={panel?.data?.nombre_corto || "Entidad"}>
        {panel?.data && (
          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-3">
              <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
              <TabsTrigger value="indicadores" className="text-xs">Por indicadores</TabsTrigger>
            </TabsList>
            <TabsContent value="resumen">
              <div className="space-y-4">
                <NarrativeBlock tipo="resumen_entidad" params={{ entidad_codigo: panel.data.codigo }} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded p-2"><p className="text-[10px] text-muted-foreground">Actividades</p><p className="text-lg font-bold">{panel.data.actividades_completadas}/{panel.data.total_actividades}</p></div>
                  <div className="border rounded p-2"><p className="text-[10px] text-muted-foreground">Ejecución</p><p className="text-lg font-bold">{panel.data.pct_ejecucion_seco}%</p></div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setPanel(null); handleNavigateEntity(panel.data.entidad_id); }}>
                  Ver planificación completa →
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="indicadores">
              <ArbolIndicadoresActividades
                filtros={{
                  trimestre: filters.trimestre,
                  entidad_codigo: panel.data.codigo,
                  mecanismo: "B",
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </DetailPanel>

      <DetailPanel open={panel?.type === "financiero"} onClose={() => setPanel(null)} title="Desglose financiero">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Entidad</TableHead>
            <TableHead className="text-xs text-right">Presupuesto</TableHead>
            <TableHead className="text-xs text-right">Ejecutado</TableHead>
            <TableHead className="text-xs text-right">%</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entidades.map(e => (
              <TableRow key={e.entidad_id} className="cursor-pointer hover:bg-muted/40" onClick={() => handleViewEntity(e.entidad_id)}>
                <TableCell className="text-xs font-medium">{e.nombre_corto}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(e.presupuesto_seco_total)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(e.ejecutado_seco_total)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{e.pct_ejecucion_seco}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DetailPanel>
    </div>
  );
}
