import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fetchByPeriodo, upsertRows } from "@/lib/indicadoresImpacto";

interface EmpleoRow {
  id?: string;
  tipo_empleo: "creado" | "retenido" | "mejorado";
  tipo_actividad: string;
  total: number;
  masculino: number;
  femenino: number;
  region: string;
}

interface IngresoData {
  ingreso_promedio_lb: number;
  ingreso_promedio_intermedia: number;
  ingreso_promedio_final: number;
}

const TIPOS_ACTIVIDAD = ["Manejo de finca", "Post-cosecha", "Agroindustria", "Turismo"];
const TIPOS_EMPLEO: { key: "creado" | "retenido" | "mejorado"; label: string }[] = [
  { key: "creado", label: "Empleos Creados" },
  { key: "retenido", label: "Empleos Retenidos" },
  { key: "mejorado", label: "Empleos Mejorados" },
];

interface Props {
  entidadId: string;
  anio: number;
  periodo: string;
  cadenaValor: string;
  onSaved: () => void;
  onDirty?: () => void;
}

function mapRowToDb(row: any, entidadId: string, anio: number, periodo: string, cadenaValor: string) {
  const tipoMap: Record<string, string> = {
    "Manejo de finca": "manejo_finca",
    "Post-cosecha": "post_cosecha",
    "Agroindustria": "agroindustria",
    "Turismo": "turismo",
  };
  const base: any = {
    entidad_id: entidadId,
    anio,
    periodo,
    cadena_valor: cadenaValor,
    temporada: "anual",
  };
  if (row.id) base.id = row.id;

  if (row.tipo_empleo === "creado") {
    const act = tipoMap[row.tipo_actividad] || row.tipo_actividad;
    base[`empleos_creados_${act}`] = row.total;
    base.empleos_creados_total = row.total;
    base.empleos_creados_masculino = row.masculino;
    base.empleos_creados_femenino = row.femenino;
    base.region_empleo_creado = row.region;
  } else if (row.tipo_empleo === "retenido") {
    const act = tipoMap[row.tipo_actividad] || row.tipo_actividad;
    base[`empleos_retenidos_${act}`] = row.total;
    base.empleos_retenidos_total = row.total;
    base.empleos_retenidos_masculino = row.masculino;
    base.empleos_retenidos_femenino = row.femenino;
    base.region_empleo_retenido = row.region;
  } else {
    base.empleos_mejorados_total = row.total;
    base.empleos_mejorados_masculino = row.masculino;
    base.empleos_mejorados_femenino = row.femenino;
    base.region_empleo_mejorado = row.region;
  }
  return base;
}

