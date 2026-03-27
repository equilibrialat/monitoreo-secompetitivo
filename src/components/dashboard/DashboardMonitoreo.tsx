import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { Header, KpiCard, MecanismoBadge, Semaforo, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { SeccionRevision } from "./SeccionRevision";

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

export default function DashboardMonitoreo({
  filterFn, title = "Dashboard de Monitoreo", subtitle,
  reviewEstado = "en_revision_tecnica", reviewNextEstado = "en_revision_financiera",
  reviewTitle = "Revisión Técnica Pendiente", reviewLabel = "Aprobar (→ Rev. Financiera)",
  reviewFilterFn,
}: Props) {
  const { data: allEntidades, isLoading } = useDashboardData();
  if (isLoading) return <DashboardSkeleton />;

  const entidades = filterFn ? (allEntidades || []).filter(filterFn) : (allEntidades || []);
  const sobregiros = entidades.filter((e) => e.sobregiros_seco > 0);
  const sinRegistros = entidades.filter((e) => e.pendientes_revision === 0 && e.total_actividades > 0);
  const conDesfases = entidades.filter((e) => e.desfases_tecnico_financiero > 0);

  return (
    <div>
      <Header title={title} subtitle={subtitle} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="Entidades" value={String(entidades.length)} sub="bajo seguimiento" />
        <KpiCard label="Actividades totales" value={String(entidades.reduce((s, e) => s + e.total_actividades, 0))} />
        <KpiCard label="Sobregiros" value={String(sobregiros.length)} sub="entidades con sobregiro" />
        <KpiCard label="Pendientes revisión" value={String(entidades.reduce((s, e) => s + (e.pendientes_revision || 0), 0))} sub="registros mensuales" />
      </div>

      {/* Entity cards grid */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Entidades</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {entidades.map((ent) => {
          const desfase = (ent.avance_operativo_promedio || 0) - ent.pct_ejecucion_seco;
          return (
            <Card key={ent.entidad_id}>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">{ent.nombre_corto}</CardTitle>
                <div className="flex items-center gap-2">
                  <MecanismoBadge mec={ent.mecanismo} />
                  <Semaforo desfase={desfase} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Avance operativo</span>
                    <span>{ent.avance_operativo_promedio ?? 0}%</span>
                  </div>
                  <Progress value={ent.avance_operativo_promedio ?? 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Ejecución SECO</span>
                    <span>{ent.pct_ejecucion_seco}%</span>
                  </div>
                  <Progress value={ent.pct_ejecucion_seco} className="h-2" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>{ent.actividades_completadas}/{ent.total_actividades} actividades</span>
                  {(ent.pendientes_revision ?? 0) > 0 && (
                    <span className="text-warning flex items-center gap-1"><Clock className="h-3 w-3" />{ent.pendientes_revision} pend.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas */}
      {(sobregiros.length > 0 || conDesfases.length > 0) && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">⚠️ Alertas</h2>
          <div className="space-y-2">
            {sobregiros.map((e) => (
              <div key={`sob-${e.entidad_id}`} className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span><strong>{e.nombre_corto}</strong>: {e.sobregiros_seco} actividad(es) con sobregiro SECO</span>
              </div>
            ))}
            {conDesfases.map((e) => (
              <div key={`des-${e.entidad_id}`} className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-4 py-2 text-sm">
                <TrendingDown className="h-4 w-4 text-warning shrink-0" />
                <span><strong>{e.nombre_corto}</strong>: {e.desfases_tecnico_financiero} desfase(s) técnico-financiero</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
