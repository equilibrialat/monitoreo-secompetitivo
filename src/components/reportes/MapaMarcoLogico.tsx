import { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown, ChevronsUpDown, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Indicador {
  codigo: string;
  nombre: string;
  nivel: string;
  meta: number | null;
  linea_base: number | null;
  unidad_medida: string | null;
}

interface Actividad {
  id: string;
  codigo: string;
  nombre: string;
  meta_valor?: number | null;
  meta_unidad_medida?: string | null;
  avance_operativo_pct?: number | null;
  estado_actual?: string | null;
  indicadores_vinculados?: string[] | null;
  producto_id?: string;
}

interface Producto {
  codigo: string;
  nombre: string;
  resultado_id?: string;
}

interface Resultado {
  codigo: string;
  nombre: string;
}

interface MapaMarcoLogicoProps {
  indicadores: Indicador[];
  actividades: Actividad[];
  productos?: { codigo: string; nombre: string; resultado_id: string }[];
  resultados?: { codigo: string; nombre: string }[];
  /** Grouped data from ReporteTrimestralCompleto */
  grouped?: Map<string, Map<string, Actividad[]>>;
  compact?: boolean;
}

function SemaforoIndicador({ pct }: { pct: number }) {
  const color = pct >= 66 ? "bg-emerald-500" : pct >= 33 ? "bg-amber-500" : "bg-destructive";
  return <span className={`inline-block w-3 h-3 rounded-full ${color} shrink-0`} />;
}

function SemaforoActividad({ estado, pct }: { estado: string | null; pct: number }) {
  if (estado === "culminado_100") return <span className="text-emerald-600 font-medium text-xs">✅ Culminado</span>;
  if (estado === "no_iniciada" || pct === 0) return <span className="text-muted-foreground text-xs">⚪ No iniciada</span>;
  return <span className="text-primary text-xs">🔵 {pct}%</span>;
}

export default function MapaMarcoLogico({ indicadores, actividades, grouped, compact }: MapaMarcoLogicoProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["indicadores", "resultados"]));
  const [hoveredIndicador, setHoveredIndicador] = useState<string | null>(null);
  const [hoveredActividad, setHoveredActividad] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = () => {
    const all = new Set<string>(["indicadores", "resultados"]);
    indicadores.forEach(i => all.add(`ind-${i.codigo}`));
    if (grouped) {
      Array.from(grouped.keys()).forEach(r => { all.add(`res-${r}`); });
      Array.from(grouped.values()).forEach(prods => {
        Array.from(prods.keys()).forEach(p => all.add(`prod-${p}`));
      });
    }
    setExpandedNodes(all);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  // Group indicadores by nivel
  const impacto = indicadores.filter(i => i.nivel === "RESULTADO DE IMPACTO");
  const finales = indicadores.filter(i => i.nivel === "RESULTADO FINAL");
  const intermedios = indicadores.filter(i => i.nivel === "RESULTADO INTERMEDIO");

  // Find which activities contribute to which indicators
  const actsByIndicador = useMemo(() => {
    const map = new Map<string, string[]>();
    actividades.forEach(a => {
      (a.indicadores_vinculados || []).forEach(code => {
        if (!map.has(code)) map.set(code, []);
        map.get(code)!.push(a.id);
      });
    });
    return map;
  }, [actividades]);

  // Find which indicators an activity contributes to
  const indicadoresByAct = useMemo(() => {
    const map = new Map<string, string[]>();
    actividades.forEach(a => {
      map.set(a.id, a.indicadores_vinculados || []);
    });
    return map;
  }, [actividades]);

  const isIndicadorHighlighted = (code: string) => {
    if (hoveredIndicador === code) return true;
    if (hoveredActividad) {
      const codes = indicadoresByAct.get(hoveredActividad) || [];
      return codes.includes(code);
    }
    return false;
  };

  const isActividadHighlighted = (actId: string) => {
    if (hoveredActividad === actId) return true;
    if (hoveredIndicador) {
      const acts = actsByIndicador.get(hoveredIndicador) || [];
      return acts.includes(actId);
    }
    return false;
  };

  function renderIndicadorRow(ind: Indicador) {
    const linkedActs = actsByIndicador.get(ind.codigo) || [];
    const avgPct = linkedActs.length > 0
      ? Math.round(actividades.filter(a => linkedActs.includes(a.id)).reduce((s, a) => s + (a.avance_operativo_pct || 0), 0) / linkedActs.length)
      : 0;
    const highlighted = isIndicadorHighlighted(ind.codigo);
    return (
      <div
        key={ind.codigo}
        className={cn(
          "flex items-center gap-2 py-1.5 px-3 rounded-md text-sm transition-colors",
          highlighted ? "bg-amber-100 dark:bg-amber-900/30" : "hover:bg-muted/50"
        )}
        onMouseEnter={() => setHoveredIndicador(ind.codigo)}
        onMouseLeave={() => setHoveredIndicador(null)}
      >
        <SemaforoIndicador pct={avgPct} />
        <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{ind.codigo}</span>
        <span className="text-foreground flex-1">{ind.nombre}</span>
        {ind.meta && (
          <span className="text-xs text-muted-foreground">Meta: {ind.meta} {ind.unidad_medida || ""}</span>
        )}
        <Badge variant="outline" className="text-[10px] ml-1">{avgPct}%</Badge>
      </div>
    );
  }

  function renderIndicadorGroup(title: string, items: Indicador[], key: string) {
    if (items.length === 0) return null;
    const isOpen = expandedNodes.has(key);
    return (
      <div className="ml-4 border-l-2 border-primary/20 pl-3">
        <button onClick={() => toggle(key)} className="flex items-center gap-2 py-2 w-full text-left hover:bg-muted/30 rounded-md px-2 transition-colors">
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </button>
        {isOpen && <div className="space-y-0.5 mt-1">{items.map(renderIndicadorRow)}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex gap-2 justify-end print:hidden">
        <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7">
          <Maximize2 className="h-3 w-3 mr-1" /> Expandir todo
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7">
          <Minimize2 className="h-3 w-3 mr-1" /> Colapsar todo
        </Button>
      </div>

      {/* Indicadores de Impacto */}
      {renderIndicadorGroup("INDICADORES DE IMPACTO", impacto, "ind-impacto")}
      {renderIndicadorGroup("RESULTADOS FINALES", finales, "ind-finales")}
      {renderIndicadorGroup("RESULTADOS INTERMEDIOS", intermedios, "ind-intermedios")}

      {/* Hierarchy: Resultado → Producto → Actividad */}
      {grouped && Array.from(grouped.entries()).map(([res, prods]) => {
        const resKey = `res-${res}`;
        const isResOpen = expandedNodes.has(resKey);
        return (
          <div key={res} className="ml-4 border-l-2 border-border pl-3">
            <button onClick={() => toggle(resKey)} className="flex items-center gap-2 py-2 w-full text-left hover:bg-muted/30 rounded-md px-2 transition-colors">
              {isResOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-semibold text-sm text-foreground">{res}</span>
            </button>
            {isResOpen && Array.from(prods.entries()).map(([prod, acts]) => {
              const prodKey = `prod-${prod}`;
              const isProdOpen = expandedNodes.has(prodKey);
              return (
                <div key={prod} className="ml-4 border-l-2 border-border/50 pl-3">
                  <button onClick={() => toggle(prodKey)} className="flex items-center gap-2 py-1.5 w-full text-left hover:bg-muted/30 rounded-md px-2 transition-colors">
                    {isProdOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-sm text-foreground">{prod}</span>
                    <span className="text-xs text-muted-foreground">({acts.length})</span>
                  </button>
                  {isProdOpen && (
                    <div className="ml-4 space-y-0.5 mt-1">
                      {acts.map(a => {
                        const pct = a.avance_operativo_pct || 0;
                        const highlighted = isActividadHighlighted(a.id);
                        const vinculados = a.indicadores_vinculados || [];
                        return (
                          <div
                            key={a.id}
                            className={cn(
                              "flex items-center gap-2 py-1.5 px-3 rounded-md text-sm transition-colors",
                              highlighted ? "bg-amber-100 dark:bg-amber-900/30" : "hover:bg-muted/50"
                            )}
                            onMouseEnter={() => setHoveredActividad(a.id)}
                            onMouseLeave={() => setHoveredActividad(null)}
                          >
                            <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">{a.codigo}</span>
                            <span className="text-foreground flex-1 truncate">{a.nombre}</span>
                            <SemaforoActividad estado={a.estado_actual || null} pct={pct} />
                            {vinculados.length > 0 && (
                              <span className="text-[10px] text-muted-foreground ml-1">→ {vinculados.join(", ")}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
