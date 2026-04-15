import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronDown, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "./DashboardEntidad";
import type { ActividadSemaforo } from "@/hooks/useDashboardActividades";
import type { DashboardEntidad } from "@/hooks/useDashboardData";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function semaforoEmoji(sem: "verde" | "amarillo" | "rojo") {
  return sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴";
}

interface Props {
  entidad: DashboardEntidad;
  actividades: ActividadSemaforo[];
  trimestre: string;
  obsText: string;
  setObsText: (t: string) => void;
  onSaveObs: (entCodigo: string, actCodigo: string) => void;
  obsSaving: boolean;
}

export default function SuccinctTreePanel({
  entidad, actividades, trimestre, obsText, setObsText, onSaveObs, obsSaving,
}: Props) {
  const [expandedAct, setExpandedAct] = useState<string | null>(null);

  // Group by RI
  const byRI = useMemo(() => {
    const map = new Map<string, ActividadSemaforo[]>();
    for (const a of actividades) {
      const ri = a.resultado_intermedio_codigo || "Sin RI";
      const arr = map.get(ri) || [];
      arr.push(a);
      map.set(ri, arr);
    }
    return map;
  }, [actividades]);

  // Determine which RIs have red activities (expand by default)
  const risWithRed = useMemo(() => {
    const set = new Set<string>();
    for (const [ri, acts] of byRI) {
      if (acts.some(a => a.semaforo_global === "rojo")) set.add(ri);
    }
    return set;
  }, [byRI]);

  const [collapsedRIs, setCollapsedRIs] = useState<Set<string>>(() => {
    // Collapse RIs without red activities
    const collapsed = new Set<string>();
    for (const ri of byRI.keys()) {
      if (!risWithRed.has(ri)) collapsed.add(ri);
    }
    return collapsed;
  });

  const toggleRI = (ri: string) => {
    setCollapsedRIs(prev => {
      const next = new Set(prev);
      if (next.has(ri)) next.delete(ri);
      else next.add(ri);
      return next;
    });
  };

  // RI-level semaforo
  function riSemaforo(acts: ActividadSemaforo[]): "verde" | "amarillo" | "rojo" {
    if (acts.some(a => a.semaforo_global === "rojo")) return "rojo";
    if (acts.some(a => a.semaforo_global === "amarillo")) return "amarillo";
    return "verde";
  }

  if (actividades.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center py-6">
          {entidad.sin_planificacion
            ? "Planificación pendiente de carga. Solo hay datos de reportes trimestrales."
            : "Sin actividades registradas para esta entidad."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {entidad.cadena_valor && <Badge variant="outline" className="text-[10px]">{entidad.cadena_valor}</Badge>}
        <Badge variant="outline" className="text-[10px]">{entidad.region}</Badge>
        <Badge variant="outline" className="text-[10px]">{trimestre}</Badge>
        {entidad.sin_planificacion && <Badge variant="outline" className="text-[10px] bg-muted">Plan pendiente</Badge>}
      </div>

      {/* RI Tree */}
      {[...byRI.entries()].map(([ri, acts]) => {
        const riSem = riSemaforo(acts);
        const isCollapsed = collapsedRIs.has(ri);

        return (
          <div key={ri} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleRI(ri)}
              className="flex items-center gap-2 w-full p-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
              <span className="text-xs">📊</span>
              <span className="text-xs font-semibold flex-1 truncate">
                {ri} — {acts[0]?.resultado_intermedio || ""}
              </span>
              <span className="text-xs mr-1">{semaforoEmoji(riSem)}</span>
              <span className="text-[10px] text-muted-foreground">{acts.length} activ.</span>
            </button>

            {!isCollapsed && (
              <div className="border-t divide-y">
                {acts.map(a => {
                  const isExpanded = expandedAct === `${a.entidad_codigo}-${a.actividad_codigo}`;
                  const actKey = `${a.entidad_codigo}-${a.actividad_codigo}`;

                  return (
                    <div key={actKey}>
                      <button
                        onClick={() => setExpandedAct(isExpanded ? null : actKey)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-xs font-mono text-primary shrink-0">{a.actividad_codigo}</span>
                        <span className="text-[11px] flex-1 truncate">{a.actividad_descripcion}</span>

                        {/* Months badges — compact: only show reported months */}
                        {a.meses_programados.length > 0 && (
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {a.meses_programados.length > 0 
                              ? `${a.meses_programados[0].slice(5)}→${a.meses_programados[a.meses_programados.length - 1].slice(5)}`
                              : ""}
                          </span>
                        )}

                        {/* Progress */}
                        <span className="text-[10px] font-mono shrink-0">
                          {a.avance_tecnico}/{a.meta_total || "—"}
                        </span>

                        {/* Semaforo */}
                        <span className="text-xs shrink-0">{semaforoEmoji(a.semaforo_global)}</span>
                      </button>

                      {/* Expanded detail — inline */}
                      {isExpanded && (
                        <ExpandedActDetail
                          actividad={a}
                          obsText={obsText}
                          setObsText={setObsText}
                          onSaveObs={() => onSaveObs(a.entidad_codigo, a.actividad_codigo)}
                          obsSaving={obsSaving}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* General observation at the bottom */}
      <div className="border rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold">Observación general sobre {entidad.nombre_corto}</p>
        <Textarea
          value={obsText}
          onChange={e => setObsText(e.target.value)}
          placeholder={`Escribir observación sobre ${entidad.nombre_corto}...`}
          className="text-xs min-h-[60px]"
        />
        <Button size="sm" className="text-xs h-7" onClick={() => onSaveObs(entidad.codigo, "_general")} disabled={obsSaving || !obsText.trim()}>
          <Save className="h-3 w-3 mr-1" /> Guardar observación
        </Button>
      </div>
    </div>
  );
}

function ExpandedActDetail({
  actividad, obsText, setObsText, onSaveObs, obsSaving,
}: {
  actividad: ActividadSemaforo;
  obsText: string;
  setObsText: (t: string) => void;
  onSaveObs: () => void;
  obsSaving: boolean;
}) {
  // Fetch latest monthly report for this activity
  const { data: lastReport } = useQuery({
    queryKey: ["succinct-last-report", actividad.entidad_codigo, actividad.actividad_codigo],
    queryFn: async () => {
      const { data: ent } = await (supabase as any).from("entidades").select("id").eq("codigo", actividad.entidad_codigo).single();
      if (!ent) return null;
      const { data: act } = await (supabase as any).from("actividades").select("id").eq("codigo", actividad.actividad_codigo).eq("entidad_id", ent.id).single();
      if (!act) return null;
      const { data } = await (supabase as any).from("registros_mensuales")
        .select("anio, mes, descripcion_avance, prioridades_proximo_mes, avance_valor, avance_unidad_medida")
        .eq("entidad_id", ent.id)
        .eq("actividad_id", act.id)
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    staleTime: 60_000,
  });

  // Fetch observaciones for this activity
  const { data: observaciones } = useQuery({
    queryKey: ["succinct-obs", actividad.entidad_codigo, actividad.actividad_codigo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("observaciones_coordinador")
        .select("*")
        .eq("entidad_codigo", actividad.entidad_codigo)
        .eq("actividad_codigo", actividad.actividad_codigo)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: 60_000,
  });

  return (
    <div className="bg-muted/20 px-4 py-3 space-y-2 border-t">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-xs">
          <span className="text-muted-foreground">Téc:</span>{" "}
          <span className="font-mono font-medium">{actividad.avance_tecnico}/{actividad.meta_total} {actividad.unidad_medida} ({actividad.pct_tecnico}%)</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">SECO:</span>{" "}
          <span className="font-mono font-medium">USD {fmt(actividad.ejecutado_seco)} ({actividad.pct_seco}%)</span>
        </div>
      </div>

      {/* Last report */}
      {lastReport ? (
        <div className="border rounded p-2 text-xs space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold">
            Último reporte: {MONTH_SHORT[(lastReport.mes || 1) - 1]} {lastReport.anio}
          </p>
          {lastReport.descripcion_avance && <p><span className="font-medium">Logros:</span> {lastReport.descripcion_avance}</p>}
          {lastReport.prioridades_proximo_mes && <p><span className="font-medium">Próximos pasos:</span> {lastReport.prioridades_proximo_mes}</p>}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Sin reportes mensuales registrados</p>
      )}

      {/* Existing observations */}
      {observaciones && observaciones.length > 0 && (
        <div className="space-y-1">
          {observaciones.map((o: any) => (
            <div key={o.id} className="p-1.5 rounded bg-muted/40 text-[10px]">
              <p>{o.texto}</p>
              <p className="text-muted-foreground">{o.mes} · {o.autor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