export function SeccionEmpleo({ entidadId, anio, periodo, cadenaValor, onSaved }: Props) {
  const [rows, setRows] = useState<EmpleoRow[]>([]);
  const [ingresos, setIngresos] = useState<IngresoData>({ ingreso_promedio_lb: 0, ingreso_promedio_intermedia: 0, ingreso_promedio_final: 0 });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchByPeriodo("reporte_empleo", entidadId, anio, periodo);
      if (data.length > 0) {
        // Flatten DB rows back into UI rows
        const uiRows: EmpleoRow[] = [];
        for (const d of data) {
          if (d.empleos_creados_total > 0) {
            uiRows.push({ id: d.id, tipo_empleo: "creado", tipo_actividad: "Manejo de finca", total: d.empleos_creados_total ?? 0, masculino: d.empleos_creados_masculino ?? 0, femenino: d.empleos_creados_femenino ?? 0, region: d.region_empleo_creado ?? "" });
          }
          if (d.empleos_retenidos_total > 0) {
            uiRows.push({ id: d.id + "_ret", tipo_empleo: "retenido", tipo_actividad: "Manejo de finca", total: d.empleos_retenidos_total ?? 0, masculino: d.empleos_retenidos_masculino ?? 0, femenino: d.empleos_retenidos_femenino ?? 0, region: d.region_empleo_retenido ?? "" });
          }
          if (d.empleos_mejorados_total > 0) {
            uiRows.push({ id: d.id + "_mej", tipo_empleo: "mejorado", tipo_actividad: "", total: d.empleos_mejorados_total ?? 0, masculino: d.empleos_mejorados_masculino ?? 0, femenino: d.empleos_mejorados_femenino ?? 0, region: d.region_empleo_mejorado ?? "" });
          }
          setIngresos({
            ingreso_promedio_lb: d.ingreso_promedio_lb ?? 0,
            ingreso_promedio_intermedia: d.ingreso_promedio_intermedia ?? 0,
            ingreso_promedio_final: d.ingreso_promedio_final ?? 0,
          });
        }
        if (uiRows.length > 0) setRows(uiRows);
      }
      if (rows.length === 0 && data.length === 0) {
        const defaults: EmpleoRow[] = [];
        for (const tipo of TIPOS_EMPLEO) {
          for (const act of TIPOS_ACTIVIDAD) {
            defaults.push({ tipo_empleo: tipo.key, tipo_actividad: act, total: 0, masculino: 0, femenino: 0, region: "" });
          }
        }
        setRows(defaults);
      }
      setLoaded(true);
    }
    load();
  }, [entidadId, anio, periodo]);

  const updateRow = (index: number, field: keyof EmpleoRow, value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "masculino" || field === "femenino") {
        copy[index].total = (copy[index].masculino || 0) + (copy[index].femenino || 0);
      }
      return copy;
    });
  };

  const handleSave = async () => {
    // Validate hombres + mujeres = total
    for (const r of rows) {
      if (r.total > 0 && r.total !== r.masculino + r.femenino) {
        toast.error("Validación", { description: `Total debe ser = Hombres + Mujeres para ${r.tipo_actividad}` });
        return;
      }
    }
    setSaving(true);
    // Aggregate into one DB row
    const dbRow: any = {
      entidad_id: entidadId,
      anio,
      periodo,
      cadena_valor: cadenaValor,
      temporada: "anual",
      estado_registro: "borrador",
      ...ingresos,
      variacion_ingresos: ingresos.ingreso_promedio_lb > 0
        ? Math.round(((ingresos.ingreso_promedio_final - ingresos.ingreso_promedio_lb) / ingresos.ingreso_promedio_lb) * 10000) / 100
        : 0,
      empleos_creados_total: 0, empleos_creados_masculino: 0, empleos_creados_femenino: 0,
      empleos_creados_manejo_finca: 0, empleos_creados_post_cosecha: 0, empleos_creados_agroindustria: 0, empleos_creados_turismo: 0,
      region_empleo_creado: "",
      empleos_retenidos_total: 0, empleos_retenidos_masculino: 0, empleos_retenidos_femenino: 0,
      empleos_retenidos_manejo_finca: 0, empleos_retenidos_post_cosecha: 0, empleos_retenidos_agroindustria: 0, empleos_retenidos_turismo: 0,
      region_empleo_retenido: "",
      empleos_mejorados_total: 0, empleos_mejorados_masculino: 0, empleos_mejorados_femenino: 0,
      empleos_mejorados_manejo_finca: 0, empleos_mejorados_post_cosecha: 0, empleos_mejorados_agroindustria: 0, empleos_mejorados_turismo: 0,
      region_empleo_mejorado: "",
      total_empleos: 0,
    };

    const actFieldMap: Record<string, string> = {
      "Manejo de finca": "manejo_finca", "Post-cosecha": "post_cosecha",
      "Agroindustria": "agroindustria", "Turismo": "turismo",
    };

    for (const r of rows) {
      if (r.tipo_empleo === "creado") {
        dbRow.empleos_creados_total += r.total;
        dbRow.empleos_creados_masculino += r.masculino;
        dbRow.empleos_creados_femenino += r.femenino;
        const f = actFieldMap[r.tipo_actividad];
        if (f) dbRow[`empleos_creados_${f}`] = (dbRow[`empleos_creados_${f}`] || 0) + r.total;
        if (r.region) dbRow.region_empleo_creado = r.region;
      } else if (r.tipo_empleo === "retenido") {
        dbRow.empleos_retenidos_total += r.total;
        dbRow.empleos_retenidos_masculino += r.masculino;
        dbRow.empleos_retenidos_femenino += r.femenino;
        const f = actFieldMap[r.tipo_actividad];
        if (f) dbRow[`empleos_retenidos_${f}`] = (dbRow[`empleos_retenidos_${f}`] || 0) + r.total;
        if (r.region) dbRow.region_empleo_retenido = r.region;
      } else {
        dbRow.empleos_mejorados_total += r.total;
        dbRow.empleos_mejorados_masculino += r.masculino;
        dbRow.empleos_mejorados_femenino += r.femenino;
        const f = actFieldMap[r.tipo_actividad];
        if (f) dbRow[`empleos_mejorados_${f}`] = (dbRow[`empleos_mejorados_${f}`] || 0) + r.total;
        if (r.region) dbRow.region_empleo_mejorado = r.region;
      }
    }
    dbRow.total_empleos = dbRow.empleos_creados_total + dbRow.empleos_retenidos_total + dbRow.empleos_mejorados_total;

    // Check if existing row
    const existing = await fetchByPeriodo("reporte_empleo", entidadId, anio, periodo);
    if (existing.length > 0) dbRow.id = existing[0].id;

    const result = await upsertRows("reporte_empleo", [dbRow]);
    setSaving(false);
    if (result.success) { toast.success("Sección Empleo guardada"); onSaved(); }
    else toast.error("Error", { description: result.error });
  };

  const variacion = ingresos.ingreso_promedio_lb > 0
    ? Math.round(((ingresos.ingreso_promedio_final - ingresos.ingreso_promedio_lb) / ingresos.ingreso_promedio_lb) * 100)
    : 0;

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">📊 Sección 1 — Empleo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {TIPOS_EMPLEO.map((tipo) => {
          const tipoRows = rows.filter((r) => r.tipo_empleo === tipo.key);
          const totals = tipoRows.reduce((s, r) => ({ total: s.total + r.total, m: s.m + r.masculino, f: s.f + r.femenino }), { total: 0, m: 0, f: 0 });
          return (
            <div key={tipo.key} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">{tipo.label}</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Hombres</TableHead>
                      <TableHead className="text-xs text-right">Mujeres</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs">Región</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tipoRows.map((r) => {
                      const idx = rows.indexOf(r);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-medium">{r.tipo_actividad || tipo.label}</TableCell>
                          <TableCell className="text-right">
                            <Input type="number" min={0} className="h-7 w-20 text-xs text-right ml-auto" value={r.masculino || ""} onChange={(e) => updateRow(idx, "masculino", Number(e.target.value))} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input type="number" min={0} className="h-7 w-20 text-xs text-right ml-auto" value={r.femenino || ""} onChange={(e) => updateRow(idx, "femenino", Number(e.target.value))} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs font-bold">{r.total}</span>
                            {r.total > 0 && r.total !== r.masculino + r.femenino && (
                              <AlertTriangle className="h-3 w-3 text-warning inline ml-1" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 w-28 text-xs" value={r.region} onChange={(e) => updateRow(idx, "region", e.target.value)} placeholder="Región" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">{totals.m}</TableCell>
                      <TableCell className="text-xs text-right">{totals.f}</TableCell>
                      <TableCell className="text-xs text-right">{totals.total}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}

        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Ingresos Promedio</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Línea base (USD)</Label>
              <Input type="number" min={0} className="h-8 text-xs" value={ingresos.ingreso_promedio_lb || ""} onChange={(e) => setIngresos((p) => ({ ...p, ingreso_promedio_lb: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Intermedia (USD)</Label>
              <Input type="number" min={0} className="h-8 text-xs" value={ingresos.ingreso_promedio_intermedia || ""} onChange={(e) => setIngresos((p) => ({ ...p, ingreso_promedio_intermedia: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Final (USD)</Label>
              <Input type="number" min={0} className="h-8 text-xs" value={ingresos.ingreso_promedio_final || ""} onChange={(e) => setIngresos((p) => ({ ...p, ingreso_promedio_final: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Variación</Label>
              <div className={`h-8 flex items-center px-2 rounded-md border text-xs font-bold ${variacion > 0 ? "text-success bg-success/10" : variacion < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted"}`}>
                {variacion > 0 ? "+" : ""}{variacion}%
              </div>
            </div>
          </div>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Guardar sección
        </Button>
      </CardContent>
    </Card>
  );
}
