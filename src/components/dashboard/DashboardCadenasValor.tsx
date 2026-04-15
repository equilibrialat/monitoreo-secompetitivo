import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { useDashboardActividades } from "@/hooks/useDashboardActividades";
import { Header, MecanismoBadge, fmt, DashboardSkeleton, ClickableKpiCard } from "./DashboardEntidad";
import { DetailPanel } from "./DetailPanel";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { AlertTriangle, ArrowRight, Calendar, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function semaforoEmoji(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴";
}

function cruceLabel(e: DashboardEntidad) {
  const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
  if (desfase < 15) return { label: "✓", color: "text-emerald-600" };
  if (desfase < 30) return { label: "⚠", color: "text-yellow-600" };
  return { label: "✗", color: "text-destructive" };
}

function entitySemaforo(e: DashboardEntidad): "verde" | "amarillo" | "rojo" {
  const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
  if (desfase > 30 || e.meses_sin_reporte.length >= 2) return "rojo";
  if (desfase > 15 || e.meses_sin_reporte.length > 0) return "amarillo";
  return "verde";
}

export default function DashboardCadenasValor() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const { data: actividades } = useDashboardActividades();
  const navigate = useNavigate();
  const { setEntidadId, setRole } = useRole();
  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);

  // Latest reports per entity
  const { data: ultimosReportes } = useQuery({
    queryKey: ["ultimos-reportes-mecb"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("entidad_id, anio, mes")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false });
      const map = new Map<string, string>();
      for (const r of data || []) {
        if (!map.has(r.entidad_id)) {
          map.set(r.entidad_id, `${MONTH_SHORT[r.mes - 1]}-${String(r.anio).slice(2)}`);
        }
      }
      return map;
    },
  });

  const mecB = useMemo(() => (allEntidades || []).filter(e => e.mecanismo === "B" && e.has_data), [allEntidades]);

  // Alertas de rezago: actividades con gasto sin avance técnico o viceversa
  const alertasRezago = useMemo(() => {
    if (!actividades) return [];
    const mecBCodes = new Set(mecB.map(e => e.codigo));
    return actividades.filter(a => {
      if (!mecBCodes.has(a.entidad_codigo)) return false;
      return a.semaforo_global === "rojo";
    }).slice(0, 10);
  }, [actividades, mecB]);

  // Entregas del mes
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const { data: entregasMes } = useQuery({
    queryKey: ["entregas-mes-mecb", currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("entidad_id")
        .eq("anio", currentYear)
        .eq("mes", currentMonth);
      return new Set((data || []).map((r: any) => r.entidad_id));
    },
  });

  const handleNavigateEntity = (entidadId: string) => {
    setRole("entidad_mec_b");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <Header title="Dashboard Cadenas de Valor" subtitle="Iván — Coordinador Mecanismo B" />

      {/* BLOQUE 1 — Mis proyectos */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Mis proyectos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Entidad</TableHead>
                  <TableHead className="text-xs text-right">Téc. %</TableHead>
                  <TableHead className="text-xs text-right">Fin. %</TableHead>
                  <TableHead className="text-xs text-center">Cruce</TableHead>
                  <TableHead className="text-xs">Último</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mecB.map(e => {
                  const cruce = cruceLabel(e);
                  const sem = entitySemaforo(e);
                  const ultimo = ultimosReportes?.get(e.entidad_id) || "—";
                  return (
                    <TableRow key={e.entidad_id}>
                      <TableCell className="text-xs font-medium cursor-pointer hover:underline text-primary"
                        onClick={() => handleNavigateEntity(e.entidad_id)}>
                        {e.nombre_corto}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono cursor-pointer hover:underline"
                        onClick={() => setPanel({ type: "tecnico", data: e })}>
                        {e.avance_operativo_promedio ?? 0}%
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono cursor-pointer hover:underline"
                        onClick={() => setPanel({ type: "financiero", data: e })}>
                        {e.pct_ejecucion_seco}%
                      </TableCell>
                      <TableCell className={`text-center cursor-pointer hover:underline ${cruce.color}`}
                        onClick={() => setPanel({ type: "cruce", data: e })}>
                        {cruce.label}
                      </TableCell>
                      <TableCell className="text-xs cursor-pointer hover:underline text-muted-foreground"
                        onClick={() => setPanel({ type: "ultimo-reporte", data: e })}>
                        {ultimo}
                      </TableCell>
                      <TableCell className="text-center cursor-pointer"
                        onClick={() => setPanel({ type: "estado-actividades", data: e })}>
                        {semaforoEmoji(sem)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 3 — Alertas de rezago */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" /> Alertas de rezago ({alertasRezago.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasRezago.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin alertas de rezago ✓</p>
          ) : (
            <div className="space-y-2">
              {alertasRezago.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 border rounded cursor-pointer hover:bg-muted/40"
                  onClick={() => setPanel({ type: "actividad-detalle", data: a })}>
                  <span className="text-destructive mt-0.5">🔴</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{a.entidad_nombre} — <span className="font-mono">{a.actividad_codigo}</span></p>
                    <p className="text-muted-foreground truncate">{a.actividad_descripcion}</p>
                    <p className="text-[10px] text-muted-foreground">Téc: {a.pct_tecnico}% · Fin: {a.pct_seco}%</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOQUE 4 — Entregas del mes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Entregas del mes — {MONTH_SHORT[currentMonth - 1]} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {mecB.map(e => {
              const entrego = entregasMes?.has(e.entidad_id);
              return (
                <div key={e.entidad_id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer"
                  onClick={() => setPanel({ type: "ultimo-reporte", data: e })}>
                  <span>{entrego ? "✅" : "⬜"}</span>
                  <span className={`flex-1 ${entrego ? "" : "text-muted-foreground"}`}>{e.nombre_corto}</span>
                  <span className="text-muted-foreground">{entrego ? "Reportado ✓" : "Pendiente ○"}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Panels */}
      <DetailPanel open={panel?.type === "tecnico"} onClose={() => setPanel(null)}
        title={`Avance técnico — ${panel?.data?.nombre_corto || ""}`}>
        <EntityTechPanel ent={panel?.data} actividades={actividades?.filter(a => a.entidad_codigo === panel?.data?.codigo) || []} />
      </DetailPanel>

      <DetailPanel open={panel?.type === "financiero"} onClose={() => setPanel(null)}
        title={`Ejecución financiera — ${panel?.data?.nombre_corto || ""}`}>
        <EntityFinPanel ent={panel?.data} actividades={actividades?.filter(a => a.entidad_codigo === panel?.data?.codigo) || []} />
      </DetailPanel>

      <DetailPanel open={panel?.type === "cruce"} onClose={() => setPanel(null)}
        title={`Cruce técnico-financiero — ${panel?.data?.nombre_corto || ""}`}>
        <EntityCrucePanel actividades={actividades?.filter(a => a.entidad_codigo === panel?.data?.codigo) || []} />
      </DetailPanel>

      <DetailPanel open={panel?.type === "estado-actividades"} onClose={() => setPanel(null)}
        title={`Actividades — ${panel?.data?.nombre_corto || ""}`}>
        <EntityActividadesPanel actividades={actividades?.filter(a => a.entidad_codigo === panel?.data?.codigo) || []} />
      </DetailPanel>

      <DetailPanel open={panel?.type === "ultimo-reporte"} onClose={() => setPanel(null)}
        title={`Último reporte — ${panel?.data?.nombre_corto || ""}`}>
        <p className="text-xs text-muted-foreground">
          Último reporte: {ultimosReportes?.get(panel?.data?.entidad_id) || "Sin reportes"}
        </p>
        <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => { setPanel(null); handleNavigateEntity(panel?.data?.entidad_id); }}>
          Ver planificación completa →
        </Button>
      </DetailPanel>

      <DetailPanel open={panel?.type === "actividad-detalle"} onClose={() => setPanel(null)}
        title={`${panel?.data?.actividad_codigo || ""} — Detalle`}>
        {panel?.data && <ActividadDetallePanel act={panel.data} />}
      </DetailPanel>
    </div>
  );
}

function EntityTechPanel({ ent, actividades }: { ent: any; actividades: any[] }) {
  if (!ent) return null;
  return (
    <div className="space-y-2">
      {actividades.map(a => (
        <div key={a.actividad_codigo} className="border rounded p-2 text-xs">
          <p className="font-medium"><span className="font-mono text-primary">{a.actividad_codigo}</span> — {a.actividad_descripcion}</p>
          <p className="text-muted-foreground mt-1">Avance: {a.avance_tecnico} de {a.meta_total} {a.unidad_medida} ({a.pct_tecnico}%)</p>
        </div>
      ))}
      {actividades.length === 0 && <p className="text-xs text-muted-foreground">Sin actividades registradas</p>}
    </div>
  );
}

function EntityFinPanel({ ent, actividades }: { ent: any; actividades: any[] }) {
  if (!ent) return null;
  return (
    <div className="space-y-2">
      {actividades.filter(a => a.presupuesto_seco_usd > 0 || a.ejecutado_seco > 0).map(a => (
        <div key={a.actividad_codigo} className="border rounded p-2 text-xs">
          <p className="font-medium"><span className="font-mono text-primary">{a.actividad_codigo}</span></p>
          <p className="text-muted-foreground">SECO: USD {fmt(a.ejecutado_seco)} / {fmt(a.presupuesto_seco_usd)} ({a.pct_seco}%)</p>
          {a.presupuesto_contrapartida_usd > 0 && (
            <p className="text-muted-foreground">Contrap: USD {fmt(a.ejecutado_contrapartida)} / {fmt(a.presupuesto_contrapartida_usd)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function EntityCrucePanel({ actividades }: { actividades: any[] }) {
  return (
    <div className="space-y-2">
      {actividades.map(a => {
        const icon = a.semaforo_global === "verde" ? "✓" : a.semaforo_global === "amarillo" ? "⚠" : "✗";
        const color = a.semaforo_global === "verde" ? "text-emerald-600" : a.semaforo_global === "amarillo" ? "text-yellow-600" : "text-destructive";
        return (
          <div key={a.actividad_codigo} className="border rounded p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${color}`}>{icon}</span>
              <span className="font-mono text-primary">{a.actividad_codigo}</span>
              <span className="flex-1 truncate text-muted-foreground">{a.actividad_descripcion}</span>
            </div>
            <p className="text-muted-foreground mt-1">Téc: {a.pct_tecnico}% · Fin: {a.pct_seco}% · Δ {Math.abs(a.pct_tecnico - a.pct_seco)}pp</p>
          </div>
        );
      })}
    </div>
  );
}

function EntityActividadesPanel({ actividades }: { actividades: any[] }) {
  return (
    <div className="space-y-2">
      {actividades.map(a => (
        <div key={a.actividad_codigo} className="flex items-center gap-2 text-xs border rounded p-2">
          <span>{semaforoEmoji(a.semaforo_global)}</span>
          <span className="font-mono text-primary">{a.actividad_codigo}</span>
          <span className="flex-1 truncate">{a.actividad_descripcion}</span>
          <span className="text-muted-foreground shrink-0">{a.pct_tecnico}% téc · {a.pct_seco}% fin</span>
        </div>
      ))}
    </div>
  );
}

function ActividadDetallePanel({ act }: { act: any }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{act.actividad_descripcion}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="border rounded p-2 text-xs">
          <p className="text-muted-foreground">Avance técnico</p>
          <p className="font-bold">{act.avance_tecnico} / {act.meta_total} {act.unidad_medida}</p>
          <p className="text-muted-foreground">{act.pct_tecnico}%</p>
        </div>
        <div className="border rounded p-2 text-xs">
          <p className="text-muted-foreground">Ejecutado SECO</p>
          <p className="font-bold">USD {fmt(act.ejecutado_seco)}</p>
          <p className="text-muted-foreground">{act.pct_seco}% del presupuesto</p>
        </div>
      </div>
      <div className="text-xs">
        <p className="font-medium">Semáforo temporal: {semaforoEmoji(act.semaforo_temporal)} {act.semaforo_temporal}</p>
        <p className="font-medium">Semáforo global: {semaforoEmoji(act.semaforo_global)} {act.semaforo_global}</p>
      </div>
      {act.ultimo_reporte_mes && <p className="text-xs text-muted-foreground">Último reporte: {act.ultimo_reporte_mes}</p>}
    </div>
  );
}
