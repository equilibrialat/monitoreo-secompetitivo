import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchByAnio, upsertRows, deleteRows } from "@/lib/indicadoresImpacto";

interface ComRow {
  id?: string;
  ruc: string;
  nombre_organizacion: string;
  tipo: string;
  partida_arancelaria: string;
  nombre_partida: string;
  valor_fob_primarios: number;
  valor_fob_derivados: number;
  kg_primarios: number;
  kg_derivados: number;
  region_origen: string;
  mercados_destino_intl: string;
}

interface Props {
  entidadId: string;
  anio: number;
  cadenaValor: string;
  onSaved: () => void;
}

const empty = (): ComRow => ({
  ruc: "", nombre_organizacion: "", tipo: "", partida_arancelaria: "", nombre_partida: "",
  valor_fob_primarios: 0, valor_fob_derivados: 0, kg_primarios: 0, kg_derivados: 0,
  region_origen: "", mercados_destino_intl: "",
});

export function SeccionComercializacion({ entidadId, anio, cadenaValor, onSaved }: Props) {
  const [rows, setRows] = useState<ComRow[]>([empty()]);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchByAnio("reporte_comercial", entidadId, anio);
      if (data.length > 0) {
        setRows(data.map((d: any): ComRow => ({
          id: d.id, ruc: d.ruc ?? "", nombre_organizacion: d.nombre_organizacion ?? "",
          tipo: d.tipo ?? "", partida_arancelaria: d.partida_arancelaria ?? "",
          nombre_partida: d.nombre_partida ?? "",
          valor_fob_primarios: d.valor_fob_primarios ?? 0, valor_fob_derivados: d.valor_fob_derivados ?? 0,
          kg_primarios: d.kg_primarios ?? 0, kg_derivados: d.kg_derivados ?? 0,
          region_origen: d.region_origen ?? "", mercados_destino_intl: d.mercados_destino_intl ?? "",
        })));
      }
    }
    load();
  }, [entidadId, anio]);

  const update = (i: number, f: keyof ComRow, v: any) => {
    setRows((p) => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  };
  const addRow = () => setRows((p) => [...p, empty()]);
  const removeRow = (i: number) => {
    if (rows[i].id) setDeletedIds((p) => [...p, rows[i].id!]);
    setRows((p) => p.filter((_, idx) => idx !== i));
  };

  const totals = rows.reduce((s, r) => ({
    fob_p: s.fob_p + r.valor_fob_primarios, fob_d: s.fob_d + r.valor_fob_derivados,
    kg_p: s.kg_p + r.kg_primarios, kg_d: s.kg_d + r.kg_derivados,
  }), { fob_p: 0, fob_d: 0, kg_p: 0, kg_d: 0 });

  const handleSave = async () => {
    setSaving(true);
    await deleteRows("reporte_comercial", deletedIds);
    const dbRows = rows.filter((r) => r.nombre_organizacion.trim()).map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      entidad_id: entidadId, anio, cadena_valor: cadenaValor,
      ruc: r.ruc, nombre_organizacion: r.nombre_organizacion, tipo: r.tipo,
      partida_arancelaria: r.partida_arancelaria, nombre_partida: r.nombre_partida,
      valor_fob_primarios: r.valor_fob_primarios, valor_fob_derivados: r.valor_fob_derivados,
      valor_fob_total: r.valor_fob_primarios + r.valor_fob_derivados,
      kg_primarios: r.kg_primarios, kg_derivados: r.kg_derivados,
      kg_total: r.kg_primarios + r.kg_derivados,
      region_origen: r.region_origen, mercados_destino_intl: r.mercados_destino_intl,
      estado_registro: "borrador",
    }));
    const result = await upsertRows("reporte_comercial", dbRows);
    setSaving(false); setDeletedIds([]);
    if (result.success) { toast.success("Sección Comercialización guardada"); onSaved(); }
    else toast.error("Error", { description: result.error });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">📦 Sección 3 — Comercialización</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">RUC</TableHead>
                <TableHead className="text-[10px]">Organización</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px] text-right">FOB Prim.</TableHead>
                <TableHead className="text-[10px] text-right">FOB Deriv.</TableHead>
                <TableHead className="text-[10px] text-right">Total FOB</TableHead>
                <TableHead className="text-[10px] text-right">Kg Prim.</TableHead>
                <TableHead className="text-[10px] text-right">Kg Deriv.</TableHead>
                <TableHead className="text-[10px] text-right">Kg Total</TableHead>
                <TableHead className="text-[10px]">Región</TableHead>
                <TableHead className="text-[10px] w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell><Input className="h-7 text-xs w-24" value={r.ruc} onChange={(e) => update(i, "ruc", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs min-w-[120px]" value={r.nombre_organizacion} onChange={(e) => update(i, "nombre_organizacion", e.target.value)} placeholder="Nombre" /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-20" value={r.tipo} onChange={(e) => update(i, "tipo", e.target.value)} /></TableCell>
                  <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.valor_fob_primarios || ""} onChange={(e) => update(i, "valor_fob_primarios", Number(e.target.value))} /></TableCell>
                  <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.valor_fob_derivados || ""} onChange={(e) => update(i, "valor_fob_derivados", Number(e.target.value))} /></TableCell>
                  <TableCell className="text-right text-xs font-bold">{(r.valor_fob_primarios + r.valor_fob_derivados).toLocaleString()}</TableCell>
                  <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.kg_primarios || ""} onChange={(e) => update(i, "kg_primarios", Number(e.target.value))} /></TableCell>
                  <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.kg_derivados || ""} onChange={(e) => update(i, "kg_derivados", Number(e.target.value))} /></TableCell>
                  <TableCell className="text-right text-xs font-bold">{(r.kg_primarios + r.kg_derivados).toLocaleString()}</TableCell>
                  <TableCell><Input className="h-7 text-xs w-24" value={r.region_origen} onChange={(e) => update(i, "region_origen", e.target.value)} /></TableCell>
                  <TableCell>
                    {rows.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-xs">Totales</TableCell>
                <TableCell className="text-xs text-right">{totals.fob_p.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">{totals.fob_d.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-bold">{(totals.fob_p + totals.fob_d).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">{totals.kg_p.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">{totals.kg_d.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-bold">{(totals.kg_p + totals.kg_d).toLocaleString()}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
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
