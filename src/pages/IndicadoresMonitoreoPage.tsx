import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart3, Filter, ChevronDown } from "lucide-react";

interface IndicadorRow {
  id: string;
  codigo: string;
  nombre: string;
  nivel: string;
  unidad_medida: string | null;
  linea_base: number | null;
  meta: number | null;
  entidad_id: string;
  entidad_nombre: string;
  mecanismo: string;
}

interface LinkedActivity {
  codigo: string;
  nombre: string;
  avance_operativo_pct: number;
  estado_actual: string;
}

const NIVEL_ORDER = ["RESULTADO DE IMPACTO", "RESULTADO FINAL", "RESULTADO INTERMEDIO"];
const NIVEL_LABELS: Record<string, string> = {
  "RESULTADO DE IMPACTO": "Impacto",
  "RESULTADO FINAL": "Resultado Final",
  "RESULTADO INTERMEDIO": "Resultado Intermedio",
};

export default function IndicadoresMonitoreoPage() {
  const { entidades } = useRole();
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [filtroMecanismo, setFiltroMecanismo] = useState<string>("todos");
  const [filtroEntidad, setFiltroEntidad] = useState<string>("todos");
  const [indicadores, setIndicadores] = useState<IndicadorRow[]>([]);
  const [linkedActivities, setLinkedActivities] = useState<Map<string, LinkedActivity[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedIndicador, setExpandedIndicador] = useState<string | null>(null);

  useEffect(() => {
    fetchIndicadores();
  }, [entidades]);

  async function fetchIndicadores() {
    setLoading(true);
    const [indResult, actResult] = await Promise.all([
      (supabase as any)
        .from("indicadores_proyecto")
        .select("id, codigo, nombre, nivel, unidad_medida, linea_base, meta, entidad_id")
        .order("codigo"),
      (supabase as any)
        .from("actividades")
        .select("codigo, nombre, avance_operativo_pct, estado_actual, indicadores_vinculados, entidad_id"),
    ]);

    const data = indResult.data || [];
    const acts = actResult.data || [];

    const enriched: IndicadorRow[] = data.map((ind: any) => {
      const ent = entidades.find((e) => e.id === ind.entidad_id);
      return {
        ...ind,
        entidad_nombre: ent?.nombre_corto || "—",
        mecanismo: ent?.tipo_entidad || "",
      };
    });

    // Build linked activities map: indicador_codigo -> activities
    const linkMap = new Map<string, LinkedActivity[]>();
    for (const act of acts) {
      const vinculados = act.indicadores_vinculados || [];
      for (const indCode of vinculados) {
        if (!linkMap.has(indCode)) linkMap.set(indCode, []);
        linkMap.get(indCode)!.push({
          codigo: act.codigo,
          nombre: act.nombre,
          avance_operativo_pct: act.avance_operativo_pct ?? 0,
          estado_actual: act.estado_actual ?? "no_iniciada",
        });
      }
    }

    setIndicadores(enriched);
    setLinkedActivities(linkMap);
    setLoading(false);
  }

  const filtered = indicadores.filter((ind) => {
    if (filtroNivel !== "todos" && ind.nivel !== filtroNivel) return false;
    if (filtroEntidad !== "todos" && ind.entidad_id !== filtroEntidad) return false;
    if (filtroMecanismo !== "todos") {
      const ent = entidades.find((e) => e.id === ind.entidad_id);
      if (!ent) return false;
      if (filtroMecanismo === "mec_a" && (ent as any).tipo_entidad !== "iniciativa") return false;
      if (filtroMecanismo === "mec_b" && (ent as any).tipo_entidad !== "proyecto") return false;
    }
    return true;
  });

  function getSemaforo(meta: number | null, lineaBase: number | null) {
    if (!meta || meta === 0) return { icon: "⚪", label: "Sin meta", className: "bg-muted text-muted-foreground" };
    return { icon: "🔴", label: "0%", className: "bg-destructive/10 text-destructive" };
  }

  function getEstadoLabel(estado: string) {
    const map: Record<string, string> = {
      no_iniciada: "No iniciada",
      iniciado_1_35: "Iniciado",
      en_proceso_36_65: "En proceso",
      proceso_avanzado_66_99: "Avanzado",
      culminado_100: "Culminado",
    };
    return map[estado] || estado;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores del Marco Lógico</h1>
          <p className="text-muted-foreground">Vista consolidada por nivel: Impacto → Resultado Final → Resultado Intermedio</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nivel</label>
              <Select value={filtroNivel} onValueChange={setFiltroNivel}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  {NIVEL_ORDER.map(n => (
                    <SelectItem key={n} value={n}>{NIVEL_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mecanismo</label>
              <Select value={filtroMecanismo} onValueChange={setFiltroMecanismo}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="mec_a">Mecanismo A</SelectItem>
                  <SelectItem value="mec_b">Mecanismo B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Entidad</label>
              <Select value={filtroEntidad} onValueChange={setFiltroEntidad}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {entidades.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando indicadores...</div>
      ) : (
        NIVEL_ORDER.map((nivel) => {
          const indNivel = filtered.filter((i) => i.nivel === nivel);
          if (filtroNivel !== "todos" && filtroNivel !== nivel) return null;
          if (indNivel.length === 0 && filtroNivel === "todos") return null;

          return (
            <Card key={nivel}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Badge variant={nivel === "RESULTADO DE IMPACTO" ? "default" : "outline"} className="text-xs">
                    {NIVEL_LABELS[nivel]}
                  </Badge>
                  ({indNivel.length} indicadores)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {indNivel.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay indicadores de este nivel con los filtros actuales.
                  </p>
                ) : (
                  <div className="space-y-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]" />
                            <TableHead className="w-[100px]">Código</TableHead>
                            <TableHead>Indicador</TableHead>
                            <TableHead>Entidad</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead className="text-right">Línea Base</TableHead>
                            <TableHead className="text-right">Meta</TableHead>
                            <TableHead className="text-right">Valor Actual</TableHead>
                            <TableHead className="text-center">% Cumpl.</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {indNivel.map((ind) => {
                            const sem = getSemaforo(ind.meta, ind.linea_base);
                            const linked = linkedActivities.get(ind.codigo) || [];
                            const isExpanded = expandedIndicador === ind.id;
                            return (
                              <>
                                <TableRow
                                  key={ind.id}
                                  className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? "bg-muted/30" : ""}`}
                                  onClick={() => setExpandedIndicador(isExpanded ? null : ind.id)}
                                >
                                  <TableCell className="w-[40px] px-2">
                                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{ind.codigo}</TableCell>
                                  <TableCell className="max-w-[300px] text-sm">{ind.nombre}</TableCell>
                                  <TableCell className="text-sm">{ind.entidad_nombre}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{ind.unidad_medida || "—"}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{ind.linea_base ?? "—"}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{ind.meta ?? "—"}</TableCell>
                                  <TableCell className="text-right font-mono text-sm text-muted-foreground">—</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={sem.className}>{sem.label}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">{sem.icon}</TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow key={`${ind.id}-expanded`}>
                                    <TableCell colSpan={10} className="bg-muted/20 p-0">
                                      <div className="px-6 py-3">
                                        <p className="text-xs font-semibold text-primary mb-2">
                                          Actividades que contribuyen a este indicador:
                                        </p>
                                        {linked.length === 0 ? (
                                          <p className="text-xs text-muted-foreground italic">
                                            No hay actividades vinculadas a este indicador.
                                          </p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {linked.map((act) => (
                                              <div key={act.codigo} className="flex items-center gap-3 text-xs">
                                                <span className="font-mono text-muted-foreground w-12">{act.codigo}</span>
                                                <span className="text-foreground flex-1">{act.nombre}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                  {getEstadoLabel(act.estado_actual)}
                                                </Badge>
                                                <span className="font-mono text-muted-foreground w-12 text-right">
                                                  {act.avance_operativo_pct}%
                                                </span>
                                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                  <div
                                                    className={`h-full rounded-full ${act.avance_operativo_pct >= 66 ? "bg-emerald-500" : act.avance_operativo_pct >= 33 ? "bg-amber-500" : "bg-destructive"}`}
                                                    style={{ width: `${Math.min(act.avance_operativo_pct, 100)}%` }}
                                                  />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No se encontraron indicadores con los filtros seleccionados.</div>
      )}
    </div>
  );
}
