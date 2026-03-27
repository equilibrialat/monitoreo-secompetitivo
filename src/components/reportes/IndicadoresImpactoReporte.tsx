import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

function fmt(n: number | null | undefined) { return n == null ? "—" : n.toLocaleString("es-PE"); }
function pct(n: number, d: number) { return d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—"; }

function exportCSV(headers: string[], rows: any[][], filename: string) {
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function FilterBar({ entidades, anios, periodos, filters, setFilters }: any) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filters.entidad} onChange={e => setFilters({ ...filters, entidad: e.target.value })}>
        <option value="">Todas las entidades</option>
        {entidades.map((e: any) => <option key={e.id} value={e.id}>{e.nombre_corto}</option>)}
      </select>
      <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filters.anio} onChange={e => setFilters({ ...filters, anio: e.target.value })}>
        <option value="">Todos los años</option>
        {anios.map((a: number) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filters.periodo} onChange={e => setFilters({ ...filters, periodo: e.target.value })}>
        <option value="">Todos los períodos</option>
        {periodos.map((p: string) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}

function EmpleoTab({ entidades }: { entidades: any[] }) {
  const [data, setData] = useState<any[]>([]);
  const [filters, setFilters] = useState({ entidad: "", anio: "", periodo: "" });

  useEffect(() => {
    (async () => {
      const { data: d } = await (supabase as any).from("reporte_empleo").select("*");
      setData(d ?? []);
    })();
  }, []);

  const anios = useMemo(() => [...new Set(data.map(d => d.anio))].sort(), [data]);
  const periodos = useMemo(() => [...new Set(data.map(d => d.periodo))].sort(), [data]);

  const filtered = useMemo(() => {
    let f = data;
    if (filters.entidad) f = f.filter(r => r.entidad_id === filters.entidad);
    if (filters.anio) f = f.filter(r => String(r.anio) === filters.anio);
    if (filters.periodo) f = f.filter(r => r.periodo === filters.periodo);
    return f;
  }, [data, filters]);

  const totCreados = filtered.reduce((s, r) => s + (r.empleos_creados_total ?? 0), 0);
  const totRetenidos = filtered.reduce((s, r) => s + (r.empleos_retenidos_total ?? 0), 0);
  const totMejorados = filtered.reduce((s, r) => s + (r.empleos_mejorados_total ?? 0), 0);
  const totFem = filtered.reduce((s, r) => s + (r.empleos_creados_femenino ?? 0) + (r.empleos_retenidos_femenino ?? 0) + (r.empleos_mejorados_femenino ?? 0), 0);
  const totAll = totCreados + totRetenidos + totMejorados;

  const entName = (id: string) => entidades.find((e: any) => e.id === id)?.nombre_corto ?? id.slice(0, 8);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Empleos creados</p><p className="text-xl font-bold">{fmt(totCreados)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Retenidos</p><p className="text-xl font-bold">{fmt(totRetenidos)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Mejorados</p><p className="text-xl font-bold">{fmt(totMejorados)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">% Mujeres</p><p className="text-xl font-bold">{pct(totFem, totAll)}</p></CardContent></Card>
      </div>
      <FilterBar entidades={entidades} anios={anios} periodos={periodos} filters={filters} setFilters={setFilters} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Entidad</TableHead><TableHead>Año</TableHead><TableHead>Período</TableHead>
            <TableHead className="text-right">Creados</TableHead><TableHead className="text-right">Retenidos</TableHead>
            <TableHead className="text-right">Mejorados</TableHead><TableHead className="text-right">Fem.</TableHead><TableHead className="text-right">Masc.</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell>{entName(r.entidad_id)}</TableCell><TableCell>{r.anio}</TableCell><TableCell>{r.periodo}</TableCell>
                <TableCell className="text-right">{fmt(r.empleos_creados_total)}</TableCell>
                <TableCell className="text-right">{fmt(r.empleos_retenidos_total)}</TableCell>
                <TableCell className="text-right">{fmt(r.empleos_mejorados_total)}</TableCell>
                <TableCell className="text-right">{fmt((r.empleos_creados_femenino ?? 0) + (r.empleos_retenidos_femenino ?? 0) + (r.empleos_mejorados_femenino ?? 0))}</TableCell>
                <TableCell className="text-right">{fmt((r.empleos_creados_masculino ?? 0) + (r.empleos_retenidos_masculino ?? 0) + (r.empleos_mejorados_masculino ?? 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter><TableRow className="font-bold">
            <TableCell colSpan={3}>TOTALES</TableCell>
            <TableCell className="text-right">{fmt(totCreados)}</TableCell><TableCell className="text-right">{fmt(totRetenidos)}</TableCell>
            <TableCell className="text-right">{fmt(totMejorados)}</TableCell><TableCell className="text-right">{fmt(totFem)}</TableCell>
            <TableCell className="text-right">{fmt(totAll - totFem)}</TableCell>
          </TableRow></TableFooter>
        </Table>
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCSV(
          ["Entidad","Año","Período","Creados","Retenidos","Mejorados","Fem","Masc"],
          filtered.map(r => [entName(r.entidad_id), r.anio, r.periodo, r.empleos_creados_total, r.empleos_retenidos_total, r.empleos_mejorados_total,
            (r.empleos_creados_femenino??0)+(r.empleos_retenidos_femenino??0)+(r.empleos_mejorados_femenino??0),
            (r.empleos_creados_masculino??0)+(r.empleos_retenidos_masculino??0)+(r.empleos_mejorados_masculino??0)]),
          "empleo_consolidado.csv"
        )}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>
    </div>
  );
}

function GenericTab({ table, columns, kpiFn, entidades, filename }: {
  table: string; columns: { key: string; label: string; numeric?: boolean }[];
  kpiFn?: (data: any[]) => { label: string; value: string }[];
  entidades: any[]; filename: string;
}) {
  const [data, setData] = useState<any[]>([]);
  const [filters, setFilters] = useState({ entidad: "", anio: "", periodo: "" });

  useEffect(() => {
    (async () => {
      const { data: d } = await (supabase as any).from(table).select("*");
      setData(d ?? []);
    })();
  }, [table]);

  const anios = useMemo(() => [...new Set(data.map(d => d.anio))].sort(), [data]);
  const periodos = useMemo(() => [...new Set(data.map(d => d.periodo).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    let f = data;
    if (filters.entidad) f = f.filter(r => r.entidad_id === filters.entidad);
    if (filters.anio) f = f.filter(r => String(r.anio) === filters.anio);
    if (filters.periodo) f = f.filter(r => r.periodo === filters.periodo);
    return f;
  }, [data, filters]);

  const kpis = kpiFn ? kpiFn(filtered) : [];
  const entName = (id: string) => entidades.find((e: any) => e.id === id)?.nombre_corto ?? id.slice(0, 8);

  return (
    <div>
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {kpis.map(k => (
            <Card key={k.label}><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-xl font-bold">{k.value}</p></CardContent></Card>
          ))}
        </div>
      )}
      <FilterBar entidades={entidades} anios={anios} periodos={periodos} filters={filters} setFilters={setFilters} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Entidad</TableHead>
            {columns.map(c => <TableHead key={c.key} className={c.numeric ? "text-right" : ""}>{c.label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell>{entName(r.entidad_id)}</TableCell>
                {columns.map(c => <TableCell key={c.key} className={c.numeric ? "text-right" : ""}>{c.numeric ? fmt(r[c.key]) : (r[c.key] ?? "—")}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter><TableRow className="font-bold">
              <TableCell>TOTALES</TableCell>
              {columns.map(c => (
                <TableCell key={c.key} className={c.numeric ? "text-right" : ""}>
                  {c.numeric ? fmt(filtered.reduce((s, r) => s + (r[c.key] ?? 0), 0)) : ""}
                </TableCell>
              ))}
            </TableRow></TableFooter>
          )}
        </Table>
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCSV(
          ["Entidad", ...columns.map(c => c.label)],
          filtered.map(r => [entName(r.entidad_id), ...columns.map(c => r[c.key])]),
          filename
        )}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>
    </div>
  );
}

export default function IndicadoresImpactoReporte() {
  const [entidades, setEntidades] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("entidades").select("id, nombre_corto").order("nombre_corto");
      setEntidades(data ?? []);
    })();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Indicadores de Impacto — Consolidado</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="empleo">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="empleo">Empleo</TabsTrigger>
            <TabsTrigger value="productividad">Productividad</TabsTrigger>
            <TabsTrigger value="comercializacion">Comercialización</TabsTrigger>
            <TabsTrigger value="turismo">Turismo</TabsTrigger>
            <TabsTrigger value="capacitaciones">Capacitaciones</TabsTrigger>
            <TabsTrigger value="gobernanza">Gobernanza</TabsTrigger>
          </TabsList>

          <TabsContent value="empleo"><EmpleoTab entidades={entidades} /></TabsContent>

          <TabsContent value="productividad">
            <GenericTab table="reporte_productividad" entidades={entidades} filename="productividad.csv"
              columns={[
                { key: "organizacion_productores", label: "Organización" },
                { key: "num_productores", label: "Productores", numeric: true },
                { key: "superficie_has", label: "Superficie (ha)", numeric: true },
                { key: "produccion_campo_tn", label: "Producción (TN)", numeric: true },
                { key: "productividad_tn_ha", label: "Productividad TN/ha", numeric: true },
                { key: "produccion_exportable_tn", label: "Exportable (TN)", numeric: true },
              ]}
              kpiFn={data => {
                const totalProd = data.reduce((s, r) => s + (r.num_productores ?? 0), 0);
                const totalHa = data.reduce((s, r) => s + (r.superficie_has ?? 0), 0);
                const totalTn = data.reduce((s, r) => s + (r.produccion_campo_tn ?? 0), 0);
                return [
                  { label: "Total productores", value: fmt(totalProd) },
                  { label: "Superficie total (ha)", value: fmt(totalHa) },
                  { label: "Producción total (TN)", value: fmt(totalTn) },
                  { label: "Productividad promedio", value: totalHa > 0 ? (totalTn / totalHa).toFixed(2) + " TN/ha" : "—" },
                ];
              }}
            />
          </TabsContent>

          <TabsContent value="comercializacion">
            <GenericTab table="reporte_comercial" entidades={entidades} filename="comercializacion.csv"
              columns={[
                { key: "nombre_organizacion", label: "Organización" },
                { key: "cadena_valor", label: "Cadena" },
                { key: "valor_fob_total", label: "FOB Total (USD)", numeric: true },
                { key: "kg_total", label: "Kg Total", numeric: true },
                { key: "ventas_nac_total", label: "Ventas Nac (USD)", numeric: true },
              ]}
              kpiFn={data => [
                { label: "FOB Total (USD)", value: fmt(data.reduce((s, r) => s + (r.valor_fob_total ?? 0), 0)) },
                { label: "Kg Total", value: fmt(data.reduce((s, r) => s + (r.kg_total ?? 0), 0)) },
                { label: "Ventas Nac Total", value: fmt(data.reduce((s, r) => s + (r.ventas_nac_total ?? 0), 0)) },
                { label: "Organizaciones", value: String(data.length) },
              ]}
            />
          </TabsContent>

          <TabsContent value="turismo">
            <GenericTab table="reporte_turismo_atractivos" entidades={entidades} filename="turismo.csv"
              columns={[
                { key: "nombre_atractivo", label: "Atractivo" },
                { key: "destino", label: "Destino" },
                { key: "tours_alta", label: "Tours Alta", numeric: true },
                { key: "visitantes_alta", label: "Visit. Alta", numeric: true },
                { key: "ventas_alta", label: "Ventas Alta", numeric: true },
                { key: "tours_baja", label: "Tours Baja", numeric: true },
                { key: "visitantes_baja", label: "Visit. Baja", numeric: true },
                { key: "ventas_baja", label: "Ventas Baja", numeric: true },
              ]}
              kpiFn={data => [
                { label: "Total tours", value: fmt(data.reduce((s, r) => s + (r.tours_alta ?? 0) + (r.tours_baja ?? 0), 0)) },
                { label: "Total visitantes", value: fmt(data.reduce((s, r) => s + (r.visitantes_alta ?? 0) + (r.visitantes_baja ?? 0), 0)) },
                { label: "Total ventas", value: fmt(data.reduce((s, r) => s + (r.ventas_alta ?? 0) + (r.ventas_baja ?? 0), 0)) },
              ]}
            />
          </TabsContent>

          <TabsContent value="capacitaciones">
            <GenericTab table="registro_capacitaciones" entidades={entidades} filename="capacitaciones.csv"
              columns={[
                { key: "nombre_accion_formativa", label: "Acción Formativa" },
                { key: "tema", label: "Tema" },
                { key: "modalidad", label: "Modalidad" },
                { key: "total_participantes", label: "Total", numeric: true },
                { key: "participantes_masculino", label: "Masc.", numeric: true },
                { key: "participantes_femenino", label: "Fem.", numeric: true },
                { key: "departamento", label: "Departamento" },
              ]}
              kpiFn={data => {
                const tot = data.reduce((s, r) => s + (r.total_participantes ?? 0), 0);
                const fem = data.reduce((s, r) => s + (r.participantes_femenino ?? 0), 0);
                return [
                  { label: "Capacitaciones", value: String(data.length) },
                  { label: "Total participantes", value: fmt(tot) },
                  { label: "% Mujeres", value: pct(fem, tot) },
                ];
              }}
            />
          </TabsContent>

          <TabsContent value="gobernanza">
            <GenericTab table="reporte_gobernanza" entidades={entidades} filename="gobernanza.csv"
              columns={[
                { key: "nombre_organizacion", label: "Organización" },
                { key: "tipo_organizacion", label: "Tipo" },
                { key: "departamento", label: "Departamento" },
                { key: "cadena_valor", label: "Cadena" },
              ]}
              kpiFn={data => {
                const fi = data.filter(r => r.fort_institucional).length;
                const bp = data.filter(r => r.buenas_practicas_sostenibilidad).length;
                return [
                  { label: "Organizaciones", value: String(data.length) },
                  { label: "Fort. Institucional", value: String(fi) },
                  { label: "Buenas Prácticas", value: String(bp) },
                ];
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
