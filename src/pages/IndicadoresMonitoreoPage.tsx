import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Filter } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndicadores();
  }, [entidades]);

  async function fetchIndicadores() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("indicadores_proyecto")
      .select("id, codigo, nombre, nivel, unidad_medida, linea_base, meta, entidad_id")
      .order("codigo");

    if (error || !data) {
      setLoading(false);
      return;
    }

    const enriched: IndicadorRow[] = (data as any[]).map((ind) => {
      const ent = entidades.find((e) => e.id === ind.entidad_id);
      return {
        ...ind,
        entidad_nombre: ent?.nombre_corto || "—",
        mecanismo: ent?.tipo_entidad || "",
      };
    });

    setIndicadores(enriched);
    setLoading(false);
  }

  const filtered = indicadores.filter((ind) => {
    if (filtroNivel !== "todos" && ind.nivel !== filtroNivel) return false;
    if (filtroEntidad !== "todos" && ind.entidad_id !== filtroEntidad) return false;
    if (filtroMecanismo !== "todos") {
      const ent = entidades.find((e) => e.id === ind.entidad_id);
      if (!ent) return false;
      // Map mecanismo filter to entidad field
      if (filtroMecanismo === "mec_a" && (ent as any).tipo_entidad !== "iniciativa") return false;
      if (filtroMecanismo === "mec_b" && (ent as any).tipo_entidad !== "proyecto") return false;
    }
    return true;
  });

  function getSemaforo(meta: number | null, lineaBase: number | null) {
    if (!meta || meta === 0) return { icon: "⚪", label: "Sin meta", className: "bg-muted text-muted-foreground" };
    // Since no actual progress data yet, show 0%
    return { icon: "🔴", label: "0%", className: "bg-destructive/10 text-destructive" };
  }

  // Get unique niveles from data
  const nivelesPresentes = NIVEL_ORDER.filter(n => indicadores.some(i => i.nivel === n));

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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                          return (
                            <TableRow key={ind.id}>
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
                          );
                        })}
                      </TableBody>
                    </Table>
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
