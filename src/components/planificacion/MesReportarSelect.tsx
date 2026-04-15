import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getCurrentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatYMLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export type MesStatus = "rezagado" | "este_mes" | "futuro";

function getMesStatus(ym: string, currentYM: string): MesStatus {
  if (ym < currentYM) return "rezagado";
  if (ym === currentYM) return "este_mes";
  return "futuro";
}

const STATUS_INDICATOR: Record<MesStatus, { emoji: string; label: string; className: string }> = {
  rezagado: { emoji: "🔴", label: "Rezagado", className: "text-red-600" },
  este_mes: { emoji: "🟡", label: "Este mes", className: "text-yellow-600" },
  futuro:   { emoji: "⚪", label: "Futuro",   className: "text-muted-foreground" },
};

interface MesReportarSelectProps {
  mesesProgramados: string[];
  mesesReportados: Set<string>;
  value: string;
  onValueChange: (value: string) => void;
}

export default function MesReportarSelect({
  mesesProgramados,
  mesesReportados,
  value,
  onValueChange,
}: MesReportarSelectProps) {
  const currentYM = getCurrentYM();
  const mesesPendientes = [...mesesProgramados]
    .filter((m) => !mesesReportados.has(m))
    .sort();

  return (
    <div className="space-y-1.5">
      <Label>Mes a reportar</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona el mes…" />
        </SelectTrigger>
        <SelectContent>
          {mesesPendientes.length === 0 ? (
            <SelectItem value="__none" disabled>
              Todos los meses ya reportados
            </SelectItem>
          ) : (
            mesesPendientes.map((ym) => {
              const status = getMesStatus(ym, currentYM);
              const cfg = STATUS_INDICATOR[status];
              return (
                <SelectItem key={ym} value={ym}>
                  <span className="flex items-center gap-2">
                    <span>{cfg.emoji}</span>
                    <span>{formatYMLabel(ym)}</span>
                    <span className={`text-[10px] ${cfg.className}`}>({cfg.label})</span>
                  </span>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Parse a "YYYY-MM" string into { mes: number, anio: number } */
export function parseMesReportar(ym: string): { mes: number; anio: number } {
  const [y, m] = ym.split("-");
  return { mes: parseInt(m), anio: parseInt(y) };
}
