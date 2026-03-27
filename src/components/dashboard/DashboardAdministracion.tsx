import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import { useDashboardData, fetchSobregiroDetalle, type SobregirosDetalle } from "@/hooks/useDashboardData";
import { Header, ClickableKpiCard, KpiCard, MecanismoBadge, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { SeccionRevision } from "./SeccionRevision";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import DashboardFilters from "@/components/DashboardFilters";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";

export default function DashboardAdministracion() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const [sobregiroDetalle, setSobregiroDetalle] = useState<SobregirosDetalle[]>([]);
  const navigate = useNavigate();
  const { setEntidadId, filters } = useRole();

  useEffect(() => {
    fetchSobregiroDetalle().then(setSobregiroDetalle);
  }, []);

  if (isLoading) return <DashboardSkeleton />;

  // Apply filters
  const all = (allEntidades || []).filter(e => {
    if (filters.mecanismo === "mec_a" && e.mecanismo !== "A") return false;
    if (filters.mecanismo === "mec_b" && e.mecanismo !== "B") return false;
    if (filters.entidadFiltro && e.entidad_id !== filters.entidadFiltro) return false;
    if (filters.region && e.region !== filters.region) return false;
    return true;
  });

  const totalEjecutado = all.reduce((s, e) => s + e.ejecutado_seco_total, 0);
  const totalPresupuesto = all.reduce((s, e) => s + e.presupuesto_seco_total, 0);
  const totalCM = all.reduce((s, e) => s + (e.presupuesto_cm_total || 0), 0);
  const totalCNM = all.reduce((s, e) => s + (e.presupuesto_cnm_total || 0), 0);
  const totalEjecCM = all.reduce((s, e) => s + (e.ejecutado_cm_total || 0), 0);
  const totalEjecCNM = all.reduce((s, e) => s + (e.ejecutado_cnm_total || 0), 0);
  const sobregiros = all.filter((e) => e.sobregiros_seco > 0);
  const pendientes = all.reduce((s, e) => s + (e.pendientes_revision || 0), 0);
  const mecA = all.filter(e => e.mecanismo === "A");
  const mecB = all.filter(e => e.mecanismo !== "A");

  const handleRowClick = (entidadId: string) => {
    setEntidadId(entidadId);
    navigate("/mis-actividades");
  };

  const excelData = all.map(e => ({
    Entidad: e.nombre_corto,
    Mecanismo: e.mecanismo,
    Región: e.region || "",
    "Presupuesto SECO": e.presupuesto_seco_total,
    "Ejecutado SECO": e.ejecutado_seco_total,
    "% Ejecución": e.pct_ejecucion_seco,
    "Contrapartida Mon.": e.presupuesto_cm_total,
    "Contrapartida No Mon.": e.presupuesto_cnm_total,
    Sobregiros: e.sobregiros_seco,
  }));

  function renderEntidadTable(entidades: typeof all) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidad</TableHead>
              <TableHead className="text-right">Ppto SECO</TableHead>
              <TableHead className="text-right">Ejecutado</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">C. Monetaria</TableHead>
              <TableHead className="text-right">C. No Monetaria</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entidades.map((e) => {
              const hasSobregiro = e.sobregiros_seco > 0;
              return (
                <TableRow key={e.entidad_id} className={`cursor-pointer hover:bg-muted/50 ${hasSobregiro ? "bg-destructive/5" : ""}`} onClick={() => handleRowClick(e.entidad_id)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {e.nombre_corto}
                      <MecanismoBadge mec={e.mecanismo} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(e.presupuesto_seco_total)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(e.ejecutado_seco_total)}</TableCell>
                  <TableCell className="text-right">{e.pct_ejecucion_seco}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(e.presupuesto_cm_total)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(e.presupuesto_cnm_total)}</TableCell>
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
    );
  }

  function renderMecColumn(label: string, ents: typeof all) {
    const tot = ents.reduce((s, e) => s + e.presupuesto_seco_total, 0);
    const ejec = ents.reduce((s, e) => s + e.ejecutado_seco_total, 0);
    const pct = tot > 0 ? Math.round((ejec / tot) * 100) : 0;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><p className="text-muted-foreground">Presupuesto</p><p className="font-mono font-semibold">USD {fmt(tot)}</p></div>
            <div><p className="text-muted-foreground">Ejecutado</p><p className="font-mono font-semibold">USD {fmt(ejec)}</p></div>
            <div><p className="text-muted-foreground">Ejecución</p><p className="font-mono font-semibold">{pct}%</p></div>
          </div>
          <Progress value={pct} className="h-2" />
          {renderEntidadTable(ents)}
        </CardContent>
      </Card>
    );
  }

  const filteredSobregiros = sobregiroDetalle.filter(s => {
    const ent = all.find(e => e.nombre_corto === s.entidad_nombre);
    return !!ent;
  });

  return (
    <div>
      <Header title="Dashboard Financiero" subtitle="Administración" />

      <DashboardFilters showMecanismo showEntidad showRegion showPeriodo />

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

      <Tabs defaultValue="general" className="mb-6">
        <TabsList>
          <TabsTrigger value="general">Vista General</TabsTrigger>
          <TabsTrigger value="mecanismo">Por Mecanismo</TabsTrigger>
          <TabsTrigger value="entidad">Por Entidad</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardContent className="pt-4 px-0 sm:px-6">
              <div className="flex justify-end mb-2 px-2">
                <ExcelDownloadButton data={excelData} filename={`financiero_general_${new Date().toISOString().slice(0,10)}.csv`} />
              </div>
              {renderEntidadTable(all)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mecanismo">
          <div className="grid gap-4 lg:grid-cols-2">
            {renderMecColumn("Mecanismo A — Políticas Públicas", mecA)}
            {renderMecColumn("Mecanismo B — Cadenas de Valor", mecB)}
          </div>
        </TabsContent>

        <TabsContent value="entidad">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona una entidad en el filtro superior para ver su detalle financiero, o haz clic en cualquier fila de la tabla.
              </p>
              {filters.entidadFiltro ? (
                (() => {
                  const ent = all.find(e => e.entidad_id === filters.entidadFiltro);
                  if (!ent) return <p className="text-muted-foreground text-sm">Entidad no encontrada con filtros actuales.</p>;
                  const pct = ent.presupuesto_seco_total > 0 ? Math.round((ent.ejecutado_seco_total / ent.presupuesto_seco_total) * 100) : 0;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold">{ent.nombre_corto}</h3>
                        <MecanismoBadge mec={ent.mecanismo} />
                        {ent.region && <Badge variant="outline" className="text-xs">{ent.region}</Badge>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-muted/40 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Ppto SECO</p><p className="font-mono font-bold">USD {fmt(ent.presupuesto_seco_total)}</p></div>
                        <div className="bg-muted/40 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Ejecutado SECO</p><p className="font-mono font-bold">USD {fmt(ent.ejecutado_seco_total)}</p></div>
                        <div className="bg-muted/40 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">% Ejecución</p><p className="font-mono font-bold">{pct}%</p></div>
                        <div className="bg-muted/40 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Sobregiros</p><p className={`font-mono font-bold ${ent.sobregiros_seco > 0 ? "text-destructive" : ""}`}>{ent.sobregiros_seco}</p></div>
                      </div>
                      <Progress value={pct} className="h-3" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/40 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">C. Monetaria</p><p className="font-mono text-sm">USD {fmt(ent.presupuesto_cm_total)} → {fmt(ent.ejecutado_cm_total || 0)}</p></div>
                        <div className="bg-muted/40 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">C. No Monetaria</p><p className="font-mono text-sm">USD {fmt(ent.presupuesto_cnm_total)} → {fmt(ent.ejecutado_cnm_total || 0)}</p></div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                renderEntidadTable(all)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {filteredSobregiros.length > 0 && (
        <Card className="mb-6 border-destructive/30" id="sobregiro-detail">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Sobregiros Detallados por Actividad
              </CardTitle>
              <ExcelDownloadButton
                data={filteredSobregiros.map(s => ({
                  Entidad: s.entidad_nombre, Actividad: `${s.actividad_codigo} - ${s.actividad_nombre}`,
                  Presupuesto: s.presupuesto, Ejecutado: s.ejecutado, "%": s.pct, Exceso: s.ejecutado - s.presupuesto,
                }))}
                filename={`sobregiros_${new Date().toISOString().slice(0,10)}.csv`}
              />
            </div>
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
                  {filteredSobregiros.map((s, i) => (
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
