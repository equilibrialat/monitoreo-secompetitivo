import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { useDashboardData, fetchSobregiroDetalle, type SobregirosDetalle } from "@/hooks/useDashboardData";
import { Header, ClickableKpiCard, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { SeccionRevision } from "./SeccionRevision";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";

export default function DashboardAdministracion() {
  const { data: entidades, isLoading } = useDashboardData();
  const [sobregiroDetalle, setSobregiroDetalle] = useState<SobregirosDetalle[]>([]);
  const navigate = useNavigate();
  const { setEntidadId } = useRole();

  useEffect(() => {
    fetchSobregiroDetalle().then(setSobregiroDetalle);
  }, []);

  if (isLoading) return <DashboardSkeleton />;

  const all = entidades || [];
  const totalEjecutado = all.reduce((s, e) => s + e.ejecutado_seco_total, 0);
  const totalPresupuesto = all.reduce((s, e) => s + e.presupuesto_seco_total, 0);
  const sobregiros = all.filter((e) => e.sobregiros_seco > 0);
  const pendientes = all.reduce((s, e) => s + (e.pendientes_revision || 0), 0);

  const handleRowClick = (entidadId: string) => {
    setEntidadId(entidadId);
    navigate("/mis-actividades");
  };

  return (
    <div>
      <Header title="Dashboard Financiero" subtitle="Administración" />

      <SeccionRevision
        title="Revisión Financiera Pendiente"
        estadoFiltro="en_revision_financiera"
        estadoAprobar="aprobado"
        labelAprobar="Aprobar (Final)"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <ClickableKpiCard label="Total Ejecutado SECO" value={`USD ${fmt(totalEjecutado)}`} sub={`de USD ${fmt(totalPresupuesto)}`} onClick={() => navigate("/desembolsos")} />
        <ClickableKpiCard label="% Ejecución Global" value={totalPresupuesto > 0 ? `${Math.round((totalEjecutado / totalPresupuesto) * 100)}%` : "0%"} onClick={() => {}} />
        <ClickableKpiCard label="Sobregiros Activos" value={String(sobregiros.length)} sub="entidades" onClick={() => { const el = document.getElementById("sobregiro-detail"); el?.scrollIntoView({ behavior: "smooth" }); }} className={sobregiros.length > 0 ? "border-destructive/50" : ""} />
        <ClickableKpiCard label="Pendientes Revisión" value={String(pendientes)} sub="registros financieros" onClick={() => navigate("/revision-pendiente")} className={pendientes > 0 ? "border-warning/50" : ""} />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4 px-0 sm:px-6">
          <div className="overflow-x-auto">
            <p className="text-[10px] text-muted-foreground text-center mb-1 sm:hidden">← desliza →</p>
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
                  <TableRow key={e.entidad_id} className={`cursor-pointer hover:bg-muted/50 ${hasSobregiro ? "bg-destructive/5" : ""}`} onClick={() => handleRowClick(e.entidad_id)}>
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
          </div>
        </CardContent>
      </Card>

      {sobregiroDetalle.length > 0 && (
        <Card className="mb-6 border-destructive/30" id="sobregiro-detail">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Sobregiros Detallados por Actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead className="text-right">Presupuesto SECO</TableHead>
                    <TableHead className="text-right">Ejecutado</TableHead>
                    <TableHead className="text-right">% Ejecución</TableHead>
                    <TableHead className="text-right">Exceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sobregiroDetalle.map((s, i) => (
                    <TableRow key={i} className="bg-destructive/5">
                      <TableCell className="font-medium">{s.entidad_nombre}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{s.actividad_codigo}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.actividad_nombre}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono">USD {fmt(s.presupuesto)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive font-semibold">USD {fmt(s.ejecutado)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="text-[10px]">{s.pct}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">+USD {fmt(s.ejecutado - s.presupuesto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {sobregiros.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-destructive mb-3">🚨 Alertas de Sobregiro</h2>
          <div className="space-y-2">
            {sobregiros.map((e) => (
              <div key={e.entidad_id}
                className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => handleRowClick(e.entidad_id)}
              >
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
