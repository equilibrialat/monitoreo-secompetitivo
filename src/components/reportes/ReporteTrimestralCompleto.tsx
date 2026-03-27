import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, X, Copy, Sparkles, Loader2, Check, Calendar, DollarSign, BarChart3, FileText, Users, Leaf, Package, Scale, Briefcase, FileDown, Printer, RefreshCw } from "lucide-react";
import { downloadCSV, formatCurrency, TRIMESTRES_MESES, MESES_NOMBRE } from "@/lib/reportUtils";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { generateTrimestralDocx } from "@/lib/generateDocx";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { EntidadOption } from "@/contexts/RoleContext";

interface Props {
  entidadId: string | null;
  trimestre: string;
  anio: number;
  entidades: EntidadOption[];
  onClose: () => void;
}

const SECTION_HEADER = "text-sm font-bold uppercase tracking-wider py-2 px-4 rounded-t-lg text-primary-foreground";

function SectionTitle({ icon: Icon, title, number }: { icon: any; title: string; number: number }) {
  return (
    <div className="flex items-center gap-2 bg-[hsl(210,60%,15%)] text-white py-3 px-4 rounded-t-lg mt-8 first:mt-0">
      <Icon className="h-4 w-4" />
      <span className="font-bold text-sm">SECCIÓN {number} — {title}</span>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/40 border rounded-lg p-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Semaforo({ pct }: { pct: number }) {
  const color = pct > 100 ? "bg-destructive" : pct >= 66 ? "bg-emerald-500" : pct >= 33 ? "bg-amber-500" : "bg-destructive";
  return <span className={`inline-block w-3 h-3 rounded-full ${color}`} />;
}

export default function ReporteTrimestralCompleto({ entidadId, trimestre, anio, entidades, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [capacitaciones, setCapacitaciones] = useState<any[]>([]);
  const [innovaciones, setInnovaciones] = useState<any[]>([]);
  const [gei, setGei] = useState<any[]>([]);
  const [nuevosProductos, setNuevosProductos] = useState<any[]>([]);
  const [normativo, setNormativo] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [desembolsos, setDesembolsos] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadNombre = entidad?.nombre_corto || "Consolidado";
  const meses = TRIMESTRES_MESES[trimestre] || [1, 2, 3];
  const mesLabels = meses.map(m => MESES_NOMBRE[m - 1]);

  useEffect(() => { fetchAll(); }, [entidadId, trimestre, anio]);

  async function fetchAll() {
    setLoading(true);

    // 1. Activities with hierarchy
    let actQ = (supabase as any)
      .from("actividades")
      .select("*, productos!inner(codigo, nombre, resultado_id, resultados!inner(codigo, nombre))");
    if (entidadId && entidadId !== "consolidado") actQ = actQ.eq("entidad_id", entidadId);
    const { data: actData } = await actQ;
    setActividades(actData || []);

    // 2. Monthly records for the quarter
    let regQ = (supabase as any)
      .from("registros_mensuales")
      .select("*")
      .eq("anio", anio)
      .in("mes", meses);
    if (entidadId && entidadId !== "consolidado") regQ = regQ.eq("entidad_id", entidadId);
    const { data: regData } = await regQ;
    setRegistros(regData || []);

    const regIds = (regData || []).map((r: any) => r.id);

    // 3. Financial execution
    if (regIds.length > 0) {
      const { data: gData } = await (supabase as any)
        .from("ejecucion_financiera")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setGastos(gData || []);

      // 4. Capacitaciones
      const { data: capData } = await (supabase as any)
        .from("registro_capacitaciones")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setCapacitaciones(capData || []);

      // 5. Innovaciones
      const { data: innData } = await (supabase as any)
        .from("registro_innovaciones")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setInnovaciones(innData || []);

      // 6. GEI
      const { data: geiData } = await (supabase as any)
        .from("registro_gei")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setGei(geiData || []);

      // 7. Nuevos productos
      const { data: npData } = await (supabase as any)
        .from("registro_nuevos_productos")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setNuevosProductos(npData || []);

      // 8. Normativo
      const { data: normData } = await (supabase as any)
        .from("registro_normativo")
        .select("*, actividades!inner(codigo, nombre)")
        .in("registro_mensual_id", regIds);
      setNormativo(normData || []);
    } else {
      setGastos([]); setCapacitaciones([]); setInnovaciones([]);
      setGei([]); setNuevosProductos([]); setNormativo([]);
    }

    // 9. Contratos
    let contQ = (supabase as any).from("contratos").select("*, actividades(codigo, nombre)");
    if (entidadId && entidadId !== "consolidado") contQ = contQ.eq("entidad_id", entidadId);
    const { data: contData } = await contQ;
    setContratos(contData || []);

    // 10. Desembolsos
    let desQ = (supabase as any).from("desembolsos").select("*");
    if (entidadId && entidadId !== "consolidado") desQ = desQ.eq("entidad_id", entidadId);
    const { data: desData } = await desQ;
    setDesembolsos(desData || []);

    setLoading(false);
  }

  // Computed values
  const regByActMes = new Map<string, Map<number, any>>();
  registros.forEach(r => {
    if (!regByActMes.has(r.actividad_id)) regByActMes.set(r.actividad_id, new Map());
    regByActMes.get(r.actividad_id)!.set(r.mes, r);
  });

  const actConAvance = new Set<string>();
  const actCulminadas = new Set<string>();
  registros.forEach(r => {
    if (r.avance_valor > 0) actConAvance.add(r.actividad_id);
    if (r.estado === "culminado_100") actCulminadas.add(r.actividad_id);
  });

  const sumByFuente = (fuente: string) => gastos.filter(g => g.fuente === fuente).reduce((s, g) => s + (g.monto || 0), 0);
  const totalSeco = sumByFuente("cofinanciamiento_seco");
  const totalCM = sumByFuente("contrapartida_monetaria");
  const totalCNM = sumByFuente("contrapartida_no_monetaria");

  const totalPresupuestoSeco = actividades.reduce((s, a) => s + (a.presupuesto_seco || 0), 0);
  const totalEjecAcumSeco = actividades.reduce((s, a) => s + (a.ejecutado_seco_acum || 0), 0);
  const pctEjecTotal = totalPresupuestoSeco > 0 ? ((totalEjecAcumSeco / totalPresupuestoSeco) * 100).toFixed(0) : "—";

  // Group activities by resultado → producto
  const grouped = new Map<string, Map<string, any[]>>();
  actividades.forEach(a => {
    const res = `${a.productos?.resultados?.codigo} — ${a.productos?.resultados?.nombre}`;
    const prod = `${a.productos?.codigo} — ${a.productos?.nombre}`;
    if (!grouped.has(res)) grouped.set(res, new Map());
    if (!grouped.get(res)!.has(prod)) grouped.get(res)!.set(prod, []);
    grouped.get(res)!.get(prod)!.push(a);
  });

  // Financial by activity
  const gastosByActFuente = new Map<string, Record<string, number[]>>();
  gastos.forEach(g => {
    const key = g.actividad_id;
    if (!gastosByActFuente.has(key)) gastosByActFuente.set(key, {});
    const entry = gastosByActFuente.get(key)!;
    if (!entry[g.fuente]) entry[g.fuente] = [0, 0, 0];
    // Find which month index
    const reg = registros.find(r => r.id === g.registro_mensual_id);
    if (reg) {
      const mi = meses.indexOf(reg.mes);
      if (mi >= 0) entry[g.fuente][mi] += g.monto || 0;
    }
  });

  // Capacitaciones by activity
  const capByAct = new Map<string, any[]>();
  capacitaciones.forEach(c => {
    if (!capByAct.has(c.actividad_id)) capByAct.set(c.actividad_id, []);
    capByAct.get(c.actividad_id)!.push(c);
  });

  async function handleAI() {
    setAiLoading(true);
    const result = await invokeAnalysis("ejecutivo", {
      tipo_reporte: "trimestral_completo",
      entidad: entidadNombre,
      mecanismo: entidad?.mecanismo || "",
      region: entidad?.region || "",
      cadena_valor: entidad?.cadena_valor || "",
      periodo: `${trimestre} ${anio}`,
      total_actividades: actividades.length,
      actividades_con_avance: actConAvance.size,
      actividades_culminadas: actCulminadas.size,
      ejecucion_seco_trimestre: totalSeco,
      ejecucion_cm_trimestre: totalCM,
      ejecucion_cnm_trimestre: totalCNM,
      pct_ejecucion_acumulada: pctEjecTotal,
      capacitaciones: capacitaciones.length,
      total_participantes: capacitaciones.reduce((s, c) => s + (c.total_participantes || 0), 0),
      innovaciones: innovaciones.length,
      contratos_vigentes: contratos.filter(c => c.estado === "vigente").length,
    });
    setAiLoading(false);
    if (result.error) toast.error(result.error);
    else setAiSummary(result.resultado || "");
  }

  function handleCopySummary() {
    if (!aiSummary) return;
    navigator.clipboard.writeText(aiSummary);
    setCopied(true);
    toast.success("Resumen copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCSV() {
    const rows = actividades.map(a => {
      const regs = regByActMes.get(a.id);
      return {
        Resultado: `${a.productos?.resultados?.codigo}`,
        Producto: `${a.productos?.codigo}`,
        Codigo: a.codigo,
        Actividad: a.nombre,
        Meta: a.meta_valor ?? "",
        Unidad: a.meta_unidad_medida || "",
        [mesLabels[0]]: regs?.get(meses[0])?.avance_valor ?? "",
        [mesLabels[1]]: regs?.get(meses[1])?.avance_valor ?? "",
        [mesLabels[2]]: regs?.get(meses[2])?.avance_valor ?? "",
        Presupuesto_SECO: a.presupuesto_seco ?? 0,
        Ejecutado_SECO_Acum: a.ejecutado_seco_acum ?? 0,
      };
    });
    downloadCSV(rows, `reporte_trimestral_${entidadNombre}_${trimestre}_${anio}.csv`);
  }

  async function handleDocx() {
    toast.info("Generando documento Word...");
    try {
      await generateTrimestralDocx({
        entidadNombre, entidad, trimestre, anio, mesLabels, meses,
        actividades, registros, gastos, capacitaciones, innovaciones, gei,
        nuevosProductos, normativo, contratos, desembolsos, aiSummary,
        actConAvance, actCulminadas, totalSeco, totalCM, totalCNM,
        totalPresupuestoSeco, totalEjecAcumSeco, pctEjecTotal,
        regByActMes, grouped, gastosByActFuente, capByAct,
      });
      toast.success("Documento Word descargado");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el documento");
    }
  }

  function handlePrint() {
    window.print();
  }

  const noData = registros.length === 0 && !loading;

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          Cargando reporte completo...
        </CardContent>
      </Card>
    );
  }

  if (noData) {
    return (
      <Card className="border-2">
        <CardContent className="py-16">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No hay registros para {trimestre} {anio}.</p>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderFinancialTab(fuente: string, label: string) {
    const filteredGastos = gastos.filter(g => g.fuente === fuente);
    // group by activity
    const byAct = new Map<string, { codigo: string; nombre: string; pres: number; months: number[]; acum: number }>();
    actividades.forEach(a => {
      const presField = fuente === "cofinanciamiento_seco" ? "presupuesto_seco"
        : fuente === "contrapartida_monetaria" ? "presupuesto_contrapartida_monetaria"
        : "presupuesto_contrapartida_no_monetaria";
      const acumField = fuente === "cofinanciamiento_seco" ? "ejecutado_seco_acum"
        : fuente === "contrapartida_monetaria" ? "ejecutado_cm_acum"
        : "ejecutado_cnm_acum";
      if ((a[presField] || 0) > 0 || gastosByActFuente.get(a.id)?.[fuente]) {
        byAct.set(a.id, { codigo: a.codigo, nombre: a.nombre, pres: a[presField] || 0, months: gastosByActFuente.get(a.id)?.[fuente] || [0, 0, 0], acum: a[acumField] || 0 });
      }
    });
    const rows = Array.from(byAct.values());
    if (rows.length === 0) return <p className="text-center py-4 text-muted-foreground">Sin datos</p>;
    const totM = [0, 0, 0];
    let totPres = 0, totAcum = 0;
    rows.forEach(r => { r.months.forEach((v, i) => totM[i] += v); totPres += r.pres; totAcum += r.acum; });
    const totTrim = totM.reduce((a, b) => a + b, 0);

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Actividad</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              {mesLabels.map(m => <TableHead key={m} className="text-right">{m}</TableHead>)}
              <TableHead className="text-right">Total Trim.</TableHead>
              <TableHead className="text-right">Acumulado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const trim = r.months.reduce((a, b) => a + b, 0);
              const saldo = r.pres - r.acum;
              const pct = r.pres > 0 ? (r.acum / r.pres) * 100 : 0;
              return (
                <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                  <TableCell className="text-xs font-medium">{r.codigo} — {r.nombre}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(r.pres)}</TableCell>
                  {r.months.map((v, mi) => <TableCell key={mi} className="text-right font-mono text-xs">{v > 0 ? formatCurrency(v) : "—"}</TableCell>)}
                  <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(trim)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(r.acum)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${saldo < 0 ? "text-destructive font-bold" : ""}`}>{formatCurrency(saldo)}</TableCell>
                  <TableCell className="text-right text-xs">
                    <span className="inline-flex items-center gap-1"><Semaforo pct={pct} />{pct.toFixed(0)}%</span>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-bold border-t-2">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right font-mono text-xs">{formatCurrency(totPres)}</TableCell>
              {totM.map((v, i) => <TableCell key={i} className="text-right font-mono text-xs">{formatCurrency(v)}</TableCell>)}
              <TableCell className="text-right font-mono text-xs">{formatCurrency(totTrim)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{formatCurrency(totAcum)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{formatCurrency(totPres - totAcum)}</TableCell>
              <TableCell className="text-right text-xs">{totPres > 0 ? ((totAcum / totPres) * 100).toFixed(0) : "—"}%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="bg-background border-2 rounded-xl shadow-lg max-w-[1200px] mx-auto print:shadow-none print:border-0">
      {/* HEADER */}
      <div className="bg-[hsl(210,60%,15%)] text-white p-6 rounded-t-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔷</span>
              <h1 className="text-xl font-bold">INFORME TRIMESTRAL {trimestre}-{anio} ({mesLabels.join(" – ")})</h1>
            </div>
            <p className="text-white/80">Entidad: <strong>{entidadNombre}</strong> — {entidad?.tipo_entidad === "ejecutora" ? "Entidad Ejecutora" : "Entidad Participante"}</p>
            {entidad && <p className="text-white/70 text-sm">Mecanismo {entidad.mecanismo === "mec_b" ? "B" : "A"} | Región: {entidad.region || "—"} | CdV: {entidad.cadena_valor || "—"}</p>}
            <p className="text-white/50 text-xs mt-1">Fecha de generación: {new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={handleDocx}><FileDown className="h-4 w-4 mr-1" />Word</Button>
            <Button variant="secondary" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />PDF</Button>
            <Button variant="secondary" size="sm" onClick={handleCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-white/80" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-0">
        {/* SECTION 1 — RESUMEN EJECUTIVO IA */}
        <SectionTitle icon={Sparkles} title="RESUMEN EJECUTIVO" number={1} />
        <div className="border border-t-0 rounded-b-lg p-4 space-y-3 mb-2">
          <Button variant="outline" size="sm" onClick={handleAI} disabled={aiLoading} className="border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {aiLoading ? "Generando análisis..." : aiSummary ? "🔄 Regenerar resumen" : "🤖 Generar resumen ejecutivo"}
          </Button>
          {aiSummary && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1"><Sparkles className="h-3 w-3" /> Análisis generado por IA</p>
                <Button variant="ghost" size="sm" onClick={handleCopySummary} className="h-7 text-xs">
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </div>

        {/* SECTION 2 — KPIs */}
        <SectionTitle icon={BarChart3} title="KPIs DEL TRIMESTRE" number={2} />
        <div className="border border-t-0 rounded-b-lg p-4 mb-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Actividades con avance" value={`${actConAvance.size} de ${actividades.length}`} />
            <KpiCard label="Actividades culminadas" value={String(actCulminadas.size)} />
            <KpiCard label="Ejecución SECO trimestre" value={formatCurrency(totalSeco)} />
            <KpiCard label="Contrapartida Mon." value={formatCurrency(totalCM)} />
            <KpiCard label="Contrapartida No Mon." value={formatCurrency(totalCNM)} />
            <KpiCard label="% Ejec. vs Presupuesto" value={`${pctEjecTotal}%`} sub="Acumulado SECO" />
          </div>
        </div>

        {/* SECTION 3 — AVANCE OPERATIVO */}
        <SectionTitle icon={Calendar} title="AVANCE OPERATIVO" number={3} />
        <div className="border border-t-0 rounded-b-lg p-4 mb-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Resultado / Producto</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">Unidad</TableHead>
                {mesLabels.map(m => <TableHead key={m} className="text-right">{m.substring(0, 3)}</TableHead>)}
                <TableHead className="text-right">Acum. Trim.</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(grouped.entries()).map(([res, prods]) => (
                Array.from(prods.entries()).map(([prod, acts], pi) => (
                  acts.map((a, ai) => {
                    const regs = regByActMes.get(a.id);
                    const vals = meses.map(m => regs?.get(m)?.avance_valor ?? 0);
                    const acumTrim = vals.reduce((s, v) => s + v, 0);
                    const pct = a.meta_valor ? ((acumTrim / a.meta_valor) * 100) : 0;
                    const lastEstado = regs ? Array.from(regs.values()).sort((a, b) => b.mes - a.mes)[0]?.estado : null;
                    return (
                      <TableRow key={a.id} className={ai % 2 === 0 ? "bg-muted/10" : ""}>
                        <TableCell className="text-xs">
                          {ai === 0 && pi === 0 && <div className="text-muted-foreground font-medium">{res}</div>}
                          {ai === 0 && <div className="text-foreground">{prod}</div>}
                        </TableCell>
                        <TableCell className="text-sm"><span className="font-mono text-xs mr-1">{a.codigo}</span>{a.nombre}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{a.meta_valor ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{a.meta_unidad_medida || "—"}</TableCell>
                        {vals.map((v, i) => <TableCell key={i} className="text-right font-mono text-xs">{v || "—"}</TableCell>)}
                        <TableCell className="text-right font-mono text-xs font-semibold">{acumTrim || "—"}</TableCell>
                        <TableCell className="text-right text-xs"><span className="inline-flex items-center gap-1"><Semaforo pct={pct} />{pct.toFixed(0)}%</span></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{lastEstado?.replace(/_/g, " ") || "—"}</Badge></TableCell>
                      </TableRow>
                    );
                  })
                ))
              ))}
            </TableBody>
          </Table>
        </div>

        {/* SECTION 4 — DETALLE NARRATIVO */}
        <SectionTitle icon={FileText} title="DETALLE NARRATIVO POR ACTIVIDAD" number={4} />
        <div className="border border-t-0 rounded-b-lg p-4 mb-2 space-y-3">
          {actividades.filter(a => actConAvance.has(a.id)).map(a => {
            const regs = regByActMes.get(a.id);
            const caps = capByAct.get(a.id) || [];
            const totalPart = caps.reduce((s, c) => s + (c.total_participantes || 0), 0);
            const totalH = caps.reduce((s, c) => s + (c.participantes_masculino || 0), 0);
            const totalM = caps.reduce((s, c) => s + (c.participantes_femenino || 0), 0);
            const actInn = innovaciones.filter(i => i.actividad_id === a.id);
            const actGei = gei.filter(g => g.actividad_id === a.id);
            const actNP = nuevosProductos.filter(n => n.actividad_id === a.id);
            const lastEstado = regs ? Array.from(regs.values()).sort((x, y) => y.mes - x.mes)[0]?.estado : null;
            const isCulm = lastEstado === "culminado_100";
            return (
              <div key={a.id} className="border rounded-lg p-4 bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{a.codigo} — {a.nombre}</h4>
                  <Badge className={isCulm ? "bg-emerald-500/15 text-emerald-700" : "bg-primary/10 text-primary"}>
                    {isCulm ? "✅ Culminado" : lastEstado?.replace(/_/g, " ") || "—"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  {meses.map(m => {
                    const r = regs?.get(m);
                    if (!r?.descripcion_avance) return null;
                    return (
                      <div key={m} className="pl-3 border-l-2 border-primary/20">
                        <span className="font-medium text-xs text-muted-foreground">{MESES_NOMBRE[m - 1]}:</span>{" "}
                        <span className="text-foreground">{r.descripcion_avance}</span>
                      </div>
                    );
                  })}
                </div>
                {(caps.length > 0 || actInn.length > 0 || actGei.length > 0 || actNP.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {caps.length > 0 && <span>📊 Capacitaciones: {caps.length} eventos, {totalPart} participantes ({totalH}H / {totalM}M)</span>}
                    {actInn.length > 0 && <span>💡 Innovaciones: {actInn.length}</span>}
                    {actGei.length > 0 && <span>🌱 GEI: {actGei.length} prácticas</span>}
                    {actNP.length > 0 && <span>📦 Nuevos productos: {actNP.length}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SECTION 5 — EJECUCIÓN FINANCIERA */}
        <SectionTitle icon={DollarSign} title="EJECUCIÓN FINANCIERA" number={5} />
        <div className="border border-t-0 rounded-b-lg p-4 mb-2 space-y-4">
          <Tabs defaultValue="seco">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="seco">Cofinanciamiento SECO</TabsTrigger>
              <TabsTrigger value="cm">Contrapartida Monetaria</TabsTrigger>
              <TabsTrigger value="cnm">Contrapartida No Monetaria</TabsTrigger>
            </TabsList>
            <TabsContent value="seco">{renderFinancialTab("cofinanciamiento_seco", "SECO")}</TabsContent>
            <TabsContent value="cm">{renderFinancialTab("contrapartida_monetaria", "CM")}</TabsContent>
            <TabsContent value="cnm">{renderFinancialTab("contrapartida_no_monetaria", "CNM")}</TabsContent>
          </Tabs>

          {/* Financial summary */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Resumen Financiero</h4>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Fuente</TableHead>
                  <TableHead className="text-right">Presupuesto Total</TableHead>
                  <TableHead className="text-right">Ejecutado Trimestre</TableHead>
                  <TableHead className="text-right">Ejecutado Acumulado</TableHead>
                  <TableHead className="text-right">% Ejecución</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "SECO", pres: totalPresupuestoSeco, trim: totalSeco, acum: totalEjecAcumSeco },
                  { label: "C. Monetaria", pres: actividades.reduce((s, a) => s + (a.presupuesto_contrapartida_monetaria || 0), 0), trim: totalCM, acum: actividades.reduce((s, a) => s + (a.ejecutado_cm_acum || 0), 0) },
                  { label: "C. No Monetaria", pres: actividades.reduce((s, a) => s + (a.presupuesto_contrapartida_no_monetaria || 0), 0), trim: totalCNM, acum: actividades.reduce((s, a) => s + (a.ejecutado_cnm_acum || 0), 0) },
                ].map(row => {
                  const pct = row.pres > 0 ? ((row.acum / row.pres) * 100).toFixed(0) : "—";
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.pres)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.trim)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.acum)}</TableCell>
                      <TableCell className="text-right"><Badge variant="outline">{pct}%</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.pres - row.acum)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* SECTION 6 — DETALLE DE GASTOS */}
        <SectionTitle icon={DollarSign} title="DETALLE DE GASTOS" number={6} />
        <div className="border border-t-0 rounded-b-lg p-4 mb-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Fecha</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Tipo Gasto</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Comprobante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.sort((a, b) => (a.fecha_gasto || "").localeCompare(b.fecha_gasto || "")).map((g, i) => (
                <TableRow key={g.id} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                  <TableCell className="text-xs">{g.fecha_gasto || "—"}</TableCell>
                  <TableCell className="text-xs">{g.actividades?.codigo}</TableCell>
                  <TableCell className="text-xs">{g.fuente?.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs">{g.tipo_gasto || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{g.detalle_gasto || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(g.monto)}</TableCell>
                  <TableCell className="text-xs">{g.comprobante_ref || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* SECTION 7 — CAPACITACIONES */}
        {capacitaciones.length > 0 && (
          <>
            <SectionTitle icon={Users} title="CAPACITACIONES DEL TRIMESTRE" number={7} />
            <div className="border border-t-0 rounded-b-lg p-4 mb-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Actividad</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">H</TableHead>
                    <TableHead className="text-right">M</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Modalidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capacitaciones.map((c, i) => (
                    <TableRow key={c.id} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                      <TableCell className="text-xs font-mono">{c.actividades?.codigo}</TableCell>
                      <TableCell className="text-xs">{c.nombre_accion_formativa}</TableCell>
                      <TableCell className="text-xs">{c.tipo_accion_formativa || "—"}</TableCell>
                      <TableCell className="text-xs">{c.tema || "—"}</TableCell>
                      <TableCell className="text-xs">{c.fecha_inicio || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{c.participantes_masculino || 0}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{c.participantes_femenino || 0}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{c.total_participantes || 0}</TableCell>
                      <TableCell className="text-xs">{c.modalidad || "—"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={5}>TOTAL</TableCell>
                    <TableCell className="text-right font-mono text-xs">{capacitaciones.reduce((s, c) => s + (c.participantes_masculino || 0), 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{capacitaciones.reduce((s, c) => s + (c.participantes_femenino || 0), 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{capacitaciones.reduce((s, c) => s + (c.total_participantes || 0), 0)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* SECTION 8 — INDICADORES CONTEXTUALES */}
        {(innovaciones.length > 0 || gei.length > 0 || nuevosProductos.length > 0 || normativo.length > 0) && (
          <>
            <SectionTitle icon={Leaf} title="INDICADORES CONTEXTUALES" number={8} />
            <div className="border border-t-0 rounded-b-lg p-4 mb-2 space-y-4">
              {innovaciones.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">💡 Innovaciones ({innovaciones.length})</h4>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50"><TableHead>Actividad</TableHead><TableHead>Innovación</TableHead><TableHead>Organización</TableHead><TableHead>Cadena</TableHead></TableRow></TableHeader>
                    <TableBody>{innovaciones.map(i => (<TableRow key={i.id}><TableCell className="text-xs font-mono">{i.actividades?.codigo}</TableCell><TableCell className="text-xs">{i.nombre_innovacion}</TableCell><TableCell className="text-xs">{i.nombre_organizacion || "—"}</TableCell><TableCell className="text-xs">{i.cadena_valor || "—"}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              )}
              {gei.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">🌱 Prácticas GEI ({gei.length})</h4>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50"><TableHead>Actividad</TableHead><TableHead>Práctica</TableHead><TableHead>Tipo</TableHead><TableHead>Categoría</TableHead><TableHead>Etapa</TableHead></TableRow></TableHeader>
                    <TableBody>{gei.map(g => (<TableRow key={g.id}><TableCell className="text-xs font-mono">{g.actividades?.codigo}</TableCell><TableCell className="text-xs">{g.nombre_practica}</TableCell><TableCell className="text-xs">{g.tipo_accion || "—"}</TableCell><TableCell className="text-xs">{g.categoria || "—"}</TableCell><TableCell className="text-xs">{g.etapa_implementacion || "—"}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              )}
              {nuevosProductos.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">📦 Nuevos Productos ({nuevosProductos.length})</h4>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50"><TableHead>Actividad</TableHead><TableHead>Producto</TableHead><TableHead>Organización</TableHead><TableHead>Cadena</TableHead></TableRow></TableHeader>
                    <TableBody>{nuevosProductos.map(n => (<TableRow key={n.id}><TableCell className="text-xs font-mono">{n.actividades?.codigo}</TableCell><TableCell className="text-xs">{n.nombre_producto}</TableCell><TableCell className="text-xs">{n.nombre_organizacion || "—"}</TableCell><TableCell className="text-xs">{n.cadena_valor || "—"}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              )}
              {normativo.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">⚖️ Avance Normativo ({normativo.length})</h4>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50"><TableHead>Actividad</TableHead><TableHead>Documento</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Nº Doc</TableHead></TableRow></TableHeader>
                    <TableBody>{normativo.map(n => (<TableRow key={n.id}><TableCell className="text-xs font-mono">{n.actividades?.codigo}</TableCell><TableCell className="text-xs">{n.nombre_documento}</TableCell><TableCell className="text-xs">{n.tipo_marco}</TableCell><TableCell className="text-xs">{n.estado}</TableCell><TableCell className="text-xs">{n.numero_documento || "—"}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}

        {/* SECTION 9 — CONTRATOS */}
        {contratos.length > 0 && (
          <>
            <SectionTitle icon={Briefcase} title="CONTRATOS VIGENTES" number={9} />
            <div className="border border-t-0 rounded-b-lg p-4 mb-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Contratado</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Días rest.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c, i) => {
                    const diasRest = c.fecha_fin ? Math.ceil((new Date(c.fecha_fin).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <TableRow key={c.id} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                        <TableCell className="text-xs font-medium">{c.nombre_contratado}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{c.objeto || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(c.monto)}</TableCell>
                        <TableCell className="text-xs">{c.fecha_inicio || "—"}</TableCell>
                        <TableCell className="text-xs">{c.fecha_fin || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.estado || "—"}</Badge></TableCell>
                        <TableCell className={`text-right text-xs font-mono ${diasRest !== null && diasRest < 10 ? "text-destructive font-bold" : diasRest !== null && diasRest < 30 ? "text-amber-600" : ""}`}>
                          {diasRest !== null ? (diasRest < 0 ? `Vencido (${Math.abs(diasRest)}d)` : `${diasRest}d`) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* SECTION 10 — DESEMBOLSOS */}
        {desembolsos.length > 0 && (
          <>
            <SectionTitle icon={Scale} title="ESTADO DE DESEMBOLSOS" number={10} />
            <div className="border border-t-0 rounded-b-lg p-4 mb-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Remesa</TableHead>
                    <TableHead className="text-right">Monto USD</TableHead>
                    <TableHead className="text-right">TC</TableHead>
                    <TableHead className="text-right">Monto PEN</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Trimestre</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desembolsos.sort((a, b) => a.numero_remesa - b.numero_remesa).map((d, i) => (
                    <TableRow key={d.id} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                      <TableCell className="font-medium">Remesa {d.numero_remesa}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(d.monto_usd)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{d.tipo_cambio || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{d.monto_pen ? formatCurrency(d.monto_pen) : "—"}</TableCell>
                      <TableCell className="text-xs">{d.fecha_desembolso || "—"}</TableCell>
                      <TableCell className="text-xs">{d.trimestre_vinculado || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{d.estado || "—"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-6 border-t print:hidden">
          <p className="text-xs text-muted-foreground">Generado automáticamente por el Sistema de Monitoreo SeCompetitivo</p>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={handleDocx}><FileDown className="h-4 w-4 mr-1" />Descargar Word</Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Descargar PDF</Button>
            <Button variant="outline" size="sm" onClick={handleCSV}><Download className="h-4 w-4 mr-1" />Descargar CSV</Button>
            {aiSummary && <Button variant="outline" size="sm" onClick={handleCopySummary}><Copy className="h-4 w-4 mr-1" />Copiar resumen</Button>}
            <Button variant="outline" size="sm" onClick={handleAI} disabled={aiLoading}>
              <Sparkles className="h-4 w-4 mr-1" />{aiSummary ? "Regenerar IA" : "Generar IA"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
