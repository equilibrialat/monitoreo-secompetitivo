import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Sparkles } from "lucide-react";
import { useNarrative, timeAgo, type NarrativeTipo } from "@/hooks/useNarrative";

interface Props {
  tipo: NarrativeTipo;
  params: Record<string, any>;
  autoLoad?: boolean;
  className?: string;
}

export default function NarrativeBlock({ tipo, params, autoLoad = true, className }: Props) {
  const { text, loading, error, cached, generatedAt, generate, refresh } = useNarrative(tipo, params);

  useEffect(() => {
    if (autoLoad && !text && !loading && !error) {
      generate();
    }
  }, [autoLoad, text, loading, error, generate]);

  if (loading && !text) {
    return (
      <Card className={`border-l-4 border-l-primary/30 ${className || ""}`}>
        <CardContent className="py-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error && !text) {
    return null; // Graceful degradation — hide if no data
  }

  if (!text) return null;

  return (
    <Card className={`border-l-4 border-l-primary/20 bg-primary/[0.02] ${className || ""}`}>
      <CardContent className="py-4">
        <p className="text-sm leading-relaxed text-foreground">{text}</p>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Generado por IA{cached ? " (caché)" : ""} · {timeAgo(generatedAt)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] px-1.5 ml-auto"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-0.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
