import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Header, KpiCard, fmt, DashboardSkeleton } from "./DashboardEntidad";

export default function DashboardAdministracion() {
  const { data: entidades, isLoading } = useDashboardData();
  if (isLoading) return <DashboardSkeleton />;

  const all = entidades || [];
  const totalEjecutado = all.reduce((s, e) => s + e.ejecutado_seco_total, 0);
  const totalPresupuesto = all.reduce((s, e) => s + e.presupuesto_seco_total, 0);
  const sobregiros = all.filter((e) => e.sobregiros_seco > 0);
  const pendientes = all.reduce((s, e) => s + (e.pendientes_revision || 0), 0);

  return (
    <div>
      <Header title="Dashboard Financiero" subtitle="Administración" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="Total Ejecutado SECO" value={`USD ${fmt(totalEjecutado)}`} sub={`de USD ${fmt(totalPresupuesto)}`} />
        <KpiCard label="% Ejecución Global" value={totalPresupuesto > 0 ? `${Math.round((totalEjecutado / totalPresupuesto) * 100)}%` : "0%"} />
        <KpiCard label="Sobregiros Activos" value={String(sobregiros.length)} sub="entidades" />
        <KpiCard label="Pendientes Revisión" value={String(pendientes)} sub="registros financieros" />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead className="text-right">Ppto SECO</TableHead>
                <TableHead className="text-right">Ejecutado</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Contrapartida Mon.</TableHead>
                <TableHead className="text-right">Contrapartida No Mon.</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((e) => {
                const hasSobregiro = e.sobregiros_seco > 0;
                return (
                  <TableRow key={e.entidad_id} className={hasSobregiro ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{e.nombre_corto}</TableCell>
                    <TableCell className="text-right">{fmt(e.presupuesto_seco_total)}</TableCell>
                    <TableCell className="text-right">{fmt(e.ejecutado_seco_total)}</TableCell>
                    <TableCell className="text-right">{e.pct_ejecucion_seco}%</TableCell>
                    <TableCell className="text-right">{fmt(e.presupuesto_cm_total)}</TableCell>
                    <TableCell className="text-right">{fmt(e.presupuesto_cnm_total)}</TableCell>
                    <TableCell className="text-center">
                      {hasSobregiro ? (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" /> Sobregiro
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sobregiros.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-destructive mb-3">🚨 Alertas de Sobregiro</h2>
          <div className="space-y-2">
            {sobregiros.map((e) => (
              <div key={e.entidad_id} className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span><strong>{e.nombre_corto}</strong>: {e.sobregiros_seco} actividad(es) con ejecución superior al presupuesto SECO</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
