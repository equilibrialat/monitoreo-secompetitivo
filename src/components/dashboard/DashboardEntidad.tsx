import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/contexts/RoleContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LayoutDashboard } from "lucide-react";

export default function DashboardEntidad() {
  const { entidadId } = useRole();
  const { data: entidades, isLoading } = useDashboardData();

  const ent = entidades?.find((e) => e.entidad_id === entidadId);

  if (isLoading) return <DashboardSkeleton />;

  if (!ent) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Selecciona una entidad en el panel lateral.
      </div>
    );
  }

  const avOp = ent.avance_operativo_promedio ?? 0;
  const avFin = ent.pct_ejecucion_seco;

  return (
    <div>
      <Header title="Mi Dashboard" subtitle={ent.nombre_corto} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="Actividades" value={`${ent.actividades_completadas}/${ent.total_actividades}`} sub="completadas" />
        <KpiCard label="Avance Operativo" value={`${avOp}%`} sub="promedio" />
        <KpiCard label="Ejecución SECO" value={`${avFin}%`} sub={`USD ${fmt(ent.ejecutado_seco_total)} / ${fmt(ent.presupuesto_seco_total)}`} />
        <KpiCard label="Pendientes" value={String(ent.pendientes_revision ?? 0)} sub="registros por revisar" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avance Operativo</CardTitle></CardHeader>
          <CardContent><Progress value={avOp} className="h-3" /><p className="text-xs text-muted-foreground mt-1">{avOp}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ejecución Financiera SECO</CardTitle></CardHeader>
          <CardContent><Progress value={avFin} className="h-3" /><p className="text-xs text-muted-foreground mt-1">{avFin}%</p></CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Shared sub-components used across dashboards ---

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 md:mb-6">
      <div className="flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 shrink-0">
        <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function Semaforo({ desfase }: { desfase: number }) {
  const abs = Math.abs(desfase);
  const color = abs < 15 ? "bg-green-500" : abs < 30 ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} title={`Desfase: ${desfase}%`} />;
}

export function MecanismoBadge({ mec }: { mec: string }) {
  return (
    <Badge variant={mec === "A" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
      MEC-{mec}
    </Badge>
  );
}

export function fmt(n: number) {
  return n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}><CardContent className="pt-5 pb-4"><div className="h-2 w-20 rounded bg-muted mb-3" /><div className="h-8 w-16 rounded bg-muted" /></CardContent></Card>
      ))}
    </div>
  );
}
