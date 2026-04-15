import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardData, type DashboardEntidad } from "@/hooks/useDashboardData";
import { useDashboardActividades, type ActividadSemaforo } from "@/hooks/useDashboardActividades";
import { Header, fmt, DashboardSkeleton } from "./DashboardEntidad";
import { DetailPanel } from "./DetailPanel";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bot, Copy, Check, FileText, Loader2, Settings, ArrowRight } from "lucide-react";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import NarrativeBlock from "./NarrativeBlock";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function semaforoEmoji(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴";
}

export default function DashboardMonitoreoNew() {
  const { data: allEntidades, isLoading } = useDashboardData();
  const { data: actividades, isLoading: actLoading } = useDashboardActividades();
  const navigate = useNavigate();
  const { setEntidadId, setRole, entidades: entidadOptions } = useRole();
  const [panel, setPanel] = useState<{ type: string; data?: any } | null>(null);

  // Report generator state
  const [reportTipo, setReportTipo] = useState<"mensual" | "trimestral" | "semestral">("trimestral");
  const [reportPeriodo, setReportPeriodo] = useState("");
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentYM = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const entidades = useMemo(() => (allEntidades || []).filter(e => e.has_data && e.mecanismo === "B"), [allEntidades]);

  // Build attention items
  const attentionItems = useMemo(() => {
    const items: { severity: "rojo" | "amarillo"; entidad: string; entidadId: string; codigo: string; descripcion: string; detalle: string }[] = [];

    // From actividades with red/yellow semaforo
    if (actividades) {
      for (const a of actividades) {
        if (a.mecanismo !== "B") continue;
        if (a.semaforo_global === "rojo") {
          items.push({
            severity: "rojo",
            entidad: a.entidad_nombre,
            entidadId: "",
            codigo: a.actividad_codigo,
            descripcion: a.actividad_descripcion,
            detalle: `Téc: ${a.pct_tecnico}% · Fin: ${a.pct_seco}%`,
          });
        }
      }
    }

    // From entities with low execution
    for (const e of entidades) {
      if (e.pct_ejecucion_seco < 40 && e.presupuesto_seco_total > 0) {
        items.push({
          severity: "amarillo",
          entidad: e.nombre_corto,
          entidadId: e.entidad_id,
          codigo: "",
          descripcion: `Ejecución financiera ${e.pct_ejecucion_seco}%`,
          detalle: `Debería estar más avanzada a esta altura del programa`,
        });
      }
    }

    items.sort((a, b) => (a.severity === "rojo" ? 0 : 1) - (b.severity === "rojo" ? 0 : 1));
    return items.slice(0, 10);
  }, [actividades, entidades]);

  const handleNavigateEntity = (entidadId: string) => {
    const ent = entidades.find(e => e.entidad_id === entidadId);
    if (ent) setRole(ent.mecanismo === "B" ? "entidad_mec_b" : "entidad_mec_a");
    setEntidadId(entidadId);
    navigate("/mi-planificacion");
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportResult(null);

    const { resultado, error } = await invokeAnalysis("reporte", {
      instrucciones: `Genera un informe ${reportTipo} para el período ${reportPeriodo || "actual"} del Mecanismo B del programa SeCompetitivo.`,
      entidades: entidades.map(e => ({
        nombre: e.nombre_corto,
        avance_operativo: e.avance_operativo_promedio,
        ejecucion_seco: e.pct_ejecucion_seco,
        ejecutado: e.ejecutado_seco_total,
        presupuesto: e.presupuesto_seco_total,
        meses_sin_reporte: e.meses_sin_reporte,
      })),
      tipo_informe: reportTipo,
      periodo: reportPeriodo,
    });

    setReportLoading(false);
    if (error) toast.error(error);
    else setReportResult(resultado ?? null);
  };

  const handleCopy = () => {
    if (reportResult) {
      navigator.clipboard.writeText(reportResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading || actLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Header title="Dashboard de Monitoreo" subtitle="Fabiola — Vista consolidada" />
        <Button variant="outline" size="sm" onClick={() => navigate("/administracion")} className="shrink-0">
          <Settings className="h-4 w-4 mr-1" /> Gestión de Trimestres
        </Button>
      </div>

      {/* BLOQUE A — Panel de atención prioritaria */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Requieren atención — {MONTH_SHORT[currentMonth - 1]} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attentionItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Sin alertas activas ✓</p>
          ) : (
            <div className="space-y-2">
              {attentionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => {
                    if (item.entidadId) handleNavigateEntity(item.entidadId);
                  }}>
                  <span className={`h-4 w-4 rounded-full shrink-0 mt-0.5 ${item.severity === "rojo" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {item.entidad}{item.codigo ? ` · ${item.codigo}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.descripcion}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.detalle}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entity cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entidades.map(e => (
          <Card key={e.entidad_id} className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleNavigateEntity(e.entidad_id)}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">{e.nombre_corto}</p>
                <Badge variant="outline" className="text-[10px]">{e.region}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Téc: {e.avance_operativo_promedio || 0}%</span>
                <span>Fin: {e.pct_ejecucion_seco}%</span>
                <span>USD {fmt(e.ejecutado_seco_total)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* BLOQUE B — Generador de informes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4" /> Generar informe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex gap-1">
              {(["mensual", "trimestral", "semestral"] as const).map(t => (
                <Button key={t} variant={reportTipo === t ? "default" : "outline"} size="sm" className="text-xs h-7"
                  onClick={() => setReportTipo(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
            <Select value={reportPeriodo} onValueChange={setReportPeriodo}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
                  return <SelectItem key={m} value={m}>{MONTH_SHORT[i]} {currentYear}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Button size="sm" className="text-xs h-7" onClick={handleGenerateReport} disabled={reportLoading}>
              {reportLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
              Generar
            </Button>
          </div>

          {reportResult && (
            <div className="border rounded p-3 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">Informe {reportTipo}</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <div className="prose prose-xs max-w-none text-xs">
                <ReactMarkdown>{reportResult}</ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
