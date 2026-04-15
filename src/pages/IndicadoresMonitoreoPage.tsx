import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Filter, X, Loader2 } from "lucide-react";
import ArbolIndicadoresActividades from "@/components/dashboard/ArbolIndicadoresActividades";
import { useEntidadesDisponibles, type FiltrosIndicadores } from "@/hooks/useIndicadoresActividades";

const currentYear = new Date().getFullYear();
const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
const defaultTrimestre = `${currentYear}-T${currentQ}`;

export default function IndicadoresMonitoreoPage() {
  const { data: disponibles, isLoading: loadingDisp } = useEntidadesDisponibles();

  const [filtros, setFiltros] = useState<FiltrosIndicadores>({
    trimestre: defaultTrimestre,
    entidad_codigo: null,
    ri_codigo: null,
  });

  const activeBadges = useMemo(() => {
    const badges: { key: string; label: string }[] = [];
    badges.push({ key: "mec", label: "Mec B" });
    if (filtros.entidad_codigo) badges.push({ key: "entidad", label: filtros.entidad_codigo });
    if (filtros.ri_codigo) badges.push({ key: "ri", label: filtros.ri_codigo });
    return badges;
  }, [filtros]);

  const clearFilter = (key: string) => {
    if (key === "entidad") setFiltros(prev => ({ ...prev, entidad_codigo: null }));
    if (key === "ri") setFiltros(prev => ({ ...prev, ri_codigo: null }));
  };

  const riOptions = useMemo(() => {
    return [
      { value: "RI1", label: "RI1" },
      { value: "RI2", label: "RI2" },
      { value: "RI3", label: "RI3" },
    ];
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores del Marco Lógico</h1>
          <p className="text-muted-foreground text-sm">
            Vista consolidada: Resultado Intermedio → Actividades vinculadas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Trimestre</label>
              <Select
                value={filtros.trimestre}
                onValueChange={v => setFiltros(prev => ({ ...prev, trimestre: v }))}
              >
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(disponibles?.trimestres || [defaultTrimestre]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Resultado Intermedio</label>
              <Select
                value={filtros.ri_codigo || "todos"}
                onValueChange={v => setFiltros(prev => ({ ...prev, ri_codigo: v === "todos" ? null : v }))}
              >
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {riOptions.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Entidad</label>
              <Select
                value={filtros.entidad_codigo || "todos"}
                onValueChange={v => setFiltros(prev => ({ ...prev, entidad_codigo: v === "todos" ? null : v }))}
              >
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {(disponibles?.entidades || []).map(e => (
                    <SelectItem key={e.codigo} value={e.codigo}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setFiltros({ trimestre: defaultTrimestre, entidad_codigo: null, ri_codigo: null })}
            >
              Limpiar filtros
            </Button>
          </div>

          {/* Active filter badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activeBadges.map(b => (
              <Badge key={b.key} variant="secondary" className="text-[10px] gap-1 pr-1">
                {b.label}
                {b.key !== "mec" && (
                  <button onClick={() => clearFilter(b.key)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Árbol de indicadores */}
      {loadingDisp ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando datos disponibles...</span>
        </div>
      ) : (
        <ArbolIndicadoresActividades filtros={filtros} />
      )}
    </div>
  );
}
