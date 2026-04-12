import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { MetaEstado } from "@/lib/metasMensuales";

interface MetaStatusBadgeProps {
  estado: MetaEstado;
  metaValor?: number | null;
  comentario?: string | null;
  compact?: boolean;
}

const CONFIG: Record<MetaEstado, {
  label: string;
  icon: typeof Lock;
  className: string;
  tooltip: string;
}> = {
  sin_meta: {
    label: "Sin meta definida",
    icon: Unlock,
    className: "bg-muted text-muted-foreground",
    tooltip: "No se ha definido una meta para este periodo. Propón una meta para habilitar el registro.",
  },
  pendiente_aprobacion: {
    label: "En revisión",
    icon: Clock,
    className: "bg-warning/15 text-warning",
    tooltip: "Propuesta enviada — el coordinador regional debe aprobar la meta antes de poder registrar avance.",
  },
  aprobada: {
    label: "Meta aprobada",
    icon: CheckCircle2,
    className: "bg-success/15 text-success",
    tooltip: "Meta aprobada por el coordinador regional. Puedes registrar avance.",
  },
  rechazada: {
    label: "Meta rechazada",
    icon: AlertTriangle,
    className: "bg-destructive/15 text-destructive",
    tooltip: "Meta rechazada por el coordinador. Revisa el comentario y reenvía la propuesta.",
  },
};

export function MetaStatusBadge({ estado, metaValor, comentario, compact }: MetaStatusBadgeProps) {
  const config = CONFIG[estado];
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} text-[10px] px-1.5 py-0.5 cursor-help gap-1`}>
            <Icon className="h-3 w-3" />
            {!compact && config.label}
            {!compact && metaValor != null && estado !== "sin_meta" && (
              <span className="font-mono ml-0.5">({metaValor})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <p className="text-xs">{config.tooltip}</p>
          {comentario && estado === "rechazada" && (
            <p className="text-xs text-destructive mt-1 italic">"{comentario}"</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Dashboard chip variant for Iván's view */
export function MetaStatusChip({ estado }: { estado: MetaEstado }) {
  if (estado === "aprobada") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-success font-medium">
        <CheckCircle2 className="h-2.5 w-2.5" /> Meta aprobada
      </span>
    );
  }
  if (estado === "pendiente_aprobacion") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground font-medium">
        <Clock className="h-2.5 w-2.5" /> En planificación
      </span>
    );
  }
  if (estado === "rechazada") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-destructive font-medium">
        <AlertTriangle className="h-2.5 w-2.5" /> Rechazada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-destructive font-medium">
      <Unlock className="h-2.5 w-2.5" /> Sin meta
    </span>
  );
}
