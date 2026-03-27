import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  ejecutivo:
    "Eres un analista senior del programa SeCompetitivo, un programa suizo-peruano de competitividad agrícola. Analiza los datos y genera un resumen ejecutivo en español con: 1) Estado general del programa, 2) Entidades con mejor y peor desempeño, 3) Alertas y riesgos, 4) Recomendaciones de acción inmediata. Sé conciso, usa datos específicos, máximo 300 palabras.",
  consistencia:
    "Eres un especialista en monitoreo de programas de desarrollo. Analiza esta trama físico-financiera y detecta: 1) Actividades con desfase técnico-financiero mayor a 20%, 2) Valores atípicos o improbables, 3) Entidades con patrones irregulares de ejecución, 4) Datos faltantes o inconsistentes. Responde en español, sé específico con códigos de actividad y entidades.",
  narrativa:
    "Eres asistente de redacción para informes de proyectos de desarrollo. Con base en los datos proporcionados, genera una descripción breve (2-3 oraciones) del avance de esta actividad en español. Sé factual, profesional y conciso.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no está configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tipo, datos } = await req.json();

    if (!tipo || !datos) {
      return new Response(
        JSON.stringify({ error: "Se requieren los campos 'tipo' y 'datos'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[tipo];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: `Tipo de análisis no soportado: ${tipo}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Analiza los siguientes datos:\n\n${JSON.stringify(datos, null, 2)}`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: `Error de la API de IA [${anthropicResponse.status}]` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await anthropicResponse.json();
    const text = result.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ resultado: text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "No se pudo generar el análisis. Intente nuevamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
