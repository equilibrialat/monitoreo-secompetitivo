import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, ArrowUpDown, Search, Loader2, Bot, ChevronDown } from "lucide-react";
import { invokeAnalysis } from "@/lib/aiAnalysis";

interface TramaRow {
  item: number | null;
  cod_proy_e_iniciativa: string | null;
  cod_resultado: string | null;
  nombre_resultado: string | null;
  cod_producto: string | null;
  nombre_producto: string | null;
  c_actividad: string | null;
  n_actividad: string | null;
  actividad_hito: boolean | null;
  meta: number | null;
  unidad_de_medida: string | null;
  mes_anio_inicio_prog: string | null;
  mes_anio_fin_prog: string | null;
  valor_de_avance: number | null;
  estado: string | null;
  medio_verificacion: string | null;
  descripcion_de_avance: string | null;
  presupuesto_total: number | null;
  presupuesto_cofinanc_seco_p: number | null;
  aporte_contrapartida_monetaria_p: number | null;
  aporte_contrapartida_no_monetaria_p: number | null;
  ejecucion_presupuesto_cof_seco: number | null;
  ejecucion_presupuesto_contrapartida_monetaria: number | null;
  ejecucion_presupuesto_contrapartida_no_monetaria: number | null;
  pct_avance_cof_seco: number | null;
  pct_avance_cm: number | null;
  pct_avance_cnm: number | null;
  mecanismo: string | null;
  id_h2: string | null;
  fecha_corte: string | null;
}

type SortKey = keyof TramaRow;

