import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador", enviado: "Enviado", en_revision_tecnica: "Rev. Técnica",
  en_revision_financiera: "Rev. Financiera", aprobado: "Aprobado", observado: "Observado",
};

function estadoBadge(estado: string | null) {
  if (!estado) return <Badge variant="outline">—</Badge>;
  if (estado === "aprobado") return <Badge className="bg-green-600 text-white">{ESTADO_LABELS[estado]}</Badge>;
  if (estado === "observado") return <Badge variant="destructive">{ESTADO_LABELS[estado]}</Badge>;
  return <Badge className="bg-yellow-500 text-black">{ESTADO_LABELS[estado] ?? estado}</Badge>;
}

function fmt(n: number | null | undefined) { return n == null ? "—" : n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function MisReportes() {
  const { entidadId } = useRole();
  const [registros, setRegistros] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [ejecucion, setEjecucion] = useState<any[]>([]);
  const [empleo, setEmpleo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<{ mes: number; anio: number } | null>(null);

  useEffect(() => {
    if (!entidadId) return;
    (async () => {
      setLoading(true);
      const [r, a, ef, emp] = await Promise.all([
        (supabase as any).from("registros_mensuales").select("*").eq("entidad_id", entidadId).order("anio", { ascending: false }).order("mes", { ascending: false }),
        (supabase as any).from("actividades").select("id, codigo, nombre").eq("entidad_id", entidadId),
        (supabase as any).from("ejecucion_financiera").select("*").eq("entidad_id", entidadId),
        (supabase as any).from("reporte_empleo").select("*").eq("entidad_id", entidadId),
      ]);
      setRegistros(r.data ?? []);
      setActividades(a.data ?? []);
      setEjecucion(ef.data ?? []);
      setEmpleo(emp.data ?? []);
      setLoading(false);
    })();
  }, [entidadId]);

  const periods = useMemo(() => {
    const map = new Map<string, { mes: number; anio: number; registros: any[] }>();
    registros.forEach(r => {
      const key = `${r.anio}-${r.mes}`;
      if (!map.has(key)) map.set(key, { mes: r.mes, anio: r.anio, registros: [] });
      map.get(key)!.registros.push(r);
    });
    return Array.from(map.values()).sort((a, b) => b.anio * 100 + b.mes - (a.anio * 100 + a.mes));
  }, [registros]);

  const worstEstado = (regs: any[]) => {
    const order = ["observado", "borrador", "enviado", "en_revision_tecnica", "en_revision_financiera", "aprobado"];
    let worst = "aprobado";
    for (const r of regs) {
      if (order.indexOf(r.estado_registro ?? "borrador") < order.indexOf(worst)) worst = r.estado_registro ?? "borrador";
    }
    return worst;
  };

  const getActName = (id: string) => {
    const a = actividades.find(a => a.id === id);
    return a ? `${a.codigo} — ${a.nombre}` : id.slice(0, 8);
  };

  const selectedRegs = selectedPeriod ? registros.filter(r => r.mes === selectedPeriod.mes && r.anio === selectedPeriod.anio) : [];
  const selectedEjec = selectedPeriod ? ejecucion.filter(e => selectedRegs.some(r => r.id === e.registro_mensual_id)) : [];

  if (loading) return <p className="text-muted-foreground py-8 text-center">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Reportes</h1>
        <p className="text-muted-foreground">Historial de reportes mensuales e indicadores</p>
      </div>

      <Tabs defaultValue="mensual">
        <TabsList>
          <TabsTrigger value="mensual">Registros Mensuales</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores de Impacto</TabsTrigger>
        </TabsList>

        <TabsContent value="mensual" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen por período</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Actividades reportadas</TableHead>
                  <TableHead>Estado general</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {periods.map(p => (
                    <TableRow key={`${p.anio}-${p.mes}`}>
                      <TableCell className="font-medium">{MESES[p.mes - 1]} {p.anio}</TableCell>
                      <TableCell>{p.registros.length}</TableCell>
                      <TableCell>{estadoBadge(worstEstado(p.registros))}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPeriod({ mes: p.mes, anio: p.anio })}>
                          Ver detalle <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {periods.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin reportes registrados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicadores" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Indicadores de Impacto Reportados</CardTitle></CardHeader>
            <CardContent>
              {empleo.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sin indicadores reportados</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Año</TableHead><TableHead>Período</TableHead>
                    <TableHead className="text-right">Empleos Creados</TableHead><TableHead className="text-right">Retenidos</TableHead>
                    <TableHead className="text-right">Mejorados</TableHead><TableHead>Estado</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {empleo.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{e.anio}</TableCell><TableCell>{e.periodo}</TableCell>
                        <TableCell className="text-right">{e.empleos_creados_total ?? 0}</TableCell>
                        <TableCell className="text-right">{e.empleos_retenidos_total ?? 0}</TableCell>
                        <TableCell className="text-right">{e.empleos_mejorados_total ?? 0}</TableCell>
                        <TableCell>{estadoBadge(e.estado_registro)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle — {selectedPeriod ? `${MESES[selectedPeriod.mes - 1]} ${selectedPeriod.anio}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Avance Operativo</h3>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Actividad</TableHead><TableHead className="text-right">Avance</TableHead>
                <TableHead>Estado</TableHead><TableHead>Estado Registro</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {selectedRegs.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{getActName(r.actividad_id)}</TableCell>
                    <TableCell className="text-right">{r.avance_valor ?? 0} {r.avance_unidad_medida}</TableCell>
                    <TableCell>{r.estado}</TableCell>
                    <TableCell>{estadoBadge(r.estado_registro)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {selectedEjec.length > 0 && (
              <>
                <h3 className="font-semibold text-sm mt-4">Ejecución Financiera</h3>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Actividad</TableHead><TableHead>Fuente</TableHead>
                    <TableHead className="text-right">Monto</TableHead><TableHead>Detalle</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {selectedEjec.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{getActName(e.actividad_id)}</TableCell>
                        <TableCell className="text-xs">{e.fuente}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(e.monto)}</TableCell>
                        <TableCell className="text-xs">{e.detalle_gasto ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
