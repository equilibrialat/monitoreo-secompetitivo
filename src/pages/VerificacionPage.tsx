import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";

const MESES_NOMBRE: Record<number, string> = {
  1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
};

interface EntidadEstado {
  id: string;
  nombre_corto: string;
  mecanismo: string;
  ultimo_mes_reportado: string | null;
  estado_ultimo: string | null;
  registros_observados: number;
  registros_borrador: number;
  registros_aprobados: number;
  meses_sin_registro: string[];
  contratos_al_dia: boolean;
  estado_general: "verde" | "amarillo" | "rojo";
}

interface DetallePendiente {
  meses_sin_registro: string[];
  registros_detalle: { mes: string; estado: string; observaciones: string | null }[];
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
    const entidadIds = entidades.map(e => e.id);

    const [regResult, contResult] = await Promise.all([
      (supabase as any)
        .from("registros_mensuales")
        .select("entidad_id, anio, mes, estado_registro, observaciones_revision")
        .eq("anio", 2025)
        .in("mes", [10, 11, 12])
        .in("entidad_id", entidadIds),
      (supabase as any)
        .from("contratos")
        .select("entidad_id, fecha_fin, estado")
        .in("entidad_id", entidadIds),
    ]);

    const registros = regResult.data || [];
    const contratos = contResult.data || [];

