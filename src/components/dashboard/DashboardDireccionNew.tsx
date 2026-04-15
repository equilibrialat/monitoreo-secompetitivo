import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { Header, MecanismoBadge, fmt, DashboardSkeleton, ClickableKpiCard } from "./DashboardEntidad";
import { DetailPanel } from "./DetailPanel";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { AlertTriangle, ArrowRight, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/* ── Helpers ── */
const SEMAFORO_COLORS = { verde: "bg-emerald-500", amarillo: "bg-yellow-500", rojo: "bg-red-500", gris: "bg-muted-foreground/40" };

function getEntitySemaforo(e: DashboardEntidad): "verde" | "amarillo" | "rojo" | "gris" {
  if (e.total_actividades === 0) return "gris";
  const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
  if (e.meses_sin_reporte.length >= 2 || desfase > 30) return "rojo";
  if (desfase > 15 || e.meses_sin_reporte.length > 0) return "amarillo";
  return "verde";
}

interface AlertaCritica {
  severity: "rojo" | "amarillo";
  entidad: string;
  entidadId: string;
  actividad?: string;
  descripcion: string;
  detalle: string;
}

function buildAlertasCriticas(entidades: DashboardEntidad[]): AlertaCritica[] {
  const alertas: AlertaCritica[] = [];
  for (const e of entidades) {
    if (e.meses_sin_reporte.length >= 2) {
      alertas.push({ severity: "rojo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Sin reporte de ${e.meses_sin_reporte.join(", ")}`, detalle: "Sin reportar" });
    }
    if (e.sobregiros_seco > 0) {
      alertas.push({ severity: "rojo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Sobreejecución en ${e.sobregiros_seco} actividad(es)`, detalle: `USD ${fmt(e.ejecutado_seco_total)} vs ${fmt(e.presupuesto_seco_total)}` });
    }
    const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
    if (desfase > 20) {
      alertas.push({ severity: desfase > 30 ? "rojo" : "amarillo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Desfase técnico-financiero ${desfase}pp`, detalle: `Téc: ${e.avance_operativo_promedio || 0}% · Fin: ${e.pct_ejecucion_seco}%` });
    }
    if (e.meses_sin_reporte.length === 1) {
      alertas.push({ severity: "amarillo", entidad: e.nombre_corto, entidadId: e.entidad_id, descripcion: `Sin reporte de ${e.meses_sin_reporte[0]}`, detalle: "Pendiente" });
    }
  }
  alertas.sort((a, b) => (a.severity === "rojo" ? 0 : 1) - (b.severity === "rojo" ? 0 : 1));
  return alertas;
}

export default function DashboardDireccionNew() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const navigate = useNavigate();
  const { setEntidadId, setRole } = useRole();
  const [mecFilter, setMecFilter] = useState<"todos" | "A" | "B">("todos");
  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);
  const [showAllAlertas, setShowAllAlertas] = useState(false);

  // Reasignaciones pendientes
  const { data: reasignaciones } = useQuery({
    queryKey: ["reasignaciones-pendientes"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("reasignaciones").select("id, entidad_id, motivo, fecha_solicitud, estado, entidades!inner(nombre_corto)").eq("estado", "solicitado");
      return data || [];
    },
  });

  const entidades = useMemo(() => (allEntidades || []).filter(e => {
    if (e.total_actividades === 0) return false;
    if (mecFilter === "A") return e.mecanismo === "A";
    if (mecFilter === "B") return e.mecanismo === "B";
    return true;
  }), [allEntidades, mecFilter]);

  const alertas = useMemo(() => buildAlertasCriticas(entidades), [entidades]);
  const visibleAlertas = showAllAlertas ? alertas : alertas.slice(0, 8);

  const totals = useMemo(() => {
    const presupTotal = entidades.reduce((s, e) => s + e.presupuesto_seco_total, 0);
    const ejecutTotal = entidades.reduce((s, e) => s + e.ejecutado_seco_total, 0);
    const saldo = presupTotal - ejecutTotal;
    const pct = presupTotal > 0 ? ((ejecutTotal / presupTotal) * 100).toFixed(1) : "0";
    return { presupTotal, ejecutTotal, saldo, pct };
  }, [entidades]);

  const handleViewEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) {
      setPanel({
        type: "entidad",
        data: ent,
      });
    }
  };

  const handleNavigateEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <Header title="Dashboard Ejecutivo" subtitle="Paula — Dirección del Programa" />

      {/* FILTRO PRINCIPAL */}
      <div className="flex gap-2">
        {(["todos", "A", "B"] as const).map(f => (
          <Button key={f} variant={mecFilter === f ? "default" : "outline"} size="sm" className="text-xs h-8"
            onClick={() => setMecFilter(f)}>
            {f === "todos" ? "Todos" : `Mecanismo ${f}`}
          </Button>
        ))}
      </div>

      {/* BLOQUE 1 — Mapa de estado */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Mapa de estado del programa</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {entidades.map(e => {
              const sem = getEntitySemaforo(e);
              return (
                <div key={e.entidad_id} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleViewEntity(e.entidad_id)}>
                  <span className={`h-5 w-5 rounded-full ${SEMAFORO_COLORS[sem]}`} />
                  <span className="text-[10px] mt-1 text-muted-foreground text-center max-w-[60px] truncate">{e.nombre_corto}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Al día</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Rezago leve</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Rezago crítico</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Sin actividad</span>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 2 — Alertas críticas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" /> Alertas críticas ({alertas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin alertas activas ✓</p>
          ) : (
            <div className="space-y-2">
              {visibleAlertas.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs rounded border p-2 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => handleViewEntity(a.entidadId)}>
                  <span className={`h-3 w-3 rounded-full shrink-0 mt-0.5 ${a.severity === "rojo" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{a.entidad} {a.actividad && <span className="font-mono text-muted-foreground">({a.actividad})</span>}</p>
                    <p className="text-muted-foreground">{a.descripcion}</p>
                    <p className="text-[10px] text-muted-foreground">{a.detalle}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                </div>
              ))}
              {alertas.length > 8 && !showAllAlertas && (
                <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setShowAllAlertas(true)}>
                  Ver todas ({alertas.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOQUE 3 — Acciones del programa (reasignaciones) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shuffle className="h-4 w-4" /> Acciones del programa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!reasignaciones || reasignaciones.length === 0) ? (
            <p className="text-xs text-muted-foreground">No hay solicitudes de reasignación pendientes.</p>
          ) : (
            <div className="space-y-2">
              {reasignaciones.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-xs p-2 border rounded cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate("/reasignaciones")}>
                  <Badge variant="outline" className="text-[10px] shrink-0">Reasignación</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{r.entidades?.nombre_corto}</p>
                    <p className="text-muted-foreground truncate">{r.motivo}</p>
                  </div>
                  <span className="text-muted-foreground">{r.fecha_solicitud}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOQUE 4 — Estado financiero */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ClickableKpiCard label="Ejecutado total" value={`USD ${fmt(totals.ejecutTotal)}`}
          onClick={() => setPanel({ type: "financiero-desglose" })} />
        <ClickableKpiCard label="Del convenio" value={`${totals.pct}%`}
          sub={`USD ${fmt(totals.presupTotal)} total`}
          onClick={() => setPanel({ type: "financiero-pct" })} />
        <ClickableKpiCard label="Saldo disponible" value={`USD ${fmt(totals.saldo)}`}
          onClick={() => setPanel({ type: "financiero-saldo" })}
          className={totals.saldo < 0 ? "border-destructive/30" : ""} />
      </div>

      {/* PANEL LATERAL */}
      <DetailPanel open={panel?.type === "entidad"} onClose={() => setPanel(null)}
        title={panel?.data?.nombre_corto || "Entidad"}>
        {panel?.data && <EntitySummaryPanel ent={panel.data} onNavigate={() => { setPanel(null); handleNavigateEntity(panel.data.entidad_id); }} />}
      </DetailPanel>

      <DetailPanel open={panel?.type === "financiero-desglose"} onClose={() => setPanel(null)} title="Desglose financiero por entidad">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Entidad</TableHead>
              <TableHead className="text-xs">Mec.</TableHead>
              <TableHead className="text-xs text-right">Presupuesto</TableHead>
              <TableHead className="text-xs text-right">Ejecutado</TableHead>
              <TableHead className="text-xs text-right">%</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entidades.map(e => (
                <TableRow key={e.entidad_id} className="cursor-pointer hover:bg-muted/40" onClick={() => handleViewEntity(e.entidad_id)}>
                  <TableCell className="text-xs font-medium">{e.nombre_corto}</TableCell>
                  <TableCell><MecanismoBadge mec={e.mecanismo} /></TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(e.presupuesto_seco_total)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(e.ejecutado_seco_total)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{e.pct_ejecucion_seco}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DetailPanel>

      <DetailPanel open={panel?.type === "financiero-pct"} onClose={() => setPanel(null)} title="Ejecución del convenio">
        <div className="space-y-3">
          {entidades.sort((a, b) => b.pct_ejecucion_seco - a.pct_ejecucion_seco).map(e => (
            <div key={e.entidad_id} className="cursor-pointer hover:bg-muted/40 p-2 rounded border" onClick={() => handleViewEntity(e.entidad_id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{e.nombre_corto}</span>
                <span className="text-xs font-mono">{e.pct_ejecucion_seco}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, e.pct_ejecucion_seco)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </DetailPanel>

      <DetailPanel open={panel?.type === "financiero-saldo"} onClose={() => setPanel(null)} title="Saldo disponible por entidad">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Entidad</TableHead>
              <TableHead className="text-xs text-right">Presupuesto</TableHead>
              <TableHead className="text-xs text-right">Ejecutado</TableHead>
              <TableHead className="text-xs text-right">Saldo</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entidades.map(e => {
                const saldo = e.presupuesto_seco_total - e.ejecutado_seco_total;
                return (
                  <TableRow key={e.entidad_id} className="cursor-pointer hover:bg-muted/40" onClick={() => handleViewEntity(e.entidad_id)}>
                    <TableCell className="text-xs font-medium">{e.nombre_corto}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(e.presupuesto_seco_total)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(e.ejecutado_seco_total)}</TableCell>
                    <TableCell className={`text-xs text-right font-mono ${saldo < 0 ? "text-destructive" : ""}`}>{fmt(saldo)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DetailPanel>
    </div>
  );
}

function EntitySummaryPanel({ ent, onNavigate }: { ent: DashboardEntidad; onNavigate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MecanismoBadge mec={ent.mecanismo} />
        {ent.cadena_valor && <Badge variant="outline" className="text-[10px]">{ent.cadena_valor}</Badge>}
        {ent.region && <Badge variant="outline" className="text-[10px]">{ent.region}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded p-2">
          <p className="text-[10px] text-muted-foreground">Actividades</p>
          <p className="text-lg font-bold">{ent.actividades_completadas}/{ent.total_actividades}</p>
        </div>
        <div className="border rounded p-2">
          <p className="text-[10px] text-muted-foreground">Avance Operativo</p>
          <p className="text-lg font-bold">{ent.avance_operativo_promedio ?? 0}%</p>
        </div>
        <div className="border rounded p-2">
          <p className="text-[10px] text-muted-foreground">Ejecutado SECO</p>
          <p className="text-lg font-bold">USD {fmt(ent.ejecutado_seco_total)}</p>
          <p className="text-[10px] text-muted-foreground">{ent.pct_ejecucion_seco}% del presupuesto</p>
        </div>
        <div className="border rounded p-2">
          <p className="text-[10px] text-muted-foreground">Saldo</p>
          <p className={`text-lg font-bold ${ent.presupuesto_seco_total - ent.ejecutado_seco_total < 0 ? "text-destructive" : ""}`}>
            USD {fmt(ent.presupuesto_seco_total - ent.ejecutado_seco_total)}
          </p>
        </div>
      </div>

      {ent.meses_sin_reporte.length > 0 && (
        <div className="text-xs text-destructive border border-destructive/20 rounded p-2">
          Sin reporte: {ent.meses_sin_reporte.join(", ")}
        </div>
      )}

      {ent.observaciones_detalle.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Observaciones:</p>
          {ent.observaciones_detalle.map((o, i) => (
            <p key={i} className="text-xs text-muted-foreground">{o}</p>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full text-xs" onClick={onNavigate}>
        Ver planificación completa →
      </Button>
    </div>
  );
}
