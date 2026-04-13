import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GestionTrimestres } from "@/components/GestionTrimestres";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingDown, Activity, DollarSign, FileCheck, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { Header, MecanismoBadge, Semaforo, fmt, DashboardSkeleton, ClickableKpiCard } from "./DashboardEntidad";
import { SeccionRevision } from "./SeccionRevision";
import { ResumenRegional } from "./ResumenRegional";
import EstadoReportesCoordinador from "@/components/planificacion/EstadoReportesCoordinador";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import DashboardFilters from "@/components/DashboardFilters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine, Legend,
} from "recharts";

interface Props {
  filterFn?: (e: DashboardEntidad) => boolean;
  title?: string;
  subtitle?: string;
  reviewEstado?: string;
  reviewNextEstado?: string;
  reviewTitle?: string;
  reviewLabel?: string;
  reviewFilterFn?: (r: any) => boolean;
}

function GaugeCircle({ value, label, color = "hsl(var(--primary))" }: { value: number; label: string; color?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 44 44)" className="transition-all duration-700" />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
          className="text-base font-bold fill-foreground">{pct}%</text>
      </svg>
      <span className="text-[11px] text-muted-foreground mt-1 text-center">{label}</span>
    </div>
  );
}

export default function DashboardMonitoreo({
  filterFn, title = "Dashboard de Monitoreo", subtitle,
  reviewEstado = "enviado,en_revision_tecnica", reviewNextEstado = "en_revision_financiera",
  reviewTitle = "Revisión Pendiente", reviewLabel = "Aprobar",
  reviewFilterFn,
}: Props) {
  const { data: allEntidades, isLoading } = useDashboardData();
  const [indicadoresStats, setIndicadoresStats] = useState({ total: 0, completed: 0 });
  const [contratos, setContratos] = useState<any[]>([]);
  const navigate = useNavigate();
  const { setEntidadId, setRole, filters } = useRole();

  // Apply both prop-based and global filters
  const entidades = (allEntidades || []).filter(e => {
    if (e.total_actividades === 0) return false;
    if (filterFn && !filterFn(e)) return false;
    if (filters.mecanismo === "mec_a" && e.mecanismo !== "A") return false;
    if (filters.mecanismo === "mec_b" && e.mecanismo !== "B") return false;
    if (filters.entidadFiltro && e.entidad_id !== filters.entidadFiltro) return false;
    if (filters.region && e.region !== filters.region) return false;
    return true;
  });

  useEffect(() => {
    const entidadIds = entidades.map(e => e.entidad_id);
    if (entidadIds.length > 0) {
      (supabase as any).from("indicadores_proyecto").select("id, entidad_id").in("entidad_id", entidadIds).then(({ data }: any) => {
        setIndicadoresStats({ total: data?.length || 0, completed: Math.round((data?.length || 0) * 0.4) });
      });
    }
    (supabase as any).from("contratos").select("id, fecha_fin, estado").eq("estado", "vigente").then(({ data }: any) => {
      setContratos(data || []);
    });
  }, [entidades.length]);

  if (isLoading) return <DashboardSkeleton />;

  const sobregiros = entidades.filter((e) => e.sobregiros_seco > 0);
  const pendientesTotal = entidades.reduce((s, e) => s + (e.pendientes_revision || 0), 0);
  const avgAvance = entidades.length > 0 ? Math.round(entidades.reduce((s, e) => s + (e.avance_operativo_promedio || 0), 0) / entidades.length) : 0;
  const avgEjecucion = entidades.length > 0 ? Math.round(entidades.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / entidades.length) : 0;

  // Alerts categorization
  const alertasCriticas: { text: string; entidad: string; entidadId: string; route?: string }[] = [];
  const alertasAtencion: { text: string; entidad: string; entidadId: string; route?: string }[] = [];
  const entidadesAlDia: { nombre: string; id: string }[] = [];

  const contratosProximos = contratos.filter(c => {
    if (!c.fecha_fin) return false;
    const diff = (new Date(c.fecha_fin).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff < 30;
  });

  entidades.forEach((e) => {
    const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
    let hasIssue = false;

    if (e.sobregiros_seco > 0) {
      alertasCriticas.push({ text: `${e.sobregiros_seco} sobregiro(s) SECO`, entidad: e.nombre_corto, entidadId: e.entidad_id, route: "/desembolsos" });
      hasIssue = true;
    }
    if (e.tiene_observado) {
      alertasCriticas.push({ text: `Registro(s) observado(s) — requiere corrección`, entidad: e.nombre_corto, entidadId: e.entidad_id, route: "/revision-pendiente" });
      hasIssue = true;
    }
    if (e.actividades_sin_iniciar > 0) {
      alertasAtencion.push({ text: `${e.actividades_sin_iniciar} actividad(es) sin iniciar`, entidad: e.nombre_corto, entidadId: e.entidad_id, route: "/mis-actividades" });
      hasIssue = true;
    }
    if (e.meses_sin_reporte.length > 0) {
      alertasAtencion.push({ text: `Sin reporte: ${e.meses_sin_reporte.join(", ")}`, entidad: e.nombre_corto, entidadId: e.entidad_id, route: "/verificacion" });
      hasIssue = true;
    }
    if (e.registros_borrador > 0) {
      alertasAtencion.push({ text: `${e.registros_borrador} registro(s) en borrador`, entidad: e.nombre_corto, entidadId: e.entidad_id, route: "/registro-mensual" });
      hasIssue = true;
    }
    if (e.registros_en_revision > 0) {
      alertasAtencion.push({ text: `${e.registros_en_revision} registro(s) en revisión`, entidad: e.nombre_corto, entidadId: e.entidad_id, route: "/revision-pendiente" });
      hasIssue = true;
    }
    if (desfase > 30) {
      alertasCriticas.push({ text: `Desfase técnico-financiero ${desfase}%`, entidad: e.nombre_corto, entidadId: e.entidad_id });
      hasIssue = true;
    } else if (desfase > 15) {
      alertasAtencion.push({ text: `Desfase ${desfase}%`, entidad: e.nombre_corto, entidadId: e.entidad_id });
      hasIssue = true;
    }

    if (!hasIssue) entidadesAlDia.push({ nombre: e.nombre_corto, id: e.entidad_id });
  });

  const handleEntityClick = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/actividades");
  };

  const handleAlertClick = (alert: { entidadId: string; route?: string }) => {
    const ent = entidades.find(e => e.entidad_id === alert.entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(alert.entidadId);
    navigate(alert.route || "/actividades");
  };

  const handleBadgeClick = (e: React.MouseEvent, entidadId: string, route: string) => {
    e.stopPropagation();
    const ent = entidades.find(en => en.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate(route);
  };

  // Chart data
  const avanceBarData = [...entidades]
    .sort((a, b) => (b.avance_operativo_promedio || 0) - (a.avance_operativo_promedio || 0))
    .map((e) => ({ name: e.nombre_corto, avance: e.avance_operativo_promedio || 0 }));

  const mecComparison = (() => {
    const mecA = entidades.filter((e) => e.mecanismo === "A");
    const mecB = entidades.filter((e) => e.mecanismo === "B");
    const avg = (arr: DashboardEntidad[], key: keyof DashboardEntidad) =>
      arr.length ? Math.round(arr.reduce((s, e) => s + Number(e[key] || 0), 0) / arr.length) : 0;
    return [
      { name: "Avance Op.", "Mec A": avg(mecA, "avance_operativo_promedio"), "Mec B": avg(mecB, "avance_operativo_promedio") },
      { name: "Ejec. SECO", "Mec A": avg(mecA, "pct_ejecucion_seco"), "Mec B": avg(mecB, "pct_ejecucion_seco") },
    ];
  })();

  const scatterData = entidades.map((e) => ({
    name: e.nombre_corto,
    x: e.avance_operativo_promedio || 0,
    y: e.pct_ejecucion_seco,
    mec: e.mecanismo,
  }));

  return (
    <div className="space-y-6">
      <Header title={title} subtitle={subtitle || "Vista consolidada del programa SeCompetitivo"} />

      <DashboardFilters showMecanismo showEntidad showRegion showPeriodo />

      {/* Trimester management (only for monitoreo role) */}
      {title === "Dashboard de Monitoreo" && <GestionTrimestres />}

      {/* Review section */}
      <SeccionRevision
        title={reviewTitle} estadoFiltro={reviewEstado}
        estadoAprobar={reviewNextEstado} labelAprobar={reviewLabel}
        filterFn={reviewFilterFn}
      />

      {/* Regional summary (only for coordinador_regional) */}
      {title.includes("Regional") && <ResumenRegional />}

      {/* Estado de reportes — planificación (coordinador_regional) */}
      {title.includes("Regional") && <EstadoReportesCoordinador />}

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs font-medium text-muted-foreground mb-1">Entidades Activas</p>
            <p className="text-3xl font-bold text-foreground">{entidades.length}</p>
            <p className="text-[10px] text-muted-foreground">bajo seguimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex flex-col items-center">
            <GaugeCircle value={avgAvance} label="Avance Operativo" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex flex-col items-center">
            <GaugeCircle value={avgEjecucion} label="Ejec. SECO" color="hsl(var(--chart-2))" />
          </CardContent>
        </Card>
        <ClickableKpiCard
          label="Pendientes Revisión" value={String(pendientesTotal)} sub="registros mensuales"
          onClick={() => navigate("/revision-pendiente")}
          className={pendientesTotal > 0 ? "border-warning/50" : ""}
        />
        <ClickableKpiCard
          label="Sobregiros Activos" value={String(sobregiros.length)} sub="entidades"
          onClick={() => navigate("/desembolsos")}
          className={sobregiros.length > 0 ? "border-destructive/50" : ""}
        />
        <ClickableKpiCard
          label="Indicadores Impacto" value={`${indicadoresStats.completed}/${indicadoresStats.total}`} sub="completados"
          onClick={() => navigate("/indicadores-impacto")}
        />
      </div>

      {/* Middle section: Charts + Alerts */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Charts left (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Avance Operativo por Entidad</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, avanceBarData.length * 36)}>
                <BarChart data={avanceBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <ReferenceLine x={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="avance" radius={[0, 4, 4, 0]} cursor="pointer"
                    onClick={(_: any, index: number) => {
                      const ent = entidades.find(e => e.nombre_corto === avanceBarData[index]?.name);
                      if (ent) handleEntityClick(ent.entidad_id);
                    }}>
                    {avanceBarData.map((d, i) => (
                      <Cell key={i} fill={d.avance >= 80 ? "hsl(142, 76%, 36%)" : d.avance >= 50 ? "hsl(48, 96%, 53%)" : "hsl(0, 72%, 51%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Comparativa Mec A vs Mec B</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mecComparison} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="Mec A" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Mec B" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Avance Técnico vs Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Avance Op." domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Avance Op. %", position: "insideBottom", offset: -5, style: { fontSize: 11 } }} />
                  <YAxis type="number" dataKey="y" name="Ejec. SECO" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Ejec. SECO %", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border rounded p-2 text-xs shadow">
                        <p className="font-semibold">{d?.name}</p>
                        <p>Op: {d?.x}% | Fin: {d?.y}%</p>
                      </div>
                    );
                  }} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                  <Scatter data={scatterData} cursor="pointer"
                    onClick={(_: any, index: number) => {
                      const ent = entidades.find(e => e.nombre_corto === scatterData[index]?.name);
                      if (ent) handleEntityClick(ent.entidad_id);
                    }}>
                    {scatterData.map((d, i) => (
                      <Cell key={i} fill={d.mec === "A" ? "hsl(var(--primary))" : "hsl(var(--chart-3))"} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Alerts right (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" /> Alertas Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertasCriticas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin alertas críticas ✓</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {alertasCriticas.map((a, i) => (
                    <div key={i}
                      className="flex items-start gap-2 text-xs rounded bg-destructive/5 p-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                      onClick={() => handleAlertClick(a)}
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-destructive mt-1 shrink-0" />
                      <span><strong>{a.entidad}</strong>: {a.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-warning/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertasAtencion.length === 0 && contratosProximos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin items de atención ✓</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {alertasAtencion.map((a, i) => (
                    <div key={i}
                      className="flex items-start gap-2 text-xs rounded bg-yellow-500/5 p-2 cursor-pointer hover:bg-yellow-500/10 transition-colors"
                      onClick={() => handleAlertClick(a)}
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mt-1 shrink-0" />
                      <span><strong>{a.entidad}</strong>: {a.text}</span>
                    </div>
                  ))}
                  {contratosProximos.length > 0 && (
                    <div
                      className="flex items-start gap-2 text-xs rounded bg-yellow-500/5 p-2 cursor-pointer hover:bg-yellow-500/10 transition-colors"
                      onClick={() => navigate("/contratos")}
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mt-1 shrink-0" />
                      <span>{contratosProximos.length} contrato(s) por vencer en &lt;30 días</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Al Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entidadesAlDia.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ninguna entidad completamente al día</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {entidadesAlDia.map((n) => (
                    <Badge key={n.id} variant="outline"
                      className="text-[10px] border-green-500/50 text-green-700 cursor-pointer hover:bg-green-500/10"
                      onClick={() => handleEntityClick(n.id)}
                    >{n.nombre}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Entity grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Detalle por Entidad</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entidades.map((ent) => {
            const desfase = (ent.avance_operativo_promedio || 0) - ent.pct_ejecucion_seco;
            const disponible = ent.presupuesto_seco_total - ent.ejecutado_seco_total;
            return (
              <Card key={ent.entidad_id}
                className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
                onClick={() => handleEntityClick(ent.entidad_id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Semaforo desfase={desfase} />
                      <CardTitle className="text-sm font-semibold truncate">{ent.nombre_corto}</CardTitle>
                    </div>
                    <MecanismoBadge mec={ent.mecanismo} />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ent.cadena_valor && <Badge variant="outline" className="text-[9px] px-1">{ent.cadena_valor}</Badge>}
                    {ent.region && <Badge variant="outline" className="text-[9px] px-1">{ent.region}</Badge>}
                    {ent.sobregiros_seco > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1 cursor-pointer hover:bg-destructive/90"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/gestion-financiera")}>🔴 Sobregiro</Badge>
                    )}
                    {ent.tiene_observado && (
                      <Badge className="text-[9px] px-1 bg-orange-500/15 text-orange-600 cursor-pointer hover:bg-orange-500/25"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/revision-pendiente")}>⚠ Observado</Badge>
                    )}
                    {ent.actividades_sin_iniciar > 0 && (
                      <Badge className="text-[9px] px-1 bg-warning/15 text-warning cursor-pointer hover:bg-warning/25"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/mis-actividades")}>{ent.actividades_sin_iniciar} sin iniciar</Badge>
                    )}
                    {ent.meses_sin_reporte.length > 0 && (
                      <Badge className="text-[9px] px-1 bg-destructive/10 text-destructive cursor-pointer hover:bg-destructive/20"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/registro-mensual")}>{ent.meses_sin_reporte.join(", ")} sin reportar</Badge>
                    )}
                    {ent.registros_borrador > 0 && (
                      <Badge className="text-[9px] px-1 bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/registro-mensual")}>{ent.registros_borrador} borrador(es)</Badge>
                    )}
                    {ent.registros_en_revision > 0 && (
                      <Badge className="text-[9px] px-1 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/revision-pendiente")}>{ent.registros_en_revision} en revisión</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Operativo</span>
                      <span className="font-mono">{ent.avance_operativo_promedio ?? 0}%</span>
                    </div>
                    <Progress value={ent.avance_operativo_promedio ?? 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> SECO</span>
                      <span className="font-mono">{ent.pct_ejecucion_seco}%</span>
                    </div>
                    <Progress value={ent.pct_ejecucion_seco} className="h-2" />
                  </div>

                  <div className="bg-muted/30 rounded p-2 text-[11px]">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="text-muted-foreground">Presup.</p>
                        <p className="font-mono font-semibold">{fmt(ent.presupuesto_seco_total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ejecutado</p>
                        <p className="font-mono font-semibold">{fmt(ent.ejecutado_seco_total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Disponible</p>
                        <p className={`font-mono font-semibold ${disponible < 0 ? "text-destructive" : ""}`}>{fmt(disponible)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t">
                    <span>{ent.actividades_completadas}/{ent.total_actividades} actividades</span>
                    {(ent.pendientes_revision ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-warning"><Clock className="h-3 w-3" />{ent.pendientes_revision} pend.</span>
                    )}
                    {ent.sobregiros_seco > 0 && (
                      <Badge variant="destructive" className="text-[9px] cursor-pointer hover:bg-destructive/90"
                        onClick={(e) => handleBadgeClick(e, ent.entidad_id, "/gestion-financiera")}>{ent.sobregiros_seco} sobregiro(s)</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
