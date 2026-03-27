import { supabase } from "@/integrations/supabase/client";

export type AnalysisTipo = "ejecutivo" | "consistencia" | "narrativa";

interface AnalysisResult {
  resultado?: string;
  error?: string;
}

export async function invokeAnalysis(
  tipo: AnalysisTipo,
  datos: Record<string, unknown>
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const { data, error } = await supabase.functions.invoke("analyze", {
      body: { tipo, datos },
    });

    clearTimeout(timeout);

    if (error) {
      console.error("Edge function error:", error);
      return { error: "No se pudo generar el análisis. Intente nuevamente." };
    }

    if (data?.error) {
      return { error: data.error };
    }

    if (!data?.resultado) {
      return { error: "No hay datos suficientes para generar el análisis." };
    }

    return { resultado: data.resultado };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      return { error: "La solicitud tardó demasiado. Intente nuevamente." };
    }
    return { error: "No se pudo generar el análisis. Intente nuevamente." };
  }
}
