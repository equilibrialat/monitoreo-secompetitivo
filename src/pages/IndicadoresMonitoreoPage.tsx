import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Filter } from "lucide-react";

interface IndicadorConsolidado {
  codigo: string;
  nombre: string;
  nivel: string;
  unidad_medida: string | null;
  meta: number | null;
  avance: number;
  entidad_nombre?: string;
}

export default function IndicadoresMonitoreoPage() {
  const { entidades } = useRole();
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [filtroMecanismo, setFiltroMecanismo] = useState<string>("todos");
  const [filtroEntidad, setFiltroEntidad] = useState<string>("todos");
  const [indicadores, setIndicadores] = useState<IndicadorConsolidado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndicadores();
  }, []);

  async function fetchIndicadores() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("indicadores_proyecto")
      .select("codigo, nombre, nivel, unidad_medida, meta, entidad_id")
      .order("codigo");

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Enrich with entity names
    const enriched: IndicadorConsolidado[] = (data as any[]).map((ind) => {
      const ent = entidades.find((e) => e.id === ind.entidad_id);
      return {
        codigo: ind.codigo,
        nombre: ind.nombre,
        nivel: ind.nivel,
        unidad_medida: ind.unidad_medida,
        meta: ind.meta,
        avance: 0, // Will be enriched below
        entidad_nombre: ent?.nombre_corto || "—",
        entidad_id: ind.entidad_id,
      };
    });

    setIndicadores(enriched);
    setLoading(false);
  }

  const filteredIndicadores = indicadores.filter((ind) => {
    if (filtroNivel !== "todos" && ind.nivel !== filtroNivel) return false;
    if (filtroEntidad !== "todos") {
      const ent = entidades.find((e) => e.nombre_corto === ind.entidad_nombre);
      if (ent?.id !== filtroEntidad) return false;
    }
    if (filtroMecanismo !== "todos") {
      const ent = entidades.find((e) => e.nombre_corto === ind.entidad_nombre);
      if (!ent || ent.tipo_entidad !== filtroMecanismo) return false;
    }
    return true;
  });

  function getSemaforo(meta: number | null, avance: number) {
    if (!meta || meta === 0) return { color: "bg-muted text-muted-foreground", label: "Sin meta" };
    const pct = (avance / meta) * 100;
    if (pct >= 75) return { color: "bg-emerald-500/20 text-emerald-700", label: `${pct.toFixed(0)}%` };
    if (pct >= 40) return { color: "bg-amber-500/20 text-amber-700", label: `${pct.toFixed(0)}%` };
    return { color: "bg-red-500/20 text-red-700", label: `${pct.toFixed(0)}%` };
  }

  const niveles = ["todos", "impacto", "resultado", "producto"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores del Marco Lógico</h1>
          <p className="text-muted-foreground">Vista consolidada por nivel: Impacto → Resultado → Producto</p>
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
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="impacto">Impacto</SelectItem>
                  <SelectItem value="resultado">Resultado</SelectItem>
                  <SelectItem value="producto">Producto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mecanismo</label>
              <Select value={filtroMecanismo} onValueChange={setFiltroMecanismo}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
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

      {/* Indicators by level */}
      {["impacto", "resultado", "producto"].map((nivel) => {
        const indNivel = filteredIndicadores.filter((i) => i.nivel === nivel);
        if (filtroNivel !== "todos" && filtroNivel !== nivel) return null;
        return (
          <Card key={nivel}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 capitalize">
                <Badge variant="outline" className="text-xs uppercase">{nivel}</Badge>
                Indicadores de {nivel} ({indNivel.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {indNivel.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay indicadores de {nivel} registrados con los filtros actuales.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Indicador</TableHead>
                        <TableHead>Entidad</TableHead>
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead className="text-right">Avance</TableHead>
                        <TableHead className="text-center">Cumplimiento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indNivel.map((ind, idx) => {
                        const semaforo = getSemaforo(ind.meta, ind.avance);
                        return (
                          <TableRow key={`${ind.codigo}-${idx}`}>
                            <TableCell className="font-mono text-xs">{ind.codigo}</TableCell>
                            <TableCell className="max-w-[300px]">
                              <span className="text-sm">{ind.nombre}</span>
                              {ind.unidad_medida && (
                                <span className="text-xs text-muted-foreground ml-1">({ind.unidad_medida})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{ind.entidad_nombre}</TableCell>
                            <TableCell className="text-right font-mono">{ind.meta ?? "—"}</TableCell>
                            <TableCell className="text-right font-mono">{ind.avance}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={semaforo.color}>{semaforo.label}</Badge>
                            </TableCell>
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
      })}

      {loading && (
        <div className="text-center py-8 text-muted-foreground">Cargando indicadores...</div>
      )}
    </div>
  );
}
