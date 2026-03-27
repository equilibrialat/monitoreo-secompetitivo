import { cn } from "@/lib/utils";

interface FinanceBarProps {
  label: string;
  executed: number;
  budget: number;
  colorClass?: string;
}

export function FinanceBar({ label, executed, budget, colorClass = "bg-primary" }: FinanceBarProps) {
  const pct = budget > 0 ? Math.min((executed / budget) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
