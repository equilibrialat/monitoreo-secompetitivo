import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Activity, TrendingUp } from "lucide-react";

interface Actividad {
  id: string;
  codigo: string;
  nombre: string;
  avance_operativo_pct: number;
  presupuesto_seco: number;
  ejecutado_seco_acum: number;
  estado_actual: string;
  meta_valor: number | null;
  meta_unidad_medida: string | null;
}

interface Iniciativa {
  id: string;
  nombre_corto: string;
  codigo: string;
  mecanismo: string;
  tipo_entidad: string;
  region: string | null;
  titulo_proyecto: string | null;
  actividades: Actividad[];
}

export default function MisIniciativasPage() {
  const { entidadId, entidades } = useRole();
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIniciativas();
  }, []);

  async function fetchIniciativas() {
    setLoading(true);
    // For now, show Mec A entities. In production, would filter by gestor_entidades assignment.
    const mecAEntidades = entidades.filter(e => e.mecanismo === "A");
    
    const results: Iniciativa[] = [];
    for (const ent of mecAEntidades) {
      const { data: acts } = await (supabase as any)
        .from("actividades")
        .select("id, codigo, nombre, avance_operativo_pct, presupuesto_seco, ejecutado_seco_acum, estado_actual, meta_valor, meta_unidad_medida")
        .eq("entidad_id", ent.id)
        .order("codigo");

      results.push({
        id: ent.id,
        nombre_corto: ent.nombre_corto,
        codigo: ent.nombre_corto,
        mecanismo: "A",
        tipo_entidad: ent.tipo_entidad,
        region: null,
        titulo_proyecto: null,
        actividades: acts || [],
      });
    }
    setIniciativas(results);
    setLoading(false);
  }

  if (loading) {
    return <p className="p-6 text-muted-foreground">Cargando iniciativas...</p>;
  }

  if (iniciativas.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-4">Mis Iniciativas</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tiene iniciativas del Mecanismo A asignadas.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Mis Iniciativas (Mecanismo A)</h1>

      {iniciativas.map((ini) => {
        const totalActs = ini.actividades.length;
        const completadas = ini.actividades.filter(a => a.estado_actual === "culminado_100").length;
        const avgAvance = totalActs > 0
          ? Math.round(ini.actividades.reduce((s, a) => s + (a.avance_operativo_pct || 0), 0) / totalActs)
          : 0;
        const totalPresup = ini.actividades.reduce((s, a) => s + (a.presupuesto_seco || 0), 0);
        const totalEjec = ini.actividades.reduce((s, a) => s + (a.ejecutado_seco_acum || 0), 0);
        const pctEjec = totalPresup > 0 ? Math.round((totalEjec / totalPresup) * 100) : 0;

        return (
          <Card key={ini.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{ini.nombre_corto}</CardTitle>
                  <p className="text-sm text-muted-foreground">{ini.titulo_proyecto || "Iniciativa Mecanismo A"}</p>
                </div>
                <Badge variant="outline" className="ml-auto">Mec A</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" />Actividades</p>
                  <p className="text-lg font-bold">{completadas}/{totalActs}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Avance Operativo</p>
                  <p className="text-lg font-bold">{avgAvance}%</p>
                  <Progress value={avgAvance} className="h-1.5 mt-1" />
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Presupuesto SECO</p>
                  <p className="text-lg font-bold">${totalPresup.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Ejecución SECO</p>
                  <p className="text-lg font-bold">{pctEjec}%</p>
                  <Progress value={pctEjec} className="h-1.5 mt-1" />
                </div>
              </div>

              {/* Activities table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead className="text-right">Avance %</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Presup. SECO</TableHead>
                      <TableHead className="text-right">Ejecutado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ini.actividades.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.codigo}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{a.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{a.avance_operativo_pct || 0}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {(a.estado_actual || "no_iniciada").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">${(a.presupuesto_seco || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">${(a.ejecutado_seco_acum || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
