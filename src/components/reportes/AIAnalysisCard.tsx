import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { invokeAnalysis, type AnalysisTipo } from "@/lib/aiAnalysis";
import { toast } from "sonner";

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
        {loading ? "Analizando..." : `✨ ${label}`}
      </Button>

      {analysis && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Análisis generado por IA
              </p>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysis}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
