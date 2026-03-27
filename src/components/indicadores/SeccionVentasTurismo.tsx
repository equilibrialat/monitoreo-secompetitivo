import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchByPeriodo, upsertRows, deleteRows } from "@/lib/indicadoresImpacto";

interface VentaRow {
  id?: string;
  ruc: string;
  nombre_empresa: string;
  tipo_empresa: string;
  region: string;
  clasificacion: string;
  ventas_alta_biodiversidad: number;
  ventas_baja_biodiversidad: number;
  ventas_alta_aventura: number;
  ventas_baja_aventura: number;
  ventas_alta_bienestar: number;
  ventas_baja_bienestar: number;
  ventas_alta_general: number;
  ventas_baja_general: number;
  ventas_alta_otros: number;
  ventas_baja_otros: number;
}

interface Props {
  entidadId: string;
  anio: number;
  periodo: string;
  onSaved: () => void;
}

const SEGMENTOS = ["biodiversidad", "aventura", "bienestar", "general", "otros"] as const;

const empty = (): VentaRow => ({
  ruc: "", nombre_empresa: "", tipo_empresa: "", region: "", clasificacion: "",
  ventas_alta_biodiversidad: 0, ventas_baja_biodiversidad: 0,
  ventas_alta_aventura: 0, ventas_baja_aventura: 0,
  ventas_alta_bienestar: 0, ventas_baja_bienestar: 0,
  ventas_alta_general: 0, ventas_baja_general: 0,
  ventas_alta_otros: 0, ventas_baja_otros: 0,
});

function totalVentas(r: VentaRow): number {
  return SEGMENTOS.reduce((s, seg) => s + (r[`ventas_alta_${seg}` as keyof VentaRow] as number) + (r[`ventas_baja_${seg}` as keyof VentaRow] as number), 0);
}

export function SeccionVentasTurismo({ entidadId, anio, periodo, onSaved }: Props) {
  const [rows, setRows] = useState<VentaRow[]>([empty()]);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchByPeriodo("reporte_turismo_ventas", entidadId, anio, periodo);
      if (data.length > 0) {
        setRows(data.map((d: any): VentaRow => ({
          id: d.id, ruc: d.ruc ?? "", nombre_empresa: d.nombre_empresa ?? "",
          tipo_empresa: d.tipo_empresa ?? "", region: d.region ?? "", clasificacion: d.clasificacion ?? "",
          ...Object.fromEntries(SEGMENTOS.flatMap((seg) => [
            [`ventas_alta_${seg}`, d[`ventas_alta_${seg}`] ?? 0],
            [`ventas_baja_${seg}`, d[`ventas_baja_${seg}`] ?? 0],
          ])),
        } as VentaRow)));
      }
    }
    load();
  }, [entidadId, anio, periodo]);

  const update = (i: number, f: keyof VentaRow, v: any) => {
    setRows((p) => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  };
  const addRow = () => setRows((p) => [...p, empty()]);
  const removeRow = (i: number) => {
    if (rows[i].id) setDeletedIds((p) => [...p, rows[i].id!]);
    setRows((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    await deleteRows("reporte_turismo_ventas", deletedIds);
    const dbRows = rows.filter((r) => r.nombre_empresa.trim()).map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      entidad_id: entidadId, anio, periodo,
      ruc: r.ruc, nombre_empresa: r.nombre_empresa, tipo_empresa: r.tipo_empresa,
      region: r.region, clasificacion: r.clasificacion,
      total_ventas: totalVentas(r),
      ...Object.fromEntries(SEGMENTOS.flatMap((seg) => [
        [`ventas_alta_${seg}`, r[`ventas_alta_${seg}` as keyof VentaRow]],
        [`ventas_baja_${seg}`, r[`ventas_baja_${seg}` as keyof VentaRow]],
      ])),
      estado_registro: "borrador",
    }));
    const result = await upsertRows("reporte_turismo_ventas", dbRows);
    setSaving(false); setDeletedIds([]);
    if (result.success) { toast.success("Sección Ventas Turismo guardada"); onSaved(); }
    else toast.error("Error", { description: result.error });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">🏨 Sección 2 — Ventas Turismo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">RUC</TableHead>
                <TableHead className="text-[10px]">Empresa</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px]">Región</TableHead>
                {SEGMENTOS.map((seg) => (
                  <TableHead key={seg} className="text-[10px] text-center" colSpan={2}>
                    {seg.charAt(0).toUpperCase() + seg.slice(1)}
                  </TableHead>
                ))}
                <TableHead className="text-[10px] text-right">Total</TableHead>
                <TableHead className="w-8" />
              </TableRow>
              <TableRow>
                <TableHead colSpan={4} />
                {SEGMENTOS.map((seg) => (
                  <><TableHead key={`${seg}_a`} className="text-[9px] text-center">Alta</TableHead>
                  <TableHead key={`${seg}_b`} className="text-[9px] text-center">Baja</TableHead></>
                ))}
                <TableHead /><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell><Input className="h-7 text-xs w-24" value={r.ruc} onChange={(e) => update(i, "ruc", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs min-w-[100px]" value={r.nombre_empresa} onChange={(e) => update(i, "nombre_empresa", e.target.value)} placeholder="Nombre" /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-20" value={r.tipo_empresa} onChange={(e) => update(i, "tipo_empresa", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-20" value={r.region} onChange={(e) => update(i, "region", e.target.value)} /></TableCell>
                  {SEGMENTOS.map((seg) => (
                    <>
                      <TableCell key={`${seg}_a_${i}`}><Input type="number" min={0} step="any" className="h-7 w-16 text-xs text-right" value={(r[`ventas_alta_${seg}` as keyof VentaRow] as number) || ""} onChange={(e) => update(i, `ventas_alta_${seg}` as keyof VentaRow, Number(e.target.value))} /></TableCell>
                      <TableCell key={`${seg}_b_${i}`}><Input type="number" min={0} step="any" className="h-7 w-16 text-xs text-right" value={(r[`ventas_baja_${seg}` as keyof VentaRow] as number) || ""} onChange={(e) => update(i, `ventas_baja_${seg}` as keyof VentaRow, Number(e.target.value))} /></TableCell>
                    </>
                  ))}
                  <TableCell className="text-right text-xs font-bold">{totalVentas(r).toLocaleString()}</TableCell>
                  <TableCell>
                    {rows.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Agregar fila</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Guardar sección
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
