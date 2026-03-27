import { useState, useEffect, useCallback } from "react";
import { Zap, Loader2, Save, Send, Info } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { fetchActividadesByEntidad, type ActividadDB } from "@/lib/supabaseQueries";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ESTADOS = [
  { value: "no_iniciada", label: "No iniciada" },
  { value: "en_proceso", label: "En proceso" },
  { value: "completada", label: "Completada" },
  { value: "retrasada", label: "Retrasada" },
  { value: "suspendida", label: "Suspendida" },
];

const TAG_ICONS: Record<string, { icon: string; label: string }> = {
  capacitacion: { icon: "📋", label: "Capacitación" },
  innovacion: { icon: "💡", label: "Innovación" },
  gei: { icon: "🌱", label: "GEI" },
  nuevo_producto: { icon: "📦", label: "Nuevo producto" },
  normativa: { icon: "📜", label: "Normativa" },
};

interface RowData {
  actividadId: string;
  codigo: string;
  nombre: string;
  meta: string;
  acumAnterior: number;
  avanceEsteMes: string;
  estado: string;
  descripcion: string;
  tieneGasto: boolean;
  tags: string[];
  registroExistenteId: string | null;
  estadoRegistro: string | null;
  dirty: boolean;
  // Mini-modal gasto data
  gastos: GastoRow[];
}

interface GastoRow {
  fuente: string;
  monto: string;
  tipo_gasto: string;
  fecha_gasto: string;
}

const emptyGasto = (): GastoRow => ({ fuente: "cofinanciamiento_seco", monto: "", tipo_gasto: "", fecha_gasto: "" });

