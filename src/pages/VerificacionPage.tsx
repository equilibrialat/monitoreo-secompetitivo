import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";

interface EntidadEstado {
  id: string;
  nombre_corto: string;
  mecanismo: string;
  ultimo_mes_reportado: string | null;
  dias_sin_reportar: number;
  registros_pendientes: number;
  contratos_al_dia: boolean;
  estado_general: "verde" | "amarillo" | "rojo";
}

interface DetallePendiente {
  meses_sin_registro: string[];
  indicadores_pendientes: string[];
  contratos_vencidos: string[];
}

export default function VerificacionPage() {
  const { entidades } = useRole();
  const [estados, setEstados] = useState<EntidadEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadEstado | null>(null);
  const [detalle, setDetalle] = useState<DetallePendiente | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  useEffect(() => {
    fetchEstados();
  }, [entidades]);

  async function fetchEstados() {
    if (entidades.length === 0) return;
    setLoading(true);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch latest registros_mensuales per entity
    const { data: registros } = await (supabase as any)
      .from("registros_mensuales")
      .select("entidad_id, anio, mes, estado_registro")
      .order("anio", { ascending: false })
      .order("mes", { ascending: false });

    // Fetch contratos
    const { data: contratos } = await (supabase as any)
      .from("contratos")
      .select("entidad_id, fecha_fin, estado");

    const result: EntidadEstado[] = entidades.map((ent) => {
      const entRegistros = (registros || []).filter((r: any) => r.entidad_id === ent.id);
      const latest = entRegistros[0];

      let ultimoMes: string | null = null;
      let diasSinReportar = 999;

      if (latest) {
        ultimoMes = `${latest.mes}/${latest.anio}`;
        const lastDate = new Date(latest.anio, latest.mes - 1, 28);
        diasSinReportar = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const pendientes = entRegistros.filter((r: any) => r.estado_registro === "borrador").length;

      const entContratos = (contratos || []).filter((c: any) => c.entidad_id === ent.id);
      const contratosAlDia = !entContratos.some((c: any) => {
        if (!c.fecha_fin) return false;
        const fin = new Date(c.fecha_fin);
        return fin < now && c.estado !== "completado";
      });

      let estadoGeneral: "verde" | "amarillo" | "rojo" = "verde";
      if (diasSinReportar > 45) estadoGeneral = "rojo";
      else if (diasSinReportar > 30 || pendientes > 0) estadoGeneral = "amarillo";

      return {
        id: ent.id,
        nombre_corto: ent.nombre_corto,
        mecanismo: ent.tipo_entidad === "mec_a" ? "MEC-A" : "MEC-B",
        ultimo_mes_reportado: ultimoMes,
        dias_sin_reportar: diasSinReportar,
        registros_pendientes: pendientes,
        contratos_al_dia: contratosAlDia,
        estado_general: estadoGeneral,
      };
    });

    setEstados(result);
    setLoading(false);
  }

  async function handleClickEntidad(ent: EntidadEstado) {
    setSelectedEntidad(ent);
    setDetalleOpen(true);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Find missing months (check last 6 months)
    const { data: registros } = await (supabase as any)
      .from("registros_mensuales")
      .select("mes, anio")
      .eq("entidad_id", ent.id)
      .eq("anio", currentYear);

    const mesesRegistrados = new Set((registros || []).map((r: any) => r.mes));
    const mesesFaltantes: string[] = [];
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    for (let m = 1; m < currentMonth; m++) {
      if (!mesesRegistrados.has(m)) {
        mesesFaltantes.push(`${meses[m - 1]} ${currentYear}`);
      }
    }

    // Contratos vencidos
    const { data: contratos } = await (supabase as any)
      .from("contratos")
      .select("nombre_contratado, fecha_fin, estado")
      .eq("entidad_id", ent.id);

    const vencidos = (contratos || [])
      .filter((c: any) => c.fecha_fin && new Date(c.fecha_fin) < now && c.estado !== "completado")
      .map((c: any) => `${c.nombre_contratado} (vence ${c.fecha_fin})`);

    setDetalle({
      meses_sin_registro: mesesFaltantes,
      indicadores_pendientes: [],
      contratos_vencidos: vencidos,
    });
  }

  const semaforo = {
    verde: { emoji: "🟢", label: "Al día", class: "bg-emerald-500/20 text-emerald-700" },
    amarillo: { emoji: "🟡", label: "Pendientes", class: "bg-amber-500/20 text-amber-700" },
    rojo: { emoji: "🔴", label: "Atrasado", class: "bg-red-500/20 text-red-700" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <Eye className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verificación de Cumplimiento</h1>
          <p className="text-muted-foreground">Estado de reporte de todas las entidades</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["verde", "amarillo", "rojo"] as const).map((estado) => {
          const count = estados.filter((e) => e.estado_general === estado).length;
          const s = semaforo[estado];
          return (
            <Card key={estado}>
              <CardContent className="pt-4 flex items-center gap-3">
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Estado por Entidad</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4 text-muted-foreground">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Mecanismo</TableHead>
                    <TableHead>Último mes reportado</TableHead>
                    <TableHead className="text-center">Borradores</TableHead>
                    <TableHead className="text-center">Contratos</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estados.map((ent) => {
                    const s = semaforo[ent.estado_general];
                    return (
                      <TableRow
                        key={ent.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleClickEntidad(ent)}
                      >
                        <TableCell className="font-medium">{ent.nombre_corto}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ent.mecanismo}</Badge>
                        </TableCell>
                        <TableCell>{ent.ultimo_mes_reportado || "Sin registros"}</TableCell>
                        <TableCell className="text-center">{ent.registros_pendientes}</TableCell>
                        <TableCell className="text-center">
                          {ent.contratos_al_dia ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700">Al día</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-700">Vencidos</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={s.class}>{s.emoji} {s.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle: {selectedEntidad?.nombre_corto}</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Meses sin registro ({detalle.meses_sin_registro.length})</h4>
                {detalle.meses_sin_registro.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todos los meses registrados ✓</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {detalle.meses_sin_registro.map((m) => (
                      <Badge key={m} variant="destructive" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Contratos vencidos ({detalle.contratos_vencidos.length})</h4>
                {detalle.contratos_vencidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin contratos vencidos ✓</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {detalle.contratos_vencidos.map((c, i) => (
                      <li key={i} className="text-red-600">• {c}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
