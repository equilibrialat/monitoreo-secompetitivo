import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

export interface CascadingFilterState {
  trimestre: string;
  region: string | null;
  mecanismo: string | null; // "A" | "B" | null
  entidad: string | null; // entidad codigo
}

interface EntidadInfo {
  codigo: string;
  nombre_corto: string;
  mecanismo: string;
  region: string;
}

interface Props {
  value: CascadingFilterState;
  onChange: (v: CascadingFilterState) => void;
  entidades: EntidadInfo[];
  trimestresDisponibles: string[];
  /** Hide mecanismo selector (e.g. for Iván / Coordinadores) */
  hideMecanismo?: boolean;
  /** Hide region selector (e.g. for Coordinador Regional with fixed region) */
  hideRegion?: boolean;
  /** Fixed mecanismo value (e.g. "B" for Iván) */
  fixedMecanismo?: string | null;
  /** Fixed region value (e.g. for Coordinador Regional) */
  fixedRegion?: string | null;
}

function calcTrimestreActual(): string {
  const mes = new Date().getMonth() + 1;
  const año = new Date().getFullYear();
  const t = mes <= 3 ? "T1" : mes <= 6 ? "T2" : mes <= 9 ? "T3" : "T4";
  return `${año}-${t}`;
}

export { calcTrimestreActual };

const TRIM_LABELS: Record<string, string> = {
  "2025-T3": "T3 2025 (Jul-Sep)",
  "2025-T4": "T4 2025 (Oct-Dic)",
  "2026-T1": "T1 2026 (Ene-Mar)",
  "2026-T2": "T2 2026 (Abr-Jun)",
};

export default function CascadingFilters({
  value,
  onChange,
  entidades,
  trimestresDisponibles,
  hideMecanismo = false,
  hideRegion = false,
  fixedMecanismo = null,
  fixedRegion = null,
}: Props) {
  const effectiveMec = fixedMecanismo || value.mecanismo;
  const effectiveRegion = fixedRegion || value.region;

  // Available regions (respecting mecanismo filter)
  const regiones = useMemo(() => {
    const filtered = entidades.filter(e => {
      if (effectiveMec && e.mecanismo !== effectiveMec) return false;
      return true;
    });
    return [...new Set(filtered.map(e => e.region).filter(Boolean))].sort();
  }, [entidades, effectiveMec]);

  // Available mecanismos (respecting region filter)
  const mecanismos = useMemo(() => {
    const filtered = entidades.filter(e => {
      if (effectiveRegion && e.region !== effectiveRegion) return false;
      return true;
    });
    return [...new Set(filtered.map(e => e.mecanismo).filter(Boolean))].sort();
  }, [entidades, effectiveRegion]);

  // Available entidades (respecting both filters)
  const entidadesFiltered = useMemo(() => {
    return entidades.filter(e => {
      if (effectiveMec && e.mecanismo !== effectiveMec) return false;
      if (effectiveRegion && e.region !== effectiveRegion) return false;
      return true;
    });
  }, [entidades, effectiveMec, effectiveRegion]);

  // Build trimestre options: merge configured + available
  const trimOptions = useMemo(() => {
    const currentT = calcTrimestreActual();
    const all = new Set([...trimestresDisponibles, currentT]);
    return [...all].sort().reverse();
  }, [trimestresDisponibles]);

  const setTrimestre = (v: string) => onChange({ ...value, trimestre: v });
  const setRegion = (v: string | null) => onChange({ ...value, region: v, mecanismo: fixedMecanismo || null, entidad: null });
  const setMecanismo = (v: string | null) => onChange({ ...value, mecanismo: v, entidad: null });
  const setEntidad = (v: string | null) => onChange({ ...value, entidad: v });

  const hasFilters = value.region !== null || value.mecanismo !== null || value.entidad !== null;
  const clearAll = () => onChange({ trimestre: value.trimestre, region: null, mecanismo: fixedMecanismo || null, entidad: null });

  // Active labels for pills
  const labels: string[] = [];
  if (value.region) labels.push(value.region);
  if (value.mecanismo) labels.push(`Mec ${value.mecanismo}`);
  if (value.entidad) {
    const ent = entidades.find(e => e.codigo === value.entidad);
    labels.push(ent?.nombre_corto || value.entidad);
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Trimestre selector — always shown */}
        <Select value={value.trimestre} onValueChange={setTrimestre}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Trimestre" />
          </SelectTrigger>
          <SelectContent>
            {trimOptions.map(t => (
              <SelectItem key={t} value={t}>{TRIM_LABELS[t] || t}{t === calcTrimestreActual() ? " (actual)" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region selector */}
        {!hideRegion && (
          <Select value={value.region || "_todas"} onValueChange={v => setRegion(v === "_todas" ? null : v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todas">Todas las regiones</SelectItem>
              {regiones.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Mecanismo selector */}
        {!hideMecanismo && (
          <Select value={value.mecanismo || "_todos"} onValueChange={v => setMecanismo(v === "_todos" ? null : v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Mecanismo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todos">Todos</SelectItem>
              {mecanismos.map(m => <SelectItem key={m} value={m}>Mecanismo {m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Entidad selector */}
        <Select value={value.entidad || "_todas"} onValueChange={v => setEntidad(v === "_todas" ? null : v)}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todas">Todas las entidades</SelectItem>
            {entidadesFiltered.map(e => <SelectItem key={e.codigo} value={e.codigo}>{e.nombre_corto}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {labels.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Filtros activos:</span>
          {labels.map(l => (
            <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
