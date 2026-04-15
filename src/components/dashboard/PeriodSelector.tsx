import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────── */

export interface PeriodRange {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  label: string; // Human-readable
}

export type PeriodPreset = "ultimo_mes" | "3_meses" | "6_meses" | "este_ano" | "personalizado";

/* ── Helpers ───────────────────────────────────────────── */

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function subMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
}

function fmtLabel(desde: Date, hasta: Date): string {
  const dM = MONTH_SHORT[desde.getMonth()];
  const hM = MONTH_SHORT[hasta.getMonth()];
  if (desde.getFullYear() === hasta.getFullYear()) {
    if (desde.getMonth() === hasta.getMonth()) return `${dM} ${desde.getFullYear()}`;
    return `${dM} – ${hM} ${hasta.getFullYear()}`;
  }
  return `${dM} ${desde.getFullYear()} – ${hM} ${hasta.getFullYear()}`;
}

function calcPreset(preset: PeriodPreset): PeriodRange {
  const now = new Date();
  const today = fmtDate(now);

  switch (preset) {
    case "ultimo_mes": {
      const desde = startOfMonth(now);
      return { desde: fmtDate(desde), hasta: today, label: fmtLabel(desde, now) };
    }
    case "3_meses": {
      const desde = startOfMonth(subMonths(now, 2));
      return { desde: fmtDate(desde), hasta: today, label: fmtLabel(desde, now) };
    }
    case "6_meses": {
      const desde = startOfMonth(subMonths(now, 5));
      return { desde: fmtDate(desde), hasta: today, label: fmtLabel(desde, now) };
    }
    case "este_ano": {
      const desde = startOfYear(now);
      return { desde: fmtDate(desde), hasta: today, label: `Ene – ${MONTH_SHORT[now.getMonth()]} ${now.getFullYear()}` };
    }
    default:
      return calcPreset("ultimo_mes");
  }
}

/* ── Public utilities ──────────────────────────────────── */

/** Default period = "Último mes" */
export function getDefaultPeriod(): PeriodRange {
  return calcPreset("ultimo_mes");
}

/** Convert PeriodRange to trimestre string for backward-compat queries */
export function periodToTrimestre(period: PeriodRange): string {
  const d = new Date(period.desde);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-T${q}`;
}

/** Convert PeriodRange to { anio, meses[] } groups for registros_mensuales */
export function periodToMeses(period: PeriodRange): { anio: number; meses: number[] }[] {
  const desde = new Date(period.desde);
  const hasta = new Date(period.hasta);
  const byYear = new Map<number, number[]>();

  const cur = new Date(desde.getFullYear(), desde.getMonth(), 1);
  while (cur <= hasta) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(m);
    cur.setMonth(cur.getMonth() + 1);
  }

  return Array.from(byYear, ([anio, meses]) => ({ anio, meses }));
}

/** Human-readable header string */
export function periodLabel(period: PeriodRange): string {
  return `Mostrando: ${period.label}`;
}

/** Build preset for report type shortcuts */
export function presetForReportType(tipo: "mensual" | "trimestral" | "semestral" | "anual"): PeriodRange {
  switch (tipo) {
    case "mensual": return calcPreset("ultimo_mes");
    case "trimestral": return calcPreset("3_meses");
    case "semestral": return calcPreset("6_meses");
    case "anual": return calcPreset("este_ano");
  }
}

/* ── Component ─────────────────────────────────────────── */

interface Props {
  value: PeriodRange;
  onChange: (period: PeriodRange) => void;
  className?: string;
}

export default function PeriodSelector({ value, onChange, className }: Props) {
  const [activePreset, setActivePreset] = useState<PeriodPreset>("ultimo_mes");
  const [customDesde, setCustomDesde] = useState<Date | undefined>();
  const [customHasta, setCustomHasta] = useState<Date | undefined>();

  const handlePreset = useCallback((preset: PeriodPreset) => {
    setActivePreset(preset);
    if (preset !== "personalizado") {
      onChange(calcPreset(preset));
    }
  }, [onChange]);

  const handleCustomApply = useCallback(() => {
    if (customDesde && customHasta) {
      const desde = customDesde < customHasta ? customDesde : customHasta;
      const hasta = customDesde < customHasta ? customHasta : customDesde;
      onChange({ desde: fmtDate(desde), hasta: fmtDate(hasta), label: fmtLabel(desde, hasta) });
    }
  }, [customDesde, customHasta, onChange]);

  const presets: { key: PeriodPreset; label: string }[] = [
    { key: "ultimo_mes", label: "Último mes" },
    { key: "3_meses", label: "3 meses" },
    { key: "6_meses", label: "6 meses" },
    { key: "este_ano", label: "Este año" },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Período:</span>
        {presets.map(p => (
          <Button
            key={p.key}
            variant={activePreset === p.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </Button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activePreset === "personalizado" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setActivePreset("personalizado")}
            >
              <CalendarIcon className="h-3 w-3" />
              Personalizado
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium mb-1">Desde</p>
                  <Calendar
                    mode="single"
                    selected={customDesde}
                    onSelect={setCustomDesde}
                    className="p-2 pointer-events-auto"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Hasta</p>
                  <Calendar
                    mode="single"
                    selected={customHasta}
                    onSelect={setCustomHasta}
                    className="p-2 pointer-events-auto"
                  />
                </div>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={handleCustomApply}
                disabled={!customDesde || !customHasta}>
                Aplicar período
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Badge variant="secondary" className="text-[10px]">
        📅 {value.label}
      </Badge>
    </div>
  );
}
