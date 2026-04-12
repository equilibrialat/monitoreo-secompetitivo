import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Copy, Check, Eye, Settings, Send,
  BarChart3, Activity, DollarSign, Bell, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { Header, MecanismoBadge, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { GestionTrimestres } from "@/components/GestionTrimestres";
import { useTrimestreSeleccionado, getTrimestreLabel } from "@/hooks/useTrimestreActivo";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

// Expected benchmarks for Mec B entities
const BENCHMARKS: Record<string, number> = {
  CANATUR: 38,
  Markahuamachuco: 43,
  "App Cacao": 56,
};

const MEC_A_ENTITIES = ["COFIDE", "SENASA", "MINCETUR", "MTPE", "MIDAGRI"];

interface Alert {
  entidad: string;
  entidadId: string;
  tipo: "Financiero" | "Operativo" | "Reporte" | "Planificación";
  descripcion: string;
  fecha: string;
}

function StatusDot({ pct }: { pct: number }) {
  const color = pct >= 60 ? "bg-success" : pct >= 30 ? "bg-warning" : "bg-destructive";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

function KpiCardSimple({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/30" : ""}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SummaryText({ entidades, trimestreLabel }: { entidades: DashboardEntidad[]; trimestreLabel: string }) {
  const [copied, setCopied] = useState(false);
  const mecB = entidades.filter(e => e.mecanismo === "B");
  const mecA = entidades.filter(e => e.mecanismo === "A");
  const avgEjec = mecB.length > 0 ? (mecB.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / mecB.length).toFixed(1) : "0";
  const retraso = entidades.filter(e => (e.avance_operativo_promedio || 0) < 80).length;
  const alertas = entidades.reduce((s, e) => s + (e.sobregiros_seco > 0 ? 1 : 0) + (e.tiene_observado ? 1 : 0) + (e.meses_sin_reporte.length > 0 ? 1 : 0), 0);

  // Find worst performer
  const worst = mecB.sort((a, b) => a.pct_ejecucion_seco - b.pct_ejecucion_seco)[0];
  const worstBench = worst ? BENCHMARKS[worst.nombre_corto] || 0 : 0;

  const text = `Resumen ejecutivo del programa — ${trimestreLabel}

Mec B cuenta con ${mecB.length} entidades activas. La ejecución financiera promedio es ${avgEjec}%${worst ? `, con ${worst.nombre_corto} mostrando el mayor retraso respecto a su línea de tiempo esperada (${worst.pct_ejecucion_seco}% ejecutado vs ${worstBench}% esperado)` : ""}. ${mecB.filter(e => e.nombre_corto !== worst?.nombre_corto).map(e => e.nombre_corto).join(" y ")} se encuentran dentro del rango esperado.

${retraso} actividades presentan retraso operativo.
${alertas} alertas activas requieren atención.${mecA.length > 0 ? `\n\nMec A: ${mecA.length} entidades activas.` : "\nMec A: Datos en proceso de carga."}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Resumen copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">📝 Resumen Ejecutivo</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copiado" : "Copiar resumen"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
      </CardContent>
    </Card>
  );
}

function ComparisonChart({ entidades }: { entidades: DashboardEntidad[] }) {
  const data = entidades
    .sort((a, b) => b.pct_ejecucion_seco - a.pct_ejecucion_seco)
    .map(e => ({
      name: e.nombre_corto,
      ejec: e.pct_ejecucion_seco,
      benchmark: BENCHMARKS[e.nombre_corto] || 0,
      mec: e.mecanismo,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ejecución Financiera SECO por Entidad</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 48)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <ReTooltip
              formatter={(v: number) => `${v}%`}
              content={({ payload, label }) => {
                if (!payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-popover border rounded p-2 text-xs shadow">
                    <p className="font-semibold">{label}</p>
                    <p>Ejecución: {d?.ejec}%</p>
                    {d?.benchmark > 0 && <p>Esperado: {d?.benchmark}%</p>}
                  </div>
                );
              }}
            />
            <Bar dataKey="ejec" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.mec === "A" ? "hsl(var(--muted))"
                      : d.ejec >= 60 ? "hsl(142, 76%, 36%)"
                      : d.ejec >= 30 ? "hsl(48, 96%, 53%)"
                      : "hsl(0, 72%, 51%)"
                  }
                />
              ))}
            </Bar>
            {/* Diamond markers for benchmarks */}
            {data.map((d, i) =>
              d.benchmark > 0 ? (
                <ReferenceLine key={`bench-${i}`} x={d.benchmark} stroke="hsl(var(--foreground))" strokeDasharray="3 3" strokeWidth={0.5} />
              ) : null
            )}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-2">Líneas punteadas = benchmark esperado por entidad</p>
      </CardContent>
    </Card>
  );
}

function AlertsPanel({ alerts, onMarkReviewed, showActions }: {
  alerts: Alert[];
  onMarkReviewed?: (idx: number) => void;
  showActions: boolean;
}) {
  const navigate = useNavigate();
  const { setEntidadId, setRole } = useRole();

  const tipoColors: Record<string, string> = {
    Financiero: "bg-destructive/10 text-destructive border-destructive/30",
    Operativo: "bg-warning/10 text-warning border-warning/30",
    Reporte: "bg-primary/10 text-primary border-primary/30",
    Planificación: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Alertas Activas ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin alertas activas ✓</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs rounded border p-2 bg-card">
                <Badge variant="outline" className={`text-[10px] shrink-0 ${tipoColors[a.tipo] || ""}`}>
                  {a.tipo}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{a.entidad}</p>
                  <p className="text-muted-foreground">{a.descripcion}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.fecha}</p>
                </div>
                {showActions && onMarkReviewed && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0" onClick={() => onMarkReviewed(i)}>
                    Revisada
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EntityTable({ entidades, onView, showActions }: {
  entidades: DashboardEntidad[];
  onView: (id: string) => void;
  showActions: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Entidades Mec B</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Entidad</TableHead>
                <TableHead className="text-xs">Cadena</TableHead>
                <TableHead className="text-xs text-right">% Ejec. Financ.</TableHead>
                <TableHead className="text-xs text-right">% Av. Operativo</TableHead>
                <TableHead className="text-xs">Último reporte</TableHead>
                <TableHead className="text-xs text-center">Estado</TableHead>
                <TableHead className="text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entidades.map(e => (
                <TableRow key={e.entidad_id} className="cursor-pointer hover:bg-muted/50" onClick={() => onView(e.entidad_id)}>
                  <TableCell className="text-sm font-medium">{e.nombre_corto}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.cadena_valor || "—"}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{e.pct_ejecucion_seco}%</TableCell>
                  <TableCell className="text-sm text-right font-mono">{e.avance_operativo_promedio ?? 0}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Oct-Dic 2025</TableCell>
                  <TableCell className="text-center"><StatusDot pct={e.pct_ejecucion_seco} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(ev) => { ev.stopPropagation(); onView(e.entidad_id); }}>
                        Ver <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                      {showActions && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={(ev) => { ev.stopPropagation(); toast.success("Solicitud de corrección enviada"); }}>
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MecAPlaceholder() {
  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Datos de Mec A en proceso de carga.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Entidades: {MEC_A_ENTITIES.join(", ")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 max-w-3xl mx-auto">
            {MEC_A_ENTITIES.map(name => (
              <Card key={name} className="opacity-50">
                <CardContent className="py-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{name}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">Sin datos</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== MAIN COMPONENTS =====

export default function DashboardMonitoreoNew() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const { seleccionado } = useTrimestreSeleccionado();
  const navigate = useNavigate();
  const { setEntidadId, setRole } = useRole();
  const [reviewedAlerts, setReviewedAlerts] = useState<Set<number>>(new Set());
  const [cadenaFilter, setCadenaFilter] = useState("todas");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  const entidades = useMemo(() => (allEntidades || []).filter(e => e.total_actividades > 0), [allEntidades]);
  const mecB = useMemo(() => entidades.filter(e => e.mecanismo === "B"), [entidades]);
  const mecA = useMemo(() => entidades.filter(e => e.mecanismo === "A"), [entidades]);

  const trimestreLabel = seleccionado ? getTrimestreLabel(seleccionado) : "Periodo actual";

  const alerts = useMemo<Alert[]>(() => {
    const a: Alert[] = [];
    mecB.forEach(e => {
      const bench = BENCHMARKS[e.nombre_corto] || 0;
      if (bench > 0 && e.pct_ejecucion_seco < bench - 10) {
        a.push({
          entidad: e.nombre_corto, entidadId: e.entidad_id, tipo: "Financiero",
          descripcion: `Ejecución ${bench - e.pct_ejecucion_seco}pp por debajo del ritmo esperado para esta etapa del proyecto`,
          fecha: new Date().toISOString().slice(0, 10),
        });
      }
      if (e.meses_sin_reporte.length > 0) {
        a.push({
          entidad: e.nombre_corto, entidadId: e.entidad_id, tipo: "Reporte",
          descripcion: `Sin reporte mensual: ${e.meses_sin_reporte.join(", ")}`,
          fecha: "2026-01-08",
        });
      }
      if (e.sobregiros_seco > 0) {
        a.push({
          entidad: e.nombre_corto, entidadId: e.entidad_id, tipo: "Operativo",
          descripcion: `${e.sobregiros_seco} sobregiro(s) financiero(s) detectado(s)`,
          fecha: new Date().toISOString().slice(0, 10),
        });
      }
    });
    return a.filter((_, i) => !reviewedAlerts.has(i));
  }, [mecB, reviewedAlerts]);

  // Filtered mecB for table
  const filteredMecB = useMemo(() => {
    return mecB.filter(e => {
      if (cadenaFilter !== "todas" && e.cadena_valor !== cadenaFilter) return false;
      if (estadoFilter === "critico" && e.pct_ejecucion_seco >= 30) return false;
      if (estadoFilter === "atencion" && (e.pct_ejecucion_seco < 30 || e.pct_ejecucion_seco >= 60)) return false;
      if (estadoFilter === "normal" && e.pct_ejecucion_seco < 60) return false;
      return true;
    });
  }, [mecB, cadenaFilter, estadoFilter]);

  const handleViewEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/actividades?readonly=monitoreo");
  };

  const handleMarkReviewed = (idx: number) => {
    setReviewedAlerts(prev => new Set([...prev, idx]));
    toast.success("Alerta marcada como revisada");
  };

  if (isLoading) return <DashboardSkeleton />;

  const avgEjecPrograma = entidades.length > 0
    ? Math.round(entidades.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / entidades.length)
    : 0;
  const actConRetraso = entidades.filter(e => (e.avance_operativo_promedio || 0) < 80).length;
  const alertCount = alerts.length;

  const avgEjecMecB = mecB.length > 0
    ? (mecB.reduce((s, e) => s + e.pct_ejecucion_seco, 0) / mecB.length).toFixed(1)
    : "0";

  const cadenas = [...new Set(mecB.map(e => e.cadena_valor).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Header title="Dashboard de Monitoreo" subtitle="Fabiola — Vista consolidada del programa" />
        <Button variant="outline" size="sm" onClick={() => navigate("/administracion")} className="shrink-0">
          <Settings className="h-4 w-4 mr-1" /> Gestión de Trimestres
        </Button>
      </div>

      <Tabs defaultValue="programa" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="programa" className="text-xs sm:text-sm">Programa</TabsTrigger>
          <TabsTrigger value="mec_a" className="text-xs sm:text-sm">Mec A — Políticas Públicas</TabsTrigger>
          <TabsTrigger value="mec_b" className="text-xs sm:text-sm">Mec B — Cadenas de Valor</TabsTrigger>
        </TabsList>

        {/* TAB PROGRAMA */}
        <TabsContent value="programa" className="space-y-4 mt-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <KpiCardSimple label="Entidades activas" value={String(entidades.length)} sub={`Mec A: ${mecA.length} · Mec B: ${mecB.length}`} />
            <KpiCardSimple label="Ejec. financiera SECO promedio" value={mecB.length > 0 ? `${avgEjecMecB}%` : "—"} sub={mecA.length > 0 ? "Mec A: Sin datos cargados" : "Solo Mec B"} />
            <KpiCardSimple label="Actividades con retraso" value={String(actConRetraso)} sub="< 80% de meta trimestral" />
            <KpiCardSimple label="Alertas activas" value={String(alertCount)} accent={alertCount > 0} />
          </div>

          <ComparisonChart entidades={entidades} />
          <SummaryText entidades={entidades} trimestreLabel={trimestreLabel} />
        </TabsContent>

        {/* TAB MEC A */}
        <TabsContent value="mec_a" className="mt-4">
          <MecAPlaceholder />
        </TabsContent>

        {/* TAB MEC B */}
        <TabsContent value="mec_b" className="space-y-4 mt-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <KpiCardSimple label="Entidades Mec B" value={String(mecB.length)} />
            <KpiCardSimple label="Ejec. SECO promedio" value={`${avgEjecMecB}%`} />
            <KpiCardSimple label="Avance operativo promedio" value={`${mecB.length > 0 ? Math.round(mecB.reduce((s, e) => s + (e.avance_operativo_promedio || 0), 0) / mecB.length) : 0}%`} />
            <KpiCardSimple label="Alertas Mec B" value={String(alerts.length)} accent={alerts.length > 0} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={cadenaFilter} onValueChange={setCadenaFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Cadena de valor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las cadenas</SelectItem>
                {cadenas.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="critico">Crítico (&lt;30%)</SelectItem>
                <SelectItem value="atencion">Atención (30-59%)</SelectItem>
                <SelectItem value="normal">Normal (≥60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <EntityTable entidades={filteredMecB} onView={handleViewEntity} showActions={true} />
          <AlertsPanel alerts={alerts} onMarkReviewed={handleMarkReviewed} showActions={true} />
          <SummaryText entidades={mecB} trimestreLabel={trimestreLabel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
