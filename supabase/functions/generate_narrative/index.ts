import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory cache: key → { resultado, timestamp }
const cache = new Map<string, { resultado: string; timestamp: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type NarrativeTipo =
  | "resumen_entidad"
  | "alerta_actividad"
  | "briefing_director"
  | "resumen_para_informe"
  | "contexto_actividad";

const SYSTEM_PROMPT = `Eres el asistente de monitoreo del programa SeCompetitivo Fase III, un programa de competitividad agrícola y turística en Perú financiado por SECO. Tu función es transformar datos de avance en narrativas claras y accionables para cada tipo de usuario. Sé conciso, preciso y útil. Nunca inventes datos. Si la información es insuficiente, dilo claramente.`;

const TYPE_INSTRUCTIONS: Record<NarrativeTipo, string> = {
  resumen_entidad: `Genera un párrafo corto (3-4 oraciones) describiendo el estado de la entidad: qué avanzó, qué tiene pendiente, qué riesgo presenta. Tono: directo, técnico pero humano. No uses listas ni markdown, solo texto fluido.`,

  alerta_actividad: `Genera UNA frase de alerta con contexto y sugerencia de acción para el coordinador. Incluye: qué pasa, hace cuánto, y qué hacer. Ejemplo: "APPCACAO lleva 2 meses sin reportar A112 (Formación catadores). Sugerencia: confirmar reprogramación con Rafael."`,

  briefing_director: `Genera un briefing ejecutivo de 4-6 oraciones con: estado general del programa, 2-3 alertas prioritarias ordenadas por severidad, y una recomendación concreta de acción para la directora. Tono: ejecutivo, sin jerga técnica innecesaria. No uses listas, solo texto fluido.`,

  resumen_para_informe: `Genera una síntesis narrativa organizada por Resultado Intermedio. Para cada RI: 1-2 oraciones de avance, logros clave, y riesgos identificados. Al final: próximos compromisos del siguiente período. Este texto se usará como insumo para informes a SECO. Usa formato markdown con headers ##.`,

  contexto_actividad: `Genera una frase de 1-2 oraciones que explique a qué resultado intermedio contribuye esta actividad y por qué importa. Para mostrar como contexto en la vista de la entidad. Sin markdown, solo texto plano.`,
};

async function fetchContextData(
  supabaseClient: any,
  tipo: NarrativeTipo,
  params: Record<string, any>
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};

  if (tipo === "resumen_entidad" || tipo === "alerta_actividad" || tipo === "contexto_actividad") {
    const entidadCodigo = params.entidad_codigo;
    if (!entidadCodigo) return context;

    // Get entity info
    const { data: entidad } = await supabaseClient
      .from("entidades")
      .select("nombre_corto, nombre_completo, mecanismo, region, cadena_valor, titulo_proyecto")
      .eq("codigo", entidadCodigo)
      .single();
    context.entidad = entidad;

    // Get planificacion
    const { data: plan } = await supabaseClient
      .from("planificacion_actividades")
      .select("actividad_codigo, actividad_descripcion, resultado_intermedio_codigo, resultado_intermedio_descripcion, producto_codigo, meses_programados, meta_total, unidad_medida, presupuesto_seco_usd")
      .eq("entidad_codigo", entidadCodigo);
    context.actividades = plan || [];

    // Get reportes trimestrales
    const { data: rt } = await supabaseClient
      .from("reportes_trimestrales")
      .select("trimestre, resumen_tecnico_ri, avance_tecnico_trimestre, ejecutado_seco_total, presupuesto_seco_programado, meses_incluidos")
      .eq("entidad_codigo", entidadCodigo)
      .order("trimestre", { ascending: false })
      .limit(2);
    context.reportes_trimestrales = rt || [];

    // Get recent monthly reports
    const { data: entidadFull } = await supabaseClient
      .from("entidades")
      .select("id")
      .eq("codigo", entidadCodigo)
      .single();

    if (entidadFull?.id) {
      const { data: registros } = await supabaseClient
        .from("registros_mensuales")
        .select("actividad_id, anio, mes, avance_valor, descripcion_avance, limitaciones, estado_registro")
        .eq("entidad_id", entidadFull.id)
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .limit(20);
      context.registros_mensuales = registros || [];

      // Get comprobantes
      const { data: comps } = await supabaseClient
        .from("comprobantes")
        .select("monto_usd, trimestre, actividad_codigo")
        .eq("entidad_codigo", entidadCodigo);
      context.comprobantes_resumen = {
        total_ejecutado: (comps || []).reduce((s: number, c: any) => s + Number(c.monto_usd || 0), 0),
        count: (comps || []).length,
      };
    }

    if (tipo === "contexto_actividad" && params.actividad_codigo) {
      context.actividad_foco = (plan || []).find((a: any) => a.actividad_codigo === params.actividad_codigo);
    }
  }

  if (tipo === "briefing_director" || tipo === "resumen_para_informe") {
    // Get ALL Mec B entities with their data
    const { data: entidades } = await supabaseClient
      .from("entidades")
      .select("codigo, nombre_corto, mecanismo, region, cadena_valor")
      .eq("mecanismo", "B");

    const codigos = (entidades || []).map((e: any) => e.codigo);

    const { data: rt } = await supabaseClient
      .from("reportes_trimestrales")
      .select("entidad_codigo, trimestre, resumen_tecnico_ri, avance_tecnico_trimestre, ejecutado_seco_total, presupuesto_seco_programado")
      .in("entidad_codigo", codigos)
      .order("trimestre", { ascending: false });

    const { data: comps } = await supabaseClient
      .from("comprobantes")
      .select("entidad_codigo, monto_usd, trimestre")
      .in("entidad_codigo", codigos);

    const { data: reasig } = await supabaseClient
      .from("reasignaciones")
      .select("id, motivo, estado")
      .eq("estado", "solicitado");

    context.entidades = entidades || [];
    context.reportes_trimestrales = rt || [];
    context.comprobantes = comps || [];
    context.reasignaciones_pendientes = reasig || [];
    context.periodo = params.periodo || params.trimestre || "actual";
  }

  return context;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no está configurada" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const body = await req.json();
    const tipo = body.tipo as NarrativeTipo;
    const params = body.params || {};
    const forceRefresh = body.force_refresh === true;

    if (!tipo || !TYPE_INSTRUCTIONS[tipo]) {
      return new Response(
        JSON.stringify({ error: `Tipo no soportado: ${tipo}. Tipos válidos: ${Object.keys(TYPE_INSTRUCTIONS).join(", ")}` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Cache key
    const cacheKey = `${tipo}:${JSON.stringify(params)}`;

    // Check cache
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({
            resultado: cached.resultado,
            cached: true,
            cached_at: new Date(cached.timestamp).toISOString(),
          }),
          { status: 200, headers: jsonHeaders }
        );
      }
    }

    // Initialize Supabase client to fetch context data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Fetch context from DB
    const contextData = await fetchContextData(supabaseClient, tipo, params);

    // Check if we have sufficient data
    const hasData =
      (contextData.actividades && contextData.actividades.length > 0) ||
      (contextData.reportes_trimestrales && contextData.reportes_trimestrales.length > 0) ||
      (contextData.entidades && contextData.entidades.length > 0) ||
      (contextData.registros_mensuales && contextData.registros_mensuales.length > 0);

    if (!hasData) {
      return new Response(
        JSON.stringify({ error: "No hay datos suficientes para generar la narrativa." }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Build prompt
    const userPrompt = `${TYPE_INSTRUCTIONS[tipo]}

Parámetros de la solicitud:
${JSON.stringify(params, null, 2)}

Datos del programa:
${JSON.stringify(contextData, null, 2)}`;

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intente en unos minutos." }),
          { status: 429, headers: jsonHeaders }
        );
      }
      return new Response(
        JSON.stringify({ error: `Error de la API de IA [${response.status}]` }),
        { status: 502, headers: jsonHeaders }
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text ?? "";

    // Cache the result
    cache.set(cacheKey, { resultado: text, timestamp: Date.now() });

    return new Response(
      JSON.stringify({
        resultado: text,
        cached: false,
        generated_at: new Date().toISOString(),
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "No se pudo generar la narrativa. Intente nuevamente." }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
