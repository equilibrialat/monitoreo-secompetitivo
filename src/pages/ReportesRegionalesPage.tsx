import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import {
  PeriodSelector, usePeriodSelector, Semaforo, EmptyState, DownloadButton,
  Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabsList, TabsTrigger, TabsContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatCurrency
} from "@/components/reportes/ReportShell";
import { TRIMESTRES_MESES, SEMESTRES_MESES } from "@/lib/reportUtils";

type PeriodType = "trimestral" | "semestral" | "anual";

export default function ReportesRegionalesPage() {
  const { entidades } = useRole();
  const ps = usePeriodSelector();
  const [periodType, setPeriodType] = useState<PeriodType>("trimestral");
  const [dashboard, setDashboard] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const periodoLabel = periodType === "trimestral" ? `${ps.trimestre} ${ps.anioTrimestral}` : periodType === "semestral" ? `${ps.semestre} ${ps.anioSemestral}` : ps.anioAnual;

  useEffect(() => { loadData(); }, [periodType, ps.trimestre, ps.anioTrimestral, ps.semestre, ps.anioSemestral, ps.anioAnual]);

  async function loadData() {
    setLoading(true);
    // For coordinador_regional, show all entities (region filtering can be added when auth is in place)
    const [d, c] = await Promise.all([
      (supabase as any).from("v_dashboard_entidad").select("*"),
      (supabase as any).from("contratos").select("*, entidades(nombre_corto, region)").in("estado", ["vigente", "en_proceso"]),
    ]);
    setDashboard(d.data || []);
    setContratos(c.data || []);

    // Monthly records for the period
    const meses = periodType === "trimestral" ? TRIMESTRES_MESES[ps.trimestre] : periodType === "semestral" ? SEMESTRES_MESES[ps.semestre] : [1,2,3,4,5,6,7,8,9,10,11,12];
    const anio = parseInt(periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual);
    const { data: rm } = await (supabase as any).from("registros_mensuales").select("*, actividades(codigo, nombre), entidades(nombre_corto)").eq("anio", anio).in("mes", meses);
    setRegistros(rm || []);
    setLoading(false);
  }

  // Alerts
  const diasRestantes = (fecha: string | null) => {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  };
  const contratosAlerta = contratos.filter(c => {
    const d = diasRestantes(c.fecha_fin);
    return d !== null && d < 30;
  });
  const entidadesConSobregiro = dashboard.filter(d => (d.sobregiros_seco || 0) > 0);
  const entidadesConDesfase = dashboard.filter(d => (d.desfases_tecnico_financiero || 0) > 0);

  // Group registros by entity for resumen operativo
  const registrosByEntidad = registros.reduce((acc: any, r: any) => {
    const eid = r.entidad_id;
    if (!acc[eid]) acc[eid] = { nombre: r.entidades?.nombre_corto || eid, registros: [] };
    acc[eid].registros.push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes Regionales</h1>
          <p className="text-muted-foreground">Vista por región</p>
        </div>
      </div>

      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {(["trimestral", "semestral", "anual"] as PeriodType[]).map(t => (
              <Badge key={t} variant={periodType === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setPeriodType(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Badge>
            ))}
          </div>
          <PeriodSelector label="Período" type={periodType === "trimestral" ? "trimestre" : periodType === "semestral" ? "semestre" : "anual"}
            value={periodType === "trimestral" ? ps.trimestre : periodType === "semestral" ? ps.semestre : ps.anioAnual}
            onChange={periodType === "trimestral" ? ps.setTrimestre : periodType === "semestral" ? ps.setSemestre : ps.setAnioAnual}
            anio={periodType === "trimestral" ? ps.anioTrimestral : periodType === "semestral" ? ps.anioSemestral : ps.anioAnual}
            onAnioChange={periodType === "trimestral" ? ps.setAnioTrimestral : periodType === "semestral" ? ps.setAnioSemestral : ps.setAnioAnual} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        <Tabs defaultValue="entidad">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="entidad">Avance por Entidad</TabsTrigger>
            <TabsTrigger value="operativo">Resumen Operativo</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="entidad">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Avance por Entidad — {periodoLabel}</h3>
              <DownloadButton data={dashboard.map(d => ({ Entidad: d.nombre_corto, CdV: d.cadena_valor, Actividades: d.total_actividades, "Ejecución SECO %": d.pct_ejecucion_seco, Sobregiros: d.sobregiros_seco, Desfases: d.desfases_tecnico_financiero }))} filename={`regional_entidades_${periodoLabel}.csv`} />
            </div>
            {dashboard.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>Entidad</TableHead><TableHead>CdV</TableHead><TableHead className="text-right">Actividades</TableHead>
                <TableHead className="text-right">Ejec. SECO %</TableHead><TableHead className="text-center">Desfase</TableHead><TableHead className="text-center">Estado</TableHead>
              </TableRow></TableHeader><TableBody>
                {dashboard.map(d => {
                  const desfase = Math.abs(50 - (d.pct_ejecucion_seco || 0));
                  return (
                    <TableRow key={d.entidad_id}>
                      <TableCell className="font-medium">{d.nombre_corto}</TableCell>
                      <TableCell>{d.cadena_valor || "—"}</TableCell>
                      <TableCell className="text-right">{d.total_actividades || 0}</TableCell>
                      <TableCell className="text-right">{(d.pct_ejecucion_seco || 0).toFixed(1)}%</TableCell>
                      <TableCell className="text-center">{d.desfases_tecnico_financiero || 0}</TableCell>
                      <TableCell className="text-center"><Semaforo value={desfase} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody></Table></div>
            )}
          </TabsContent>

          <TabsContent value="operativo">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Resumen Operativo — {periodoLabel}</h3>
            </div>
            {Object.keys(registrosByEntidad).length === 0 ? <EmptyState /> : (
              <div className="space-y-4">
                {Object.values(registrosByEntidad).map((ent: any, i: number) => (
                  <div key={i} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{ent.nombre} ({ent.registros.length} registros)</h4>
                    <div className="space-y-2">
                      {ent.registros.slice(0, 10).map((r: any) => (
                        <div key={r.id} className="flex justify-between text-sm border-b pb-1">
                          <span>{r.actividades?.codigo} — {r.actividades?.nombre}</span>
                          <span className="text-muted-foreground">{r.descripcion_avance ? r.descripcion_avance.slice(0, 80) + "..." : "Sin descripción"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alertas">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Alertas — {periodoLabel}</h3>
            </div>
            <div className="space-y-4">
              {entidadesConSobregiro.length > 0 && (
                <div className="border border-destructive/30 rounded-lg p-4">
                  <h4 className="font-semibold text-destructive mb-2">🔴 Sobregiros ({entidadesConSobregiro.length})</h4>
                  {entidadesConSobregiro.map(e => (
                    <div key={e.entidad_id} className="text-sm py-1">{e.nombre_corto}: {e.sobregiros_seco} actividades con sobregiro</div>
                  ))}
                </div>
              )}
              {entidadesConDesfase.length > 0 && (
                <div className="border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-600 mb-2">🟡 Desfases ({entidadesConDesfase.length})</h4>
                  {entidadesConDesfase.map(e => (
                    <div key={e.entidad_id} className="text-sm py-1">{e.nombre_corto}: {e.desfases_tecnico_financiero} desfases</div>
                  ))}
                </div>
              )}
              {contratosAlerta.length > 0 && (
                <div className="border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-600 mb-2">📋 Contratos por vencer ({contratosAlerta.length})</h4>
                  {contratosAlerta.map(c => {
                    const d = diasRestantes(c.fecha_fin);
                    return (
                      <div key={c.id} className="text-sm py-1">
                        {c.entidades?.nombre_corto}: {c.nombre_contratado} — {d !== null && d < 0 ? `Vencido hace ${Math.abs(d)} días 🔴` : `${d} días restantes 🟡`}
                      </div>
                    );
                  })}
                </div>
              )}
              {entidadesConSobregiro.length === 0 && entidadesConDesfase.length === 0 && contratosAlerta.length === 0 && (
                <EmptyState message="No hay alertas para este período. ✅" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent></Card>
    </div>
  );
}
