import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NarrativeTipo =
  | "resumen_entidad"
  | "alerta_actividad"
  | "briefing_director"
  | "resumen_para_informe"
  | "contexto_actividad";

interface NarrativeResult {
  resultado: string;
  cached: boolean;
  generated_at?: string;
  cached_at?: string;
}

interface NarrativeState {
  text: string | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  generatedAt: string | null;
}

// Local cache to avoid re-calling for same params within session
const localCache = new Map<string, { text: string; timestamp: number; generatedAt: string }>();
const LOCAL_CACHE_TTL = 30 * 60 * 1000; // 30 min client-side

export function useNarrative(tipo: NarrativeTipo, params: Record<string, any>) {
  const [state, setState] = useState<NarrativeState>({
    text: null,
    loading: false,
    error: null,
    cached: false,
    generatedAt: null,
  });

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const cacheKey = `${tipo}:${JSON.stringify(params)}`;

  const generate = useCallback(async (forceRefresh = false) => {
    // Check local cache first
    if (!forceRefresh) {
      const cached = localCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < LOCAL_CACHE_TTL) {
        setState({
          text: cached.text,
          loading: false,
          error: null,
          cached: true,
          generatedAt: cached.generatedAt,
        });
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke("generate_narrative", {
        body: {
          tipo,
          params: paramsRef.current,
          force_refresh: forceRefresh,
        },
      });

      if (error) {
        console.error("Narrative error:", error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: "No se pudo generar el análisis.",
        }));
        return;
      }

      if (data?.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error,
        }));
        return;
      }

      const resultado = data?.resultado || "";
      const generatedAt = data?.generated_at || data?.cached_at || new Date().toISOString();

      // Update local cache
      localCache.set(cacheKey, {
        text: resultado,
        timestamp: Date.now(),
        generatedAt,
      });

      setState({
        text: resultado,
        loading: false,
        error: null,
        cached: !!data?.cached,
        generatedAt,
      });
    } catch (err) {
      console.error("Narrative fetch error:", err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "No se pudo generar el análisis.",
      }));
    }
  }, [tipo, cacheKey]);

  const refresh = useCallback(() => generate(true), [generate]);

  return { ...state, generate, refresh };
}

// Helper to get relative time label
export function timeAgo(isoDate: string | null): string {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