    const result: EntidadEstado[] = entidades.map((ent) => {
      const entRegs = registros.filter((r: any) => r.entidad_id === ent.id);
      const mesesConReg = new Set(entRegs.map((r: any) => r.mes));
      const mesesFaltantes = [10, 11, 12].filter(m => !mesesConReg.has(m)).map(m => `${MESES_NOMBRE[m]} 2025`);

      const latest = entRegs.sort((a: any, b: any) => b.mes - a.mes)[0];
      const ultimoMes = latest ? `${MESES_NOMBRE[latest.mes]} ${latest.anio}` : null;
      const estadoUltimo = latest?.estado_registro || null;

      const observados = entRegs.filter((r: any) => r.estado_registro === "observado").length;
      const borradores = entRegs.filter((r: any) => r.estado_registro === "borrador").length;
      const aprobados = entRegs.filter((r: any) => r.estado_registro === "aprobado").length;

      const entContratos = contratos.filter((c: any) => c.entidad_id === ent.id);
      const contratosAlDia = !entContratos.some((c: any) => {
        if (!c.fecha_fin) return false;
        return new Date(c.fecha_fin) < now && c.estado !== "completado";
      });

      let estadoGeneral: "verde" | "amarillo" | "rojo" = "verde";
      if (observados > 0 || mesesFaltantes.length >= 2) estadoGeneral = "rojo";
      else if (borradores > 0 || mesesFaltantes.length > 0) estadoGeneral = "amarillo";

      return {
        id: ent.id,
        nombre_corto: ent.nombre_corto,
        mecanismo: ent.mecanismo === "A" || ent.tipo_entidad === "iniciativa" ? "MEC-A" : "MEC-B",
        ultimo_mes_reportado: ultimoMes,
        estado_ultimo: estadoUltimo,
        registros_observados: observados,
        registros_borrador: borradores,
        registros_aprobados: aprobados,
        meses_sin_registro: mesesFaltantes,
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

    const [regResult, contResult] = await Promise.all([
      (supabase as any)
        .from("registros_mensuales")
        .select("mes, anio, estado_registro, observaciones_revision")
        .eq("entidad_id", ent.id)
        .eq("anio", 2025)
        .in("mes", [10, 11, 12])
        .order("mes"),
      (supabase as any)
        .from("contratos")
        .select("nombre_contratado, fecha_fin, estado")
        .eq("entidad_id", ent.id),
    ]);

    const regs = regResult.data || [];
    const mesesRegistrados = new Set(regs.map((r: any) => r.mes));
    const mesesFaltantes = [10, 11, 12]
      .filter(m => !mesesRegistrados.has(m))
      .map(m => `${MESES_NOMBRE[m]} 2025`);

    const registrosDetalle = regs.map((r: any) => ({
      mes: `${MESES_NOMBRE[r.mes]} ${r.anio}`,
      estado: r.estado_registro || "borrador",
      observaciones: r.observaciones_revision,
    }));

    const now = new Date();
    const vencidos = (contResult.data || [])
      .filter((c: any) => c.fecha_fin && new Date(c.fecha_fin) < now && c.estado !== "completado")
      .map((c: any) => `${c.nombre_contratado} (vence ${c.fecha_fin})`);

    setDetalle({
      meses_sin_registro: mesesFaltantes,
      registros_detalle: registrosDetalle,
      contratos_vencidos: vencidos,
    });
  }

  const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
    borrador: { label: "Borrador", className: "bg-warning/15 text-warning" },
    enviado: { label: "Enviado", className: "bg-primary/10 text-primary" },
    en_revision_tecnica: { label: "Rev. Técnica", className: "bg-warning/15 text-warning" },
    en_revision_financiera: { label: "Rev. Financiera", className: "bg-accent/15 text-accent-foreground" },
    en_revision_coordinador: { label: "Rev. Coordinador", className: "bg-primary/15 text-primary" },
    aprobado: { label: "Aprobado", className: "bg-emerald-500/15 text-emerald-700" },
    observado: { label: "Observado", className: "bg-destructive/15 text-destructive" },
  };

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
          <p className="text-muted-foreground">Estado de reporte T4-2025 (Oct-Dic) de todas las entidades</p>
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
          <CardTitle>Estado por Entidad — T4-2025</CardTitle>
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
                    <TableHead>Último reporte</TableHead>
                    <TableHead className="text-center">Aprobados</TableHead>
                    <TableHead className="text-center">Observados</TableHead>
                    <TableHead className="text-center">Borradores</TableHead>
                    <TableHead>Meses faltantes</TableHead>
                    <TableHead className="text-center">Contratos</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estados.map((ent) => {
                    const s = semaforo[ent.estado_general];
                    const estadoBadge = ent.estado_ultimo ? ESTADO_BADGE[ent.estado_ultimo] : null;
                    return (
                      <TableRow
                        key={ent.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleClickEntidad(ent)}
                      >
                        <TableCell className="font-medium">{ent.nombre_corto}</TableCell>
                        <TableCell><Badge variant="outline">{ent.mecanismo}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{ent.ultimo_mes_reportado || "Sin registros"}</span>
                            {estadoBadge && (
                              <Badge className={`text-[10px] ${estadoBadge.className}`}>{estadoBadge.label}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-emerald-700 font-medium">{ent.registros_aprobados}</TableCell>
                        <TableCell className="text-center">
                          {ent.registros_observados > 0 ? (
                            <span className="text-destructive font-medium">{ent.registros_observados}</span>
                          ) : "0"}
                        </TableCell>
                        <TableCell className="text-center">
                          {ent.registros_borrador > 0 ? (
                            <span className="text-warning font-medium">{ent.registros_borrador}</span>
                          ) : "0"}
                        </TableCell>
                        <TableCell>
                          {ent.meses_sin_registro.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Completo ✓</span>
                          ) : (
                            <div className="flex gap-1">
                              {ent.meses_sin_registro.map(m => (
                                <Badge key={m} variant="destructive" className="text-[10px]">{m}</Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {ent.contratos_al_dia ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">Al día</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-700 text-[10px]">Vencidos</Badge>
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
              {/* Missing months */}
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

              {/* Registros detail */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Estado de registros</h4>
                {detalle.registros_detalle.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin registros en el período</p>
                ) : (
                  <div className="space-y-2">
                    {detalle.registros_detalle.map((r, i) => {
                      const badge = ESTADO_BADGE[r.estado];
                      return (
                        <div key={i} className={`p-2 rounded border ${r.estado === "observado" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{r.mes}</span>
                            {badge && <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>}
                          </div>
                          {r.observaciones && (
                            <p className="text-xs text-destructive mt-1">📝 {r.observaciones}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contratos */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Contratos vencidos ({detalle.contratos_vencidos.length})</h4>
                {detalle.contratos_vencidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin contratos vencidos ✓</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {detalle.contratos_vencidos.map((c, i) => (
                      <li key={i} className="text-destructive">• {c}</li>
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