function semaforo(pct: number | null) {
  if (pct == null) return null;
  const v = pct * 100;
  if (v > 66) return <Badge className="bg-green-600 text-white">{ v.toFixed(0) }%</Badge>;
  if (v >= 35) return <Badge className="bg-yellow-500 text-black">{ v.toFixed(0) }%</Badge>;
  return <Badge variant="destructive">{ v.toFixed(0) }%</Badge>;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportCSV(rows: TramaRow[]) {
  const headers = [
    "Item","Proyecto","Resultado","Producto","Cod Actividad","Actividad","Hito","Meta","Unidad",
    "Inicio","Fin","Avance","Estado","Ppto Total","Cof SECO","CM","CNM",
    "Ejec SECO","Ejec CM","Ejec CNM","% SECO","% CM","% CNM","Mecanismo"
  ];
  const csvRows = rows.map(r => [
    r.item, r.cod_proy_e_iniciativa, r.nombre_resultado, r.nombre_producto,
    r.c_actividad, r.n_actividad, r.actividad_hito ? "Sí" : "No",
    r.meta, r.unidad_de_medida, r.mes_anio_inicio_prog, r.mes_anio_fin_prog,
    r.valor_de_avance, r.estado, r.presupuesto_total,
    r.presupuesto_cofinanc_seco_p, r.aporte_contrapartida_monetaria_p,
    r.aporte_contrapartida_no_monetaria_p, r.ejecucion_presupuesto_cof_seco,
    r.ejecucion_presupuesto_contrapartida_monetaria,
    r.ejecucion_presupuesto_contrapartida_no_monetaria,
    r.pct_avance_cof_seco, r.pct_avance_cm, r.pct_avance_cnm, r.mecanismo
  ].map(v => `"${v ?? ""}"`).join(","));
  const blob = new Blob([headers.join(",") + "\n" + csvRows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "trama_fisico_financiera.csv"; a.click();
}

export default function TramaFisicoFinanciera() {
  const [rows, setRows] = useState<TramaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMecanismo, setFilterMecanismo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterResultado, setFilterResultado] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(true);

  const handleConsistency = async () => {
    if (!rows.length) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    const sample = rows.slice(0, 50).map((r) => ({
      codigo: r.c_actividad,
      actividad: r.n_actividad,
      proyecto: r.cod_proy_e_iniciativa,
      resultado: r.cod_resultado,
      meta: r.meta,
      avance: r.valor_de_avance,
      estado: r.estado,
      ppto_seco: r.presupuesto_cofinanc_seco_p,
      ejec_seco: r.ejecucion_presupuesto_cof_seco,
      pct_seco: r.pct_avance_cof_seco,
      mecanismo: r.mecanismo,
    }));
    const { resultado, error } = await invokeAnalysis("consistencia", { trama: sample });
    setAiLoading(false);
    if (error) setAiError(error);
    else setAiResult(resultado ?? null);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("v_trama_fisico_financiera").select("*");
      setRows((data ?? []) as TramaRow[]);
      setLoading(false);
    })();
  }, []);

  const mecanismos = useMemo(() => [...new Set(rows.map(r => r.mecanismo).filter(Boolean))], [rows]);
  const estados = useMemo(() => [...new Set(rows.map(r => r.estado).filter(Boolean))], [rows]);
  const resultados = useMemo(() => [...new Set(rows.map(r => r.cod_resultado).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    let f = rows;
    if (search) f = f.filter(r => (r.n_actividad ?? "").toLowerCase().includes(search.toLowerCase()));
    if (filterMecanismo) f = f.filter(r => r.mecanismo === filterMecanismo);
    if (filterEstado) f = f.filter(r => r.estado === filterEstado);
    if (filterResultado) f = f.filter(r => r.cod_resultado === filterResultado);
    if (sortKey) {
      f = [...f].sort((a, b) => {
        const va = a[sortKey]; const vb = b[sortKey];
        if (va == null && vb == null) return 0;
        if (va == null) return 1; if (vb == null) return -1;
        return (va < vb ? -1 : va > vb ? 1 : 0) * (sortAsc ? 1 : -1);
      });
    }
    return f;
  }, [rows, search, filterMecanismo, filterEstado, filterResultado, sortKey, sortAsc]);

  const totals = useMemo(() => ({
    presupuesto: filtered.reduce((s, r) => s + (r.presupuesto_total ?? 0), 0),
    ejSeco: filtered.reduce((s, r) => s + (r.ejecucion_presupuesto_cof_seco ?? 0), 0),
    ejCm: filtered.reduce((s, r) => s + (r.ejecucion_presupuesto_contrapartida_monetaria ?? 0), 0),
    ejCnm: filtered.reduce((s, r) => s + (r.ejecucion_presupuesto_contrapartida_no_monetaria ?? 0), 0),
    pptoSeco: filtered.reduce((s, r) => s + (r.presupuesto_cofinanc_seco_p ?? 0), 0),
  }), [filtered]);

  const pctGeneral = totals.pptoSeco > 0 ? (totals.ejSeco / totals.pptoSeco) : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </TableHead>
  );

  function isSobregiro(r: TramaRow) {
    return (r.ejecucion_presupuesto_cof_seco ?? 0) > (r.presupuesto_cofinanc_seco_p ?? 0) && (r.presupuesto_cofinanc_seco_p ?? 0) > 0;
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Cargando trama…</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg">Trama Físico-Financiera</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar actividad…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterMecanismo} onChange={e => setFilterMecanismo(e.target.value)}>
            <option value="">Mecanismo: Todos</option>
            {mecanismos.map(m => <option key={m} value={m!}>{m}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
            <option value="">Estado: Todos</option>
            {estados.map(e => <option key={e} value={e!}>{e}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterResultado} onChange={e => setFilterResultado(e.target.value)}>
            <option value="">Resultado: Todos</option>
            {resultados.map(r => <option key={r} value={r!}>{r}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader k="item" label="#" />
                <SortHeader k="cod_proy_e_iniciativa" label="Proyecto" />
                <SortHeader k="cod_resultado" label="Resultado" />
                <SortHeader k="c_actividad" label="Cod. Act." />
                <SortHeader k="n_actividad" label="Actividad" />
                <TableHead>Meta</TableHead>
                <SortHeader k="valor_de_avance" label="Avance" />
                <SortHeader k="estado" label="Estado" />
                <SortHeader k="presupuesto_cofinanc_seco_p" label="Ppto SECO" />
                <SortHeader k="ejecucion_presupuesto_cof_seco" label="Ejec SECO" />
                <TableHead>% SECO</TableHead>
                <TableHead>Ppto CM</TableHead>
                <TableHead>Ejec CM</TableHead>
                <TableHead>Ppto CNM</TableHead>
                <TableHead>Ejec CNM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>
              )}
              {filtered.map((r, i) => (
                <TableRow key={i} className={isSobregiro(r) ? "bg-destructive/10" : ""}>
                  <TableCell>{r.item}</TableCell>
                  <TableCell className="text-xs">{r.cod_proy_e_iniciativa}</TableCell>
                  <TableCell className="text-xs">{r.cod_resultado}</TableCell>
                  <TableCell className="font-mono text-xs">{r.c_actividad}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{r.n_actividad}</TableCell>
                  <TableCell className="text-right">{r.meta ?? "—"} <span className="text-muted-foreground text-xs">{r.unidad_de_medida}</span></TableCell>
                  <TableCell className="text-right">{r.valor_de_avance ?? "—"}</TableCell>
                  <TableCell>{r.estado}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(r.presupuesto_cofinanc_seco_p)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(r.ejecucion_presupuesto_cof_seco)}</TableCell>
                  <TableCell>{semaforo(r.pct_avance_cof_seco)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(r.aporte_contrapartida_monetaria_p)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(r.ejecucion_presupuesto_contrapartida_monetaria)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(r.aporte_contrapartida_no_monetaria_p)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(r.ejecucion_presupuesto_contrapartida_no_monetaria)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={8}>TOTALES</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.pptoSeco)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.ejSeco)}</TableCell>
                <TableCell>{semaforo(pctGeneral)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(filtered.reduce((s, r) => s + (r.aporte_contrapartida_monetaria_p ?? 0), 0))}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.ejCm)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(filtered.reduce((s, r) => s + (r.aporte_contrapartida_no_monetaria_p ?? 0), 0))}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totals.ejCnm)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
