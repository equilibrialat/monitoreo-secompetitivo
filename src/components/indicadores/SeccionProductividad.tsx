import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchByAnio, upsertRows, deleteRows } from "@/lib/indicadoresImpacto";

interface ProdRow {
  id?: string;
  organizacion_productores: string;
  region: string;
  num_productores: number;
  num_productores_masculino: number;
  num_productores_femenino: number;
  superficie_has: number;
  produccion_campo_tn: number;
  descarte_campo_tn: number;
  descarte_proceso_tn: number;
}

interface Props {
  entidadId: string;
  anio: number;
  cadenaValor: string;
  onSaved: () => void;
}

function calc(r: ProdRow) {
  const productividad = r.superficie_has > 0 ? Math.round((r.produccion_campo_tn / r.superficie_has) * 100) / 100 : 0;
  const totalDescarte = r.descarte_campo_tn + r.descarte_proceso_tn;
  const exportable = Math.max(r.produccion_campo_tn - totalDescarte, 0);
  const prodExportable = r.superficie_has > 0 ? Math.round((exportable / r.superficie_has) * 100) / 100 : 0;
  return { productividad, totalDescarte, exportable, prodExportable };
}

const emptyRow = (): ProdRow => ({
  organizacion_productores: "", region: "", num_productores: 0, num_productores_masculino: 0, num_productores_femenino: 0,
  superficie_has: 0, produccion_campo_tn: 0, descarte_campo_tn: 0, descarte_proceso_tn: 0,
});

export function SeccionProductividad({ entidadId, anio, cadenaValor, onSaved }: Props) {
  const [rows, setRows] = useState<ProdRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchByAnio("reporte_productividad", entidadId, anio);
      if (data.length > 0) {
        setRows(data.map((d: any) => ({
          id: d.id,
          organizacion_productores: d.organizacion_productores ?? "",
          region: d.region ?? "",
          num_productores: d.num_productores ?? 0,
          num_productores_masculino: d.num_productores_masculino ?? 0,
          num_productores_femenino: d.num_productores_femenino ?? 0,
          superficie_has: d.superficie_has ?? 0,
          produccion_campo_tn: d.produccion_campo_tn ?? 0,
          descarte_campo_tn: d.descarte_campo_tn ?? 0,
          descarte_proceso_tn: d.descarte_proceso_tn ?? 0,
        })));
      }
    }
    load();
  }, [entidadId, anio]);

  const update = (i: number, field: keyof ProdRow, value: any) => {
    setRows((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], [field]: value };
      if (field === "num_productores_masculino" || field === "num_productores_femenino") {
        c[i].num_productores = (c[i].num_productores_masculino || 0) + (c[i].num_productores_femenino || 0);
      }
      return c;
    });
  };
  };
  const addRow = () => setRows((p) => [...p, emptyRow()]);
  const removeRow = (i: number) => {
    const r = rows[i];
    if (r.id) setDeletedIds((p) => [...p, r.id!]);
    setRows((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    for (const r of rows) {
      if (r.num_productores > 0 && r.num_productores !== r.num_productores_masculino + r.num_productores_femenino) {
        toast.error("Validación", { description: `Total productores debe ser = Hombres + Mujeres en "${r.organizacion_productores}"` });
        return;
      }
    }
    setSaving(true);
    await deleteRows("reporte_productividad", deletedIds);
    const dbRows = rows.filter((r) => r.organizacion_productores.trim()).map((r) => {
      const c = calc(r);
      return {
        ...(r.id ? { id: r.id } : {}),
        entidad_id: entidadId,
        anio,
        cadena_valor: cadenaValor,
        organizacion_productores: r.organizacion_productores,
        region: r.region,
        num_productores: r.num_productores,
        num_productores_masculino: r.num_productores_masculino,
        num_productores_femenino: r.num_productores_femenino,
        superficie_has: r.superficie_has,
        produccion_campo_tn: r.produccion_campo_tn,
        productividad_tn_ha: c.productividad,
        descarte_campo_tn: r.descarte_campo_tn,
        descarte_proceso_tn: r.descarte_proceso_tn,
        total_descarte_tn: c.totalDescarte,
        produccion_exportable_tn: c.exportable,
        estado_registro: "borrador",
      };
    });
    const result = await upsertRows("reporte_productividad", dbRows);
    setSaving(false);
    setDeletedIds([]);
    if (result.success) { toast.success("Sección Productividad guardada"); onSaved(); }
    else toast.error("Error", { description: result.error });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">🌱 Sección 2 — Productividad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Organización</TableHead>
                <TableHead className="text-[10px]">Región</TableHead>
                <TableHead className="text-[10px] text-right">Hombres</TableHead>
                <TableHead className="text-[10px] text-right">Mujeres</TableHead>
                <TableHead className="text-[10px] text-right">Total Prod.</TableHead>
                <TableHead className="text-[10px] text-right">Sup. (ha)</TableHead>
                <TableHead className="text-[10px] text-right">Prod. (TN)</TableHead>
                <TableHead className="text-[10px] text-right">TN/ha</TableHead>
                <TableHead className="text-[10px] text-right">Desc. campo</TableHead>
                <TableHead className="text-[10px] text-right">Desc. proc.</TableHead>
                <TableHead className="text-[10px] text-right">Exportable</TableHead>
                <TableHead className="text-[10px] w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                const c = calc(r);
                const mismatch = r.num_productores > 0 && r.num_productores !== r.num_productores_masculino + r.num_productores_femenino;
                return (
                  <TableRow key={i}>
                    <TableCell><Input className="h-7 text-xs min-w-[140px]" value={r.organizacion_productores} onChange={(e) => update(i, "organizacion_productores", e.target.value)} placeholder="Nombre" /></TableCell>
                    <TableCell><Input className="h-7 text-xs w-24" value={r.region} onChange={(e) => update(i, "region", e.target.value)} /></TableCell>
                    <TableCell className="text-right"><Input type="number" min={0} className="h-7 w-16 text-xs text-right ml-auto" value={r.num_productores_masculino || ""} onChange={(e) => update(i, "num_productores_masculino", Number(e.target.value))} /></TableCell>
                    <TableCell className="text-right"><Input type="number" min={0} className="h-7 w-16 text-xs text-right ml-auto" value={r.num_productores_femenino || ""} onChange={(e) => update(i, "num_productores_femenino", Number(e.target.value))} /></TableCell>
                    <TableCell className={`text-right text-xs font-bold ${mismatch ? "text-destructive" : ""}`}>{r.num_productores}</TableCell>
                    <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.superficie_has || ""} onChange={(e) => update(i, "superficie_has", Number(e.target.value))} /></TableCell>
                    <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-20 text-xs text-right ml-auto" value={r.produccion_campo_tn || ""} onChange={(e) => update(i, "produccion_campo_tn", Number(e.target.value))} /></TableCell>
                    <TableCell className="text-right text-xs font-bold text-primary">{c.productividad}</TableCell>
                    <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-16 text-xs text-right ml-auto" value={r.descarte_campo_tn || ""} onChange={(e) => update(i, "descarte_campo_tn", Number(e.target.value))} /></TableCell>
                    <TableCell className="text-right"><Input type="number" min={0} step="any" className="h-7 w-16 text-xs text-right ml-auto" value={r.descarte_proceso_tn || ""} onChange={(e) => update(i, "descarte_proceso_tn", Number(e.target.value))} /></TableCell>
                    <TableCell className="text-right text-xs font-bold text-success">{c.exportable}</TableCell>
                    <TableCell>
                      {rows.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar organización
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Guardar sección
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
