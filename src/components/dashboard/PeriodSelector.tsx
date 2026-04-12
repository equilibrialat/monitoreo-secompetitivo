import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

type Frecuencia = "trimestral" | "semestral" | "anual";

interface Period {
  key: string;
  label: string;
  active: boolean;
}

function buildPeriods(freq: Frecuencia): Period[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const periods: Period[] = [];

  if (freq === "trimestral") {
    // Show trimesters from 2025-Q3 up to current
    const trims = [
      { y: 2026, q: 2, label: "Abr-Jun 2026" },
      { y: 2026, q: 1, label: "Ene-Mar 2026" },
      { y: 2025, q: 4, label: "Oct-Dic 2025" },
      { y: 2025, q: 3, label: "Jul-Sep 2025" },
    ];
    for (const t of trims) {
      const isActive = t.y === 2026 && t.q === 1;
      const isFuture = t.y > currentYear || (t.y === currentYear && t.q > Math.ceil(currentMonth / 3));
      if (isFuture && !isActive) continue;
      periods.push({
        key: `${t.y}-T${t.q}`,
        label: `${t.label}${isActive ? " (activo)" : " (cerrado)"}`,
        active: isActive,
      });
    }
  } else if (freq === "semestral") {
    periods.push(
      { key: "2026-S1", label: "Ene-Jun 2026 (en curso)", active: true },
      { key: "2025-S2", label: "Jul-Dic 2025 (cerrado)", active: false },
    );
  } else {
    periods.push(
      { key: "2026", label: "2026 (en curso)", active: true },
      { key: "2025", label: "2025 (cerrado)", active: false },
    );
  }

  return periods;
}

interface Props {
  value?: { frecuencia: Frecuencia; periodo: string };
  onChange: (v: { frecuencia: Frecuencia; periodo: string }) => void;
}

export default function PeriodSelector({ value, onChange }: Props) {
  const freq = value?.frecuencia ?? "trimestral";
  const periods = useMemo(() => buildPeriods(freq), [freq]);
  const selectedPeriod = value?.periodo ?? periods.find((p) => p.active)?.key ?? periods[0]?.key ?? "";
  const isHistorical = !periods.find((p) => p.key === selectedPeriod)?.active;

  const handleFreqChange = (f: Frecuencia) => {
    const newPeriods = buildPeriods(f);
    const activePeriod = newPeriods.find((p) => p.active)?.key ?? newPeriods[0]?.key ?? "";
    onChange({ frecuencia: f, periodo: activePeriod });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Segmented control */}
        <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
          {(["trimestral", "semestral", "anual"] as Frecuencia[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFreqChange(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                freq === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Period dropdown */}
        <Select value={selectedPeriod} onValueChange={(v) => onChange({ frecuencia: freq, periodo: v })}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.key} value={p.key} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isHistorical && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Viendo: {periods.find((p) => p.key === selectedPeriod)?.label.replace(/ \(.*\)/, "")} — solo lectura
        </div>
      )}
    </div>
  );
}

export type { Frecuencia };
