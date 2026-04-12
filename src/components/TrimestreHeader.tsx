import { CalendarDays } from "lucide-react";
import { useTrimestreActivo, getTrimestreLabel } from "@/hooks/useTrimestreActivo";

export function TrimestreHeader() {
  const { activo, isLoading } = useTrimestreActivo();

  if (isLoading) return null;

  if (!activo) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Sin trimestre activo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      <CalendarDays className="h-3.5 w-3.5 text-primary" />
      <span>Trimestre activo: <span className="text-primary">{getTrimestreLabel(activo)}</span></span>
    </div>
  );
}
