import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { invokeAnalysis, type AnalysisTipo } from "@/lib/aiAnalysis";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Props {
  tipo: AnalysisTipo;
  datos: Record<string, unknown>;
  label?: string;
}

export default function AIAnalysisCard({ tipo, datos, label = "Generar análisis IA" }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setAnalysis(null);
    const result = await invokeAnalysis(tipo, datos);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setAnalysis(result.resultado || "");
    }
  }

  function handleCopy() {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    toast.success("Texto copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className="border-primary/30 text-primary hover:bg-primary/5"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
        {loading ? "Analizando..." : analysis ? `🔄 Regenerar análisis` : `🤖 ${label}`}
      </Button>

      {analysis && (
        <Card className="border-l-4 border-l-primary bg-background shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                📊 Análisis Estratégico — Generado por IA
                <span className="text-muted-foreground font-normal ml-2">
                  {new Date().toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading} className="h-7 text-xs">
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Regenerar
                </Button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-foreground">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 pt-2 border-t border-border/50 italic">
              Este análisis es una herramienta de apoyo. Los datos específicos están disponibles en las tablas del reporte.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