export default function RegistroRapidoPage() {
  const { entidadId } = useRole();
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<RowData[]>([]);
  const [gastoDialogIdx, setGastoDialogIdx] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!entidadId) return;
    setLoading(true);

    const [actividades, registrosResult, acumResult] = await Promise.all([
      fetchActividadesByEntidad(entidadId),
      (supabase as any)
        .from("registros_mensuales")
        .select("id, actividad_id, avance_valor, estado, descripcion_avance, estado_registro")
        .eq("entidad_id", entidadId)
        .eq("mes", Number(mes))
        .eq("anio", Number(anio)),
      (supabase as any)
        .from("registros_mensuales")
        .select("actividad_id, avance_valor")
        .eq("entidad_id", entidadId)
        .eq("anio", Number(anio))
        .neq("estado_registro", "observado"),
    ]);

    const regMap = new Map<string, any>();
    for (const r of registrosResult.data || []) regMap.set(r.actividad_id, r);

    // Calculate accumulated per activity (excluding current month)
    const acumMap = new Map<string, number>();
    for (const r of acumResult.data || []) {
      const existing = regMap.get(r.actividad_id);
      // Skip current month's record
      if (existing && existing.id === r.id) continue;
      acumMap.set(r.actividad_id, (acumMap.get(r.actividad_id) || 0) + (r.avance_valor || 0));
    }

    const newRows: RowData[] = actividades.map((act: ActividadDB) => {
      const reg = regMap.get(act.id);
      const isLocked = reg?.estado_registro === "enviado" || reg?.estado_registro === "en_revision_tecnica" ||
        reg?.estado_registro === "en_revision_financiera" || reg?.estado_registro === "en_revision_coordinador" ||
        reg?.estado_registro === "aprobado";
      return {
        actividadId: act.id,
        codigo: act.codigo,
        nombre: act.nombre,
        meta: `${act.meta_valor ?? 0} ${act.meta_unidad_medida ?? ""}`.trim(),
        acumAnterior: acumMap.get(act.id) || 0,
        avanceEsteMes: reg ? String(reg.avance_valor ?? "") : "",
        estado: reg?.estado ?? act.estado_actual ?? "no_iniciada",
        descripcion: reg?.descripcion_avance ?? "",
        tieneGasto: false,
        tags: act.tags ?? [],
        registroExistenteId: reg?.id ?? null,
        estadoRegistro: isLocked ? reg.estado_registro : null,
        dirty: false,
        gastos: [],
      };
    });

    setRows(newRows);
    setLoading(false);
  }, [entidadId, mes, anio]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateRow = (idx: number, field: keyof RowData, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, dirty: true } : r));
  };

  const totalConAvance = rows.filter(r => parseFloat(r.avanceEsteMes) > 0 || r.descripcion.trim()).length;
  const totalGastos = rows.reduce((sum, r) => {
    return sum + r.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
  }, 0);

  const saveAll = async (enviar: boolean) => {
    if (!entidadId) return;
    setSaving(true);
    let saved = 0;
    let errors = 0;

    const dirtyRows = rows.filter(r => r.dirty && !r.estadoRegistro);
    const rowsToSave = enviar
      ? dirtyRows.filter(r => parseFloat(r.avanceEsteMes) > 0 || r.descripcion.trim())
      : dirtyRows;

    for (const row of rowsToSave) {
      const registro = {
        actividad_id: row.actividadId,
        entidad_id: entidadId,
        anio: Number(anio),
        mes: Number(mes),
        avance_valor: parseFloat(row.avanceEsteMes) || 0,
        estado: row.estado,
        descripcion_avance: row.descripcion || null,
        estado_registro: enviar ? "enviado" : "borrador",
      };

      const { error: regError, data: regData } = await (supabase as any)
        .from("registros_mensuales")
        .upsert(registro, { onConflict: "actividad_id,anio,mes" })
        .select("id")
        .maybeSingle();

      if (regError || !regData) { errors++; continue; }

      // Save gastos if any
      if (row.gastos.length > 0) {
        await (supabase as any).from("ejecucion_financiera").delete().eq("registro_mensual_id", regData.id);
        const validGastos = row.gastos.filter(g => parseFloat(g.monto) > 0).map(g => ({
          registro_mensual_id: regData.id,
          actividad_id: row.actividadId,
          entidad_id: entidadId,
          fuente: g.fuente,
          monto: parseFloat(g.monto),
          tipo_gasto: g.tipo_gasto || null,
          fecha_gasto: g.fecha_gasto || null,
        }));
        if (validGastos.length > 0) {
          await (supabase as any).from("ejecucion_financiera").insert(validGastos);
        }
      }
      saved++;
    }

    setSaving(false);
    if (errors > 0) toast.error(`${errors} registros con error`);
    if (saved > 0) toast.success(`${saved} registros ${enviar ? "enviados" : "guardados como borrador"}`);
    if (saved === 0 && errors === 0) toast.info("No hay cambios por guardar");
    loadData();
  };

  if (!entidadId) {
    return <div className="text-muted-foreground text-center py-12">Selecciona una entidad en el panel lateral.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro Rápido</h1>
          <p className="text-sm text-muted-foreground">Registra avance de múltiples actividades a la vez</p>
        </div>
      </div>

      {/* Period + summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mes</label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Año</label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <Info className="h-4 w-4" />
              {totalConAvance} de {rows.length} actividades con avance
              {totalGastos > 0 && <span className="font-medium text-foreground ml-2">| Gastos: USD {totalGastos.toLocaleString()}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando actividades...
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead className="min-w-[200px]">Actividad</TableHead>
                    <TableHead className="w-[100px]">Meta</TableHead>
                    <TableHead className="w-[80px] text-right">Acum.</TableHead>
                    <TableHead className="w-[100px]">Avance mes</TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead className="min-w-[180px]">Descripción breve</TableHead>
                    <TableHead className="w-[70px] text-center">¿Gasto?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const isLocked = !!row.estadoRegistro;
                    return (
                      <TableRow key={row.actividadId} className={isLocked ? "opacity-60" : row.dirty ? "bg-primary/5" : ""}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {row.codigo}
                            {row.tags.map(tag => {
                              const info = TAG_ICONS[tag];
                              if (!info) return null;
                              return (
                                <Tooltip key={tag}>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help text-sm">{info.icon}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{info.label}</TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                          {isLocked && <Badge className="text-[9px] mt-1 bg-muted text-muted-foreground">🔒 {row.estadoRegistro}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{row.nombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.meta}</TableCell>
                        <TableCell className="text-right text-xs font-medium">{row.acumAnterior}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-sm w-[80px]"
                            value={row.avanceEsteMes}
                            onChange={e => updateRow(idx, "avanceEsteMes", e.target.value)}
                            disabled={isLocked}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.estado}
                            onValueChange={v => updateRow(idx, "estado", v)}
                            disabled={isLocked}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            value={row.descripcion}
                            onChange={e => updateRow(idx, "descripcion", e.target.value)}
                            disabled={isLocked}
                            placeholder="Breve descripción..."
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Checkbox
                              checked={row.tieneGasto}
                              onCheckedChange={checked => {
                                updateRow(idx, "tieneGasto", !!checked);
                                if (checked && row.gastos.length === 0) {
                                  updateRow(idx, "gastos", [emptyGasto()]);
                                }
                              }}
                              disabled={isLocked}
                            />
                            {row.tieneGasto && !isLocked && (
                              <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => setGastoDialogIdx(idx)}>
                                Detallar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary + actions */}
      {!loading && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totalConAvance}</span> de {rows.length} actividades con avance registrado
                {totalGastos > 0 && <span className="ml-3">| Total gastos: <span className="font-medium text-foreground">USD {totalGastos.toLocaleString()}</span></span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => saveAll(false)} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Guardar todo como borrador
                </Button>
                <Button onClick={() => saveAll(true)} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Enviar todo para revisión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gasto mini-modal */}
      <Dialog open={gastoDialogIdx !== null} onOpenChange={() => setGastoDialogIdx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de gastos — {gastoDialogIdx !== null ? rows[gastoDialogIdx]?.codigo : ""}</DialogTitle>
          </DialogHeader>
          {gastoDialogIdx !== null && (
            <div className="space-y-3">
              {rows[gastoDialogIdx].gastos.map((g, gi) => (
                <div key={gi} className="grid grid-cols-4 gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Fuente</label>
                    <Select value={g.fuente} onValueChange={v => {
                      const newGastos = [...rows[gastoDialogIdx].gastos];
                      newGastos[gi] = { ...newGastos[gi], fuente: v };
                      updateRow(gastoDialogIdx, "gastos", newGastos);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cofinanciamiento_seco">SECO</SelectItem>
                        <SelectItem value="contrapartida_monetaria">Contrapartida Mon.</SelectItem>
                        <SelectItem value="contrapartida_no_monetaria">Contrapartida No Mon.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Monto USD</label>
                    <Input type="number" className="h-8 text-xs" value={g.monto} onChange={e => {
                      const newGastos = [...rows[gastoDialogIdx].gastos];
                      newGastos[gi] = { ...newGastos[gi], monto: e.target.value };
                      updateRow(gastoDialogIdx, "gastos", newGastos);
                    }} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Tipo gasto</label>
                    <Input className="h-8 text-xs" value={g.tipo_gasto} onChange={e => {
                      const newGastos = [...rows[gastoDialogIdx].gastos];
                      newGastos[gi] = { ...newGastos[gi], tipo_gasto: e.target.value };
                      updateRow(gastoDialogIdx, "gastos", newGastos);
                    }} placeholder="Consultoría..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Fecha</label>
                    <Input type="date" className="h-8 text-xs" value={g.fecha_gasto} onChange={e => {
                      const newGastos = [...rows[gastoDialogIdx].gastos];
                      newGastos[gi] = { ...newGastos[gi], fecha_gasto: e.target.value };
                      updateRow(gastoDialogIdx, "gastos", newGastos);
                    }} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const newGastos = [...rows[gastoDialogIdx].gastos, emptyGasto()];
                updateRow(gastoDialogIdx, "gastos", newGastos);
              }}>+ Agregar gasto</Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGastoDialogIdx(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
