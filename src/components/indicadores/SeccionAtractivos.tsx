import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchByPeriodo, upsertRows, deleteRows } from "@/lib/indicadoresImpacto";

interface AtrRow {
  id?: string;
  nombre_atractivo: string;
  destino: string;
  tours_alta: number;
  tours_baja: number;
  visitantes_alta: number;
  visitantes_baja: number;
  ventas_alta: number;
  ventas_baja: number;
}

interface Props {
  entidadId: string;
  anio: number;
  periodo: string;
  onSaved: () => void;
}

const empty = (): AtrRow => ({
  nombre_atractivo: "", destino: "",
  tours_alta: 0, tours_baja: 0,
  visitantes_alta: 0, visitantes_baja: 0,
  ventas_alta: 0, ventas_baja: 0,
});

export function SeccionAtractivos({ entidadId, anio, periodo, onSaved }: Props) {
  const [rows, setRows] = useState<AtrRow[]>([empty()]);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchByPeriodo("reporte_turismo_atractivos", entidadId, anio, periodo);
      if (data.length > 0) {
        setRows(data.map((d: any): AtrRow => ({
          id: d.id, nombre_atractivo: d.nombre_atractivo ?? "", destino: d.destino ?? "",
          tours_alta: d.tours_alta ?? 0, tours_baja: d.tours_baja ?? 0,
          visitantes_alta: d.visitantes_alta ?? 0, visitantes_baja: d.visitantes_baja ?? 0,
          ventas_alta: d.ventas_alta ?? 0, ventas_baja: d.ventas_baja ?? 0,
        })));
      }
    }
    load();
  }, [entidadId, anio, periodo]);

  const update = (i: number, f: keyof AtrRow, v: any) => {
    setRows((p) => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  };
  const addRow = () => setRows((p) => [...p, empty()]);
  const removeRow = (i: number) => {
    if (rows[i].id) setDeletedIds((p) => [...p, rows[i].id!]);
    setRows((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    await deleteRows("reporte_turismo_atractivos", deletedIds);
    const dbRows = rows.filter((r) => r.nombre_atractivo.trim()).map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      entidad_id: entidadId, anio, periodo,
      nombre_atractivo: r.nombre_atractivo, destino: r.destino,
      tours_alta: r.tours_alta, tours_baja: r.tours_baja,
      visitantes_alta: r.visitantes_alta, visitantes_baja: r.visitantes_baja,
      ventas_alta: r.ventas_alta, ventas_baja: r.ventas_baja,
      estado_registro: "borrador",
    }));
    const result = await upsertRows("reporte_turismo_atractivos", dbRows);
    setSaving(false); setDeletedIds([]);
    if (result.success) { toast.success("Sección Atractivos guardada"); onSaved(); }
    else toast.error("Error", { description: result.error });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">🏔️ Sección 3 — Atractivos Turísticos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Atractivo</TableHead>
                <TableHead className="text-[10px]">Destino</TableHead>
                <TableHead className="text-[10px] text-right">Tours Alta</TableHead>
                <TableHead className="text-[10px] text-right">Tours Baja</TableHead>
                <TableHead className="text-[10px] text-right">Visitantes Alta</TableHead>
                <TableHead className="text-[10px] text-right">Visitantes Baja</TableHead>
                <TableHead className="text-[10px] text-right">Ventas Alta</TableHead>
                <TableHead className="text-[10px] text-right">Ventas Baja</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell><Input className="h-7 text-xs min-w-[120px]" value={r.nombre_atractivo} onChange={(e) => update(i, "nombre_atractivo", e.target.value)} placeholder="Nombre" /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-24" value={r.destino} onChange={(e) => update(i, "destino", e.target.value)} /></TableCell>
                  <TableCell><Input type="number" min={0} className="h-7 w-16 text-xs text-right ml-auto" value={r.tours_alta || ""} onChange={(e) => update(i, "tours_alta", Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" min={0} className="h-7 w-16 text-xs text-right ml-auto" value={r.tours_baja || ""} onChange={(e) => update(i, "tours_baja", Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" min={0} className="h-7 w-16 text-xs text-right ml-auto" value={r.visitantes_alta || ""} onChange={(e) => update(i, "visitantes_alta", Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" min={0} className="h-7 w-16 text-xs text-right ml-auto" value={r.visitantes_baja || ""} onChange={(e) => update(i, "visitantes_baja", Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.ventas_alta || ""} onChange={(e) => update(i, "ventas_alta", Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.ventas_baja || ""} onChange={(e) => update(i, "ventas_baja", Number(e.target.value))} /></TableCell>
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
