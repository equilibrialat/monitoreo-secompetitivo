import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchByPeriodo, upsertRows, deleteRows } from "@/lib/indicadoresImpacto";

interface GobRow {
  id?: string;
  nombre_organizacion: string;
  tipo_organizacion: string;
  departamento: string;
  cadena_valor: string;
  fort_institucional: boolean;
  estructura_org_eficiente: boolean;
  acceso_mercado_financiamiento: boolean;
  articulacion_representacion: boolean;
  buenas_practicas_sostenibilidad: boolean;
}

interface Props {
  entidadId: string;
  anio: number;
  periodo: string;
  cadenaValor: string;
  sectionNumber: number;
  onSaved: () => void;
}

const empty = (cv: string): GobRow => ({
  nombre_organizacion: "", tipo_organizacion: "", departamento: "", cadena_valor: cv,
  fort_institucional: false, estructura_org_eficiente: false,
  acceso_mercado_financiamiento: false, articulacion_representacion: false,
  buenas_practicas_sostenibilidad: false,
});

const CHECKS: { key: keyof GobRow; label: string }[] = [
  { key: "fort_institucional", label: "Fort. institucional" },
  { key: "estructura_org_eficiente", label: "Estructura org." },
  { key: "acceso_mercado_financiamiento", label: "Mercado/financ." },
  { key: "articulacion_representacion", label: "Articulación" },
  { key: "buenas_practicas_sostenibilidad", label: "Buenas prácticas" },
];

export function SeccionGobernanza({ entidadId, anio, periodo, cadenaValor, sectionNumber, onSaved }: Props) {
  const [rows, setRows] = useState<GobRow[]>([empty(cadenaValor)]);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchByPeriodo("reporte_gobernanza", entidadId, anio, periodo);
      if (data.length > 0) {
        setRows(data.map((d: any): GobRow => ({
          id: d.id, nombre_organizacion: d.nombre_organizacion ?? "",
          tipo_organizacion: d.tipo_organizacion ?? "", departamento: d.departamento ?? "",
          cadena_valor: d.cadena_valor ?? cadenaValor,
          fort_institucional: d.fort_institucional ?? false,
          estructura_org_eficiente: d.estructura_org_eficiente ?? false,
          acceso_mercado_financiamiento: d.acceso_mercado_financiamiento ?? false,
          articulacion_representacion: d.articulacion_representacion ?? false,
          buenas_practicas_sostenibilidad: d.buenas_practicas_sostenibilidad ?? false,
        })));
      }
    }
    load();
  }, [entidadId, anio, periodo]);

  const update = (i: number, f: keyof GobRow, v: any) => {
    setRows((p) => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  };
  const addRow = () => setRows((p) => [...p, empty(cadenaValor)]);
  const removeRow = (i: number) => {
    if (rows[i].id) setDeletedIds((p) => [...p, rows[i].id!]);
    setRows((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    await deleteRows("reporte_gobernanza", deletedIds);
    const dbRows = rows.filter((r) => r.nombre_organizacion.trim()).map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      entidad_id: entidadId, anio, periodo,
      nombre_organizacion: r.nombre_organizacion,
      tipo_organizacion: r.tipo_organizacion,
      departamento: r.departamento,
      cadena_valor: r.cadena_valor,
      fort_institucional: r.fort_institucional,
      estructura_org_eficiente: r.estructura_org_eficiente,
      acceso_mercado_financiamiento: r.acceso_mercado_financiamiento,
      articulacion_representacion: r.articulacion_representacion,
      buenas_practicas_sostenibilidad: r.buenas_practicas_sostenibilidad,
      estado_registro: "borrador",
    }));
    const result = await upsertRows("reporte_gobernanza", dbRows);
    setSaving(false); setDeletedIds([]);
    if (result.success) { toast.success("Sección Gobernanza guardada"); onSaved(); }
    else toast.error("Error", { description: result.error });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">🏛️ Sección {sectionNumber} — Gobernanza</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Organización</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px]">Dpto.</TableHead>
                <TableHead className="text-[10px]">Cadena</TableHead>
                {CHECKS.map((c) => (
                  <TableHead key={c.key} className="text-[10px] text-center">{c.label}</TableHead>
                ))}
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell><Input className="h-7 text-xs min-w-[120px]" value={r.nombre_organizacion} onChange={(e) => update(i, "nombre_organizacion", e.target.value)} placeholder="Nombre" /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-24" value={r.tipo_organizacion} onChange={(e) => update(i, "tipo_organizacion", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-24" value={r.departamento} onChange={(e) => update(i, "departamento", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-20" value={r.cadena_valor} onChange={(e) => update(i, "cadena_valor", e.target.value)} /></TableCell>
                  {CHECKS.map((c) => (
                    <TableCell key={c.key} className="text-center">
                      <Checkbox checked={r[c.key] as boolean} onCheckedChange={(v) => update(i, c.key, !!v)} />
                    </TableCell>
                  ))}
                  <TableCell>
                    {rows.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    )}
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
