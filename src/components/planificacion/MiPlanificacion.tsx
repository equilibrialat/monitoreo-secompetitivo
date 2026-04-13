import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, Calendar, DollarSign, Target, Clock, CheckCircle2, Circle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { RegistroAvancePlanificacionDialog } from "./RegistroAvancePlanificacionDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanificacionActividad {
  id: string;
  entidad_codigo: string;
  resultado_intermedio: string;
  producto: string;
  actividad_codigo: string;
  actividad_descripcion: string;
  unidad_medida: string;
  medio_verificacion: string;
  meta_total: number;
  presupuesto_seco_usd: number;
  meses_programados: string[];
  responsable: string;
}

type ActividadEstado = "pendiente" | "entregado" | "por_iniciar" | "cerrada";

interface TreeNode {
  label: string;
  children?: TreeNode[];
  actividad?: PlanificacionActividad;
  estado?: ActividadEstado;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function calcEstado(meses: string[], currentYM: string, hasReport: boolean): ActividadEstado {
  const isCurrentMonth = meses.includes(currentYM);
  const allPast = meses.every((m) => m < currentYM);
  const allFuture = meses.every((m) => m > currentYM);

  if (isCurrentMonth && hasReport) return "entregado";
  if (isCurrentMonth && !hasReport) return "pendiente";
  if (allFuture) return "por_iniciar";
  if (allPast) return "cerrada";
  // Mixed: some past, some future, none current
  return "por_iniciar";
}

const ESTADO_CONFIG: Record<ActividadEstado, { icon: typeof Circle; color: string; label: string }> = {
  pendiente: { icon: Clock, color: "text-yellow-500", label: "Pendiente este mes" },
  entregado: { icon: CheckCircle2, color: "text-green-500", label: "Entregado" },
  por_iniciar: { icon: Circle, color: "text-blue-500", label: "Por iniciar" },
  cerrada: { icon: Lock, color: "text-muted-foreground", label: "Cerrada" },
};

function buildTree(actividades: PlanificacionActividad[], reportedCodes: Set<string>, currentYM: string): TreeNode[] {
  const riMap = new Map<string, Map<string, PlanificacionActividad[]>>();

  for (const a of actividades) {
    const riKey = a.resultado_intermedio;
    const prodKey = a.producto;
    if (!riMap.has(riKey)) riMap.set(riKey, new Map());
    const prodMap = riMap.get(riKey)!;
    if (!prodMap.has(prodKey)) prodMap.set(prodKey, []);
    prodMap.get(prodKey)!.push(a);
  }

  const tree: TreeNode[] = [];
  for (const [ri, prodMap] of riMap) {
    const riShort = ri.length > 80 ? ri.substring(0, ri.indexOf(":") + 1) || ri.substring(0, 60) : ri;
    const prodNodes: TreeNode[] = [];
    for (const [prod, acts] of prodMap) {
      const actNodes: TreeNode[] = acts.map((a) => ({
        label: a.actividad_codigo,
        actividad: a,
        estado: calcEstado(a.meses_programados, currentYM, reportedCodes.has(a.actividad_codigo)),
      }));
      prodNodes.push({ label: prod, children: actNodes });
    }
    tree.push({ label: riShort, children: prodNodes });
  }
  return tree;
}

export default function MiPlanificacion() {
  const { entidadId, entidades } = useRole();
  const [actividades, setActividades] = useState<PlanificacionActividad[]>([]);
  const [reportedCodes, setReportedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedActividad, setSelectedActividad] = useState<PlanificacionActividad | null>(null);

  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;
  const currentYM = getCurrentYearMonth();

  useEffect(() => {
    if (!entidadCodigo) {
      setActividades([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      (supabase as any)
        .from("planificacion_actividades")
        .select("*")
        .eq("entidad_codigo", entidadCodigo)
        .order("actividad_codigo"),
      (supabase as any)
        .from("registros_mensuales")
        .select("actividad_id, anio, mes, actividades!inner(codigo)")
        .eq("entidades.id", entidadId),
    ]).then(([planRes, regRes]: any[]) => {
      setActividades(planRes.data || []);
      // For now, reported codes from registros_mensuales for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const reported = new Set<string>();
      if (regRes.data) {
        for (const r of regRes.data) {
          if (r.anio === currentYear && r.mes === currentMonth && r.actividades?.codigo) {
            reported.add(r.actividades.codigo);
          }
        }
      }
      setReportedCodes(reported);
      setLoading(false);
    });
  }, [entidadCodigo, entidadId]);

  const tree = useMemo(
    () => buildTree(actividades, reportedCodes, currentYM),
    [actividades, reportedCodes, currentYM]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = actividades.length;
    let pendientes = 0, entregados = 0, porIniciar = 0, cerradas = 0;
    for (const a of actividades) {
      const e = calcEstado(a.meses_programados, currentYM, reportedCodes.has(a.actividad_codigo));
      if (e === "pendiente") pendientes++;
      else if (e === "entregado") entregados++;
      else if (e === "por_iniciar") porIniciar++;
      else cerradas++;
    }
    const presupuestoTotal = actividades.reduce((s, a) => s + (a.presupuesto_seco_usd || 0), 0);
    return { total, pendientes, entregados, porIniciar, cerradas, presupuestoTotal };
  }, [actividades, reportedCodes, currentYM]);

  if (!entidadCodigo) return null; // Only for APPCACAO

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Mi Planificación</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (actividades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Mi Planificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Tu planificación se está configurando. En las próximas horas verás aquí el árbol
              completo de tu proyecto con las actividades comprometidas y su estado de avance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Mi Planificación — Anexo B
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {actividades[0]?.proyecto_nombre || "Proyecto"}
          </p>
        </CardHeader>
        <CardContent>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <MiniKpi label="Total actividades" value={stats.total} />
            <MiniKpi label="Pendientes este mes" value={stats.pendientes} color="text-yellow-600" />
            <MiniKpi label="Entregadas" value={stats.entregados} color="text-green-600" />
            <MiniKpi label="Presupuesto SECO" value={`USD ${stats.presupuestoTotal.toLocaleString()}`} icon={<DollarSign className="h-3.5 w-3.5" />} />
          </div>

          {/* Tree */}
          <div className="space-y-2">
            {tree.map((ri, i) => (
              <ResultadoNode key={i} node={ri} onRegistrar={(a) => { setSelectedActividad(a); setDialogOpen(true); }} />
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedActividad && (
        <RegistroAvancePlanificacionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          actividad={selectedActividad}
          entidadId={entidadId!}
          onSaved={() => {
            setReportedCodes((prev) => new Set([...prev, selectedActividad.actividad_codigo]));
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}

function MiniKpi({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", color || "text-foreground")}>
        {icon && <span className="inline-flex mr-1">{icon}</span>}
        {value}
      </p>
    </div>
  );
}

function ResultadoNode({ node, onRegistrar }: { node: TreeNode; onRegistrar: (a: PlanificacionActividad) => void }) {
  const [open, setOpen] = useState(true);
  // Extract short RI label (e.g. "RESULTADO INTERMEDIO 1")
  const riLabel = node.label.includes(":") ? node.label.substring(0, node.label.indexOf(":")).trim() : node.label;
  const riDesc = node.label.includes(":") ? node.label.substring(node.label.indexOf(":") + 1).trim() : "";

  return (
    <div className="border rounded-lg">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors">
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-90")} />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground">{riLabel}</span>
          {riDesc && <p className="text-xs text-muted-foreground truncate">{riDesc}</p>}
        </div>
        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">{node.children?.length || 0} productos</Badge>
      </button>
      {open && node.children && (
        <div className="px-4 pb-3 space-y-2">
          {node.children.map((prod, i) => (
            <ProductoNode key={i} node={prod} onRegistrar={onRegistrar} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductoNode({ node, onRegistrar }: { node: TreeNode; onRegistrar: (a: PlanificacionActividad) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ml-4 border-l-2 border-primary/20 pl-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/30 rounded px-2 transition-colors">
        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", open && "rotate-90")} />
        <span className="text-sm font-medium text-foreground">{node.label}</span>
      </button>
      {open && node.children && (
        <div className="space-y-1.5 mt-1">
          {node.children.map((actNode, i) => (
            <ActividadRow key={i} node={actNode} onRegistrar={onRegistrar} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActividadRow({ node, onRegistrar }: { node: TreeNode; onRegistrar: (a: PlanificacionActividad) => void }) {
  const a = node.actividad!;
  const estado = node.estado!;
  const cfg = ESTADO_CONFIG[estado];
  const Icon = cfg.icon;
  const currentYM = getCurrentYearMonth();

  return (
    <div className="ml-6 border rounded-md p-3 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-primary">{a.actividad_codigo}</span>
            <Badge variant="outline" className={cn("text-[9px]", cfg.color)}>{cfg.label}</Badge>
          </div>
          <p className="text-sm text-foreground mt-1">{a.actividad_descripcion}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Meta: {a.meta_total} {a.unidad_medida}</span>
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> USD {a.presupuesto_seco_usd?.toLocaleString()}</span>
          </div>
          {/* Month badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {(a.meses_programados || []).map((m) => {
              const [y, mo] = m.split("-");
              const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
              const label = `${monthNames[parseInt(mo) - 1]} ${y}`;
              const isCurrent = m === currentYM;
              const isPast = m < currentYM;
              return (
                <Badge
                  key={m}
                  variant={isCurrent ? "default" : "outline"}
                  className={cn(
                    "text-[9px]",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPast && "opacity-50 line-through"
                  )}
                >
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>
        {estado === "pendiente" && (
          <Button size="sm" variant="default" className="shrink-0 text-xs" onClick={() => onRegistrar(a)}>
            <FileText className="h-3.5 w-3.5 mr-1" />
            Registrar avance
          </Button>
        )}
      </div>
    </div>
  );
}
