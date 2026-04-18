import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Download, Copy, Check, Mail, Bot, Loader2, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { generateResumenRegionalDocx } from "@/lib/generateDocx";
import { fmt } from "./DashboardEntidad";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const MESES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
  7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

interface EntidadResumen {
  ent: DashboardEntidad;
  registros: any[];
  prioridades: string | null;
  compromisos: string | null;
  limitaciones: string | null;
  ejecutadoMes: { seco: number; cm: number; cnm: number };
  estadoAprobacion: string;
  alertas: string[];
}

export function ResumenRegional() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);
  const [resumen, setResumen] = useState<EntidadResumen[] | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showResumen, setShowResumen] = useState(false);

  const { data: allEntidades } = useDashboardData();
  const { filters } = useRole();

  // Filter to regional entities (non-Nacional for coordinador_regional)
  const entidades = useMemo(() =>
    (allEntidades || []).filter(e => {
      if (e.region === "Nacional") return false;
      if (filters.region && e.region !== filters.region) return false;
      if (filters.entidadFiltro && e.entidad_id !== filters.entidadFiltro) return false;
      return true;
    }), [allEntidades, filters]);

  const region = entidades.length > 0 ? entidades[0].region : "Región";

  const handleGenerar = async () => {
    setGenerating(true);
    setResumen(null);
    setAiResult(null);

    const results: EntidadResumen[] = [];

    for (const ent of entidades) {
      // Fetch registros for this month
      const { data: regs } = await (supabase as any)
        .from("registros_mensuales")
        .select("id, actividad_id, avance_valor, descripcion_avance, estado_registro, prioridades_proximo_mes, limitaciones, compromisos")
        .eq("entidad_id", ent.entidad_id)
        .eq("mes", mes)
        .eq("anio", anio);

      const registros = regs || [];

      // Fetch ejecucion financiera for these registros
      const regIds = registros.map((r: any) => r.id);
      let ejecutadoMes = { seco: 0, cm: 0, cnm: 0 };
      if (regIds.length > 0) {
        const { data: ejecs } = await (supabase as any)
          .from("ejecucion_financiera")
          .select("fuente, monto")
          .in("registro_mensual_id", regIds);

        for (const ef of ejecs || []) {
          if (ef.fuente === "cofinanciamiento_seco") ejecutadoMes.seco += Number(ef.monto || 0);
          else if (ef.fuente === "contrapartida_monetaria") ejecutadoMes.cm += Number(ef.monto || 0);
          else ejecutadoMes.cnm += Number(ef.monto || 0);
        }
      }

      // Collect prioridades/compromisos from latest registro
      const lastReg = registros[0];
      const prioridades = lastReg?.prioridades_proximo_mes || null;
      const compromisos = lastReg?.compromisos || null;
      const limitaciones = lastReg?.limitaciones || null;

      // Estado aprobación
      const estados = registros.map((r: any) => r.estado_registro).filter(Boolean);
      const estadoAprobacion = estados.includes("aprobado") ? "Aprobado"
        : estados.includes("observado") ? "Observado"
        : estados.includes("en_revision_tecnica") || estados.includes("en_revision_financiera") ? "En revisión"
        : estados.includes("enviado") ? "Enviado"
        : estados.includes("borrador") ? "Borrador"
        : "Sin registro";

      // Alertas
      const alertas: string[] = [];
      if (ent.sobregiros_seco > 0) alertas.push(`${ent.sobregiros_seco} sobregiro(s) SECO`);
      if (ent.tiene_observado) alertas.push("Registro observado");
      if (ent.actividades_sin_iniciar > 0) alertas.push(`${ent.actividades_sin_iniciar} actividad(es) sin iniciar`);
      const desfase = Math.abs((ent.avance_operativo_promedio || 0) - ent.pct_ejecucion_seco);
      if (desfase > 15) alertas.push(`Desfase técnico-financiero: ${desfase}%`);
      if (ent.meses_sin_reporte.length > 0) alertas.push(`Sin reporte: ${ent.meses_sin_reporte.join(", ")}`);

      results.push({ ent, registros, prioridades, compromisos, limitaciones, ejecutadoMes, estadoAprobacion, alertas });
    }

    setResumen(results);
    setShowResumen(true);
    setGenerating(false);
  };

  const handleAI = async () => {
    if (!resumen) return;
    setAiLoading(true);
    const datos = resumen.map(r => ({
      entidad: r.ent.nombre_corto,
      mecanismo: r.ent.mecanismo,
      cadena_valor: r.ent.cadena_valor,
      avance_operativo: r.ent.avance_operativo_promedio,
      ejecucion_seco: r.ent.pct_ejecucion_seco,
      ejecutado_mes: r.ejecutadoMes,
      alertas: r.alertas,
      estado_aprobacion: r.estadoAprobacion,
      prioridades: r.prioridades,
      compromisos: r.compromisos,
      limitaciones: r.limitaciones,
      actividades_con_avance: r.registros.filter((reg: any) => reg.avance_valor > 0).length,
      total_registros: r.registros.length,
    }));

    const { resultado, error } = await invokeAnalysis("ejecutivo", {
      instrucciones: "Eres un Coordinador Regional del programa SeCompetitivo. Genera un resumen para enviar al Coordinador de Cadenas de Valor sobre el estado de las entidades en tu región. Compara el avance entre entidades, identifica las que necesitan más apoyo, y sugiere acciones de seguimiento para el próximo mes.",
      entidad: { codigo: "REGIONAL", nombre: region },
      periodo: { mes: MESES[mes], anio },
      entidades_region: datos,
    });

    setAiLoading(false);
    if (error) toast.error(error);
    else {
      setAiResult(resultado ?? null);
      // Save to DB
      await (supabase as any).from("resumenes_regionales").insert({
        region,
        anio,
        mes,
        contenido: buildPlainText(resumen),
        analisis_ia: resultado,
      });
    }
  };

  const buildPlainText = (data: EntidadResumen[]): string => {
    let text = `RESUMEN REGIONAL — ${region} — ${MESES[mes]} ${anio}\n\n`;
    text += `ESTADO GENERAL\n`;
    text += `Entidades: ${data.length} | Con reporte: ${data.filter(r => r.estadoAprobacion !== "Sin registro").length} | Alertas: ${data.reduce((s, r) => s + r.alertas.length, 0)}\n\n`;

    for (const r of data) {
      text += `─── ${r.ent.nombre_corto} (MEC-${r.ent.mecanismo}) ───\n`;
      text += `Cadena: ${r.ent.cadena_valor || "—"} | Región: ${r.ent.region}\n`;
      text += `Avance Op: ${r.ent.avance_operativo_promedio}% | Ejec SECO: ${r.ent.pct_ejecucion_seco}%\n`;
      text += `Ejecutado mes: SECO ${fmt(r.ejecutadoMes.seco)} | CM ${fmt(r.ejecutadoMes.cm)} | CNM ${fmt(r.ejecutadoMes.cnm)}\n`;
      text += `Estado: ${r.estadoAprobacion}\n`;
      if (r.alertas.length > 0) text += `Alertas: ${r.alertas.join("; ")}\n`;
      if (r.prioridades) text += `Prioridades: ${r.prioridades}\n`;
      if (r.compromisos) text += `Compromisos: ${r.compromisos}\n`;
      text += "\n";
    }

    if (aiResult) text += `\nANÁLISIS IA:\n${aiResult}\n`;
    return text;
  };

  const handleCopy = () => {
    if (!resumen) return;
    navigator.clipboard.writeText(buildPlainText(resumen));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Resumen copiado al portapapeles");
  };

  const handleDocx = async () => {
    if (!resumen) return;
    setExporting(true);
    try {
      await generateResumenRegionalDocx({
        region,
        mes,
        anio,
        entidades: resumen.map(r => ({
          nombre: r.ent.nombre_corto,
          mecanismo: r.ent.mecanismo,
          cadenaValor: r.ent.cadena_valor || "—",
          avanceOp: r.ent.avance_operativo_promedio || 0,
          ejecSeco: r.ent.pct_ejecucion_seco,
          ejecutadoMes: r.ejecutadoMes,
          estadoAprobacion: r.estadoAprobacion,
          alertas: r.alertas,
          prioridades: r.prioridades,
          compromisos: r.compromisos,
          presupuesto: r.ent.presupuesto_seco_total,
          ejecutado: r.ent.ejecutado_seco_total,
          actConAvance: r.registros.filter((reg: any) => reg.avance_valor > 0).length,
          totalRegistros: r.registros.length,
        })),
        aiSummary: aiResult,
      });
      toast.success("Documento Word descargado");
    } catch {
      toast.error("Error al generar documento");
    }
    setExporting(false);
  };

  // Summary stats
  const conReporte = resumen?.filter(r => r.estadoAprobacion !== "Sin registro").length ?? 0;
  const totalAlertas = resumen?.reduce((s, r) => s + r.alertas.length, 0) ?? 0;
  const pendientes = resumen?.filter(r => !["Aprobado", "Sin registro"].includes(r.estadoAprobacion)).length ?? 0;

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Resumen Regional del Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Mes</label>
              <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MESES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Año</label>
              <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={handleGenerar} disabled={generating || entidades.length === 0}>
              {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
              📄 Generar Resumen Regional del Mes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated report view */}
      {showResumen && resumen && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-2 bg-muted/30 border-b">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base font-bold">RESUMEN REGIONAL — {region} — {MESES[mes]} {anio}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Coordinador Regional</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleDocx} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                  📥 Descargar Word
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  📋 Copiar texto
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setEmailOpen(true)}>
                  <Mail className="h-3 w-3 mr-1" /> 📧 Preparar correo para Coordinador de Cadenas de Valor
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-5">
            {/* SECCIÓN 1 — Estado general */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">SECCIÓN 1 — Estado General</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Entidades</p>
                  <p className="text-2xl font-bold">{resumen.length}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Con reporte</p>
                  <p className="text-2xl font-bold text-emerald-600">{conReporte}</p>
                </div>
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Pendientes</p>
                  <p className="text-2xl font-bold text-warning">{pendientes}</p>
                </div>
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Alertas</p>
                  <p className="text-2xl font-bold text-destructive">{totalAlertas}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* SECCIÓN 2 — Detalle por entidad */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">SECCIÓN 2 — Detalle por Entidad</h3>
              <div className="space-y-4">
                {resumen.map(r => {
                  const actsConAvance = r.registros.filter((reg: any) => reg.avance_valor > 0).length;
                  return (
                    <Card key={r.ent.entidad_id} className="border-l-4 border-l-primary/40">
                      <CardContent className="pt-4 pb-3 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{r.ent.nombre_corto}</span>
                            <Badge variant="outline" className="text-[9px]">MEC-{r.ent.mecanismo}</Badge>
                            {r.ent.cadena_valor && <Badge variant="secondary" className="text-[9px]">{r.ent.cadena_valor}</Badge>}
                          </div>
                          <Badge className={`text-[10px] ${
                            r.estadoAprobacion === "Aprobado" ? "bg-emerald-500/15 text-emerald-700"
                            : r.estadoAprobacion === "Observado" ? "bg-destructive/15 text-destructive"
                            : r.estadoAprobacion === "Sin registro" ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                          }`}>
                            {r.estadoAprobacion === "Aprobado" ? "✅" : r.estadoAprobacion === "Observado" ? "⚠️" : r.estadoAprobacion === "Sin registro" ? "—" : "⏳"} {r.estadoAprobacion}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <p className="text-muted-foreground">Avance Op.</p>
                            <div className="flex items-center gap-2">
                              <Progress value={r.ent.avance_operativo_promedio || 0} className="h-1.5 flex-1" />
                              <span className="font-mono font-semibold">{r.ent.avance_operativo_promedio ?? 0}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ejec. SECO</p>
                            <div className="flex items-center gap-2">
                              <Progress value={r.ent.pct_ejecucion_seco} className="h-1.5 flex-1" />
                              <span className="font-mono font-semibold">{r.ent.pct_ejecucion_seco}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Actividades con avance</p>
                            <p className="font-semibold">{actsConAvance} de {r.registros.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Presupuesto</p>
                            <p className="font-mono font-semibold">{fmt(r.ent.presupuesto_seco_total)}</p>
                          </div>
                        </div>

                        {/* Financiero del mes */}
                        <div className="bg-muted/30 rounded p-2 text-[11px]">
                          <p className="text-muted-foreground font-medium mb-1">Ejecución del mes:</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div><p className="text-muted-foreground">SECO</p><p className="font-mono font-semibold">{fmt(r.ejecutadoMes.seco)}</p></div>
                            <div><p className="text-muted-foreground">Contrapartida M.</p><p className="font-mono font-semibold">{fmt(r.ejecutadoMes.cm)}</p></div>
                            <div><p className="text-muted-foreground">Contrapartida NM.</p><p className="font-mono font-semibold">{fmt(r.ejecutadoMes.cnm)}</p></div>
                          </div>
                        </div>

                        {/* Prioridades / Compromisos */}
                        {(r.prioridades || r.compromisos) && (
                          <div className="text-[11px] space-y-1">
                            {r.prioridades && <p><span className="font-medium text-muted-foreground">Prioridades:</span> {r.prioridades}</p>}
                            {r.compromisos && <p><span className="font-medium text-muted-foreground">Compromisos:</span> {r.compromisos}</p>}
                            {r.limitaciones && <p><span className="font-medium text-muted-foreground">Limitaciones:</span> {r.limitaciones}</p>}
                          </div>
                        )}

                        {/* Alertas */}
                        {r.alertas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {r.alertas.map((a, i) => (
                              <Badge key={i} variant="destructive" className="text-[9px]">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {a}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* SECCIÓN 3 — Análisis IA */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">SECCIÓN 3 — Análisis IA</h3>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleAI} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
                  🤖 Generar análisis regional
                </Button>
              </div>
              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analizando región...
                </div>
              )}
              {aiResult && (
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="pt-4 pb-3">
                    <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1.5">
                      <ReactMarkdown>{aiResult}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!aiLoading && !aiResult && (
                <p className="text-xs text-muted-foreground">Genera el análisis para obtener un resumen comparativo con recomendaciones.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📧 Correo para Coordinador de Cadenas de Valor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              <p><strong>Para:</strong> Coordinador de Cadenas de Valor</p>
              <p><strong>Asunto:</strong> Resumen Regional {region} — {MESES[mes]} {anio}</p>
            </div>
            <Textarea
              className="min-h-[300px] text-xs font-mono"
              value={resumen ? buildPlainText(resumen) : ""}
              readOnly
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              if (resumen) {
                navigator.clipboard.writeText(buildPlainText(resumen));
                toast.success("Texto copiado — pégalo en tu correo");
              }
            }}>
              <Copy className="h-3 w-3 mr-1" /> Copiar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
