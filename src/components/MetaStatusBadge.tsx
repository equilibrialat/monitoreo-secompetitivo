import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { PlanEstado } from "@/lib/planTrimestral";

type StatusKey = PlanEstado | "sin_plan";

interface MetaStatusBadgeProps {
  estado: StatusKey;
  compact?: boolean;
}

const CONFIG: Record<StatusKey, {
  label: string;
  icon: typeof Lock;
  className: string;
  tooltip: string;
}> = {
  sin_plan: {
    label: "Sin plan",
    icon: Unlock,
    className: "bg-muted text-muted-foreground",
    tooltip: "No se ha definido un plan trimestral. El coordinador regional debe proponer uno.",
  },
  borrador: {
    label: "Borrador",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
    tooltip: "El coordinador está elaborando el plan trimestral.",
  },
  propuesta_coordinador: {
    label: "Plan propuesto",
    icon: Clock,
    className: "bg-warning/15 text-warning",
    tooltip: "El coordinador ha propuesto un plan trimestral. Pendiente de aceptación por la entidad.",
  },
  aprobada: {
    label: "Plan aprobado",
    icon: CheckCircle2,
    className: "bg-success/15 text-success",
    tooltip: "Plan trimestral aprobado. La entidad puede registrar avances.",
  },
  en_disputa: {
    label: "En disputa",
    icon: AlertTriangle,
    className: "bg-destructive/15 text-destructive",
    tooltip: "La entidad ha comentado sobre el plan. Pendiente de resolución del coordinador.",
  },
};

export function MetaStatusBadge({ estado, compact }: MetaStatusBadgeProps) {
  const config = CONFIG[estado] || CONFIG.sin_plan;
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} text-[10px] px-1.5 py-0.5 cursor-help gap-1`}>
            <Icon className="h-3 w-3" />
            {!compact && config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Dashboard chip variant for Iván's view */
export function MetaStatusChip({ estado }: { estado: StatusKey }) {
  if (estado === "aprobada") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-success font-medium">
        <CheckCircle2 className="h-2.5 w-2.5" /> Plan aprobado
      </span>
    );
  }
  if (estado === "propuesta_coordinador" || estado === "borrador") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground font-medium">
        <Clock className="h-2.5 w-2.5" /> En planificación
      </span>
    );
  }
  if (estado === "en_disputa") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-destructive font-medium">
        <AlertTriangle className="h-2.5 w-2.5" /> En disputa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-destructive font-medium">
      <Unlock className="h-2.5 w-2.5" /> Sin plan
    </span>
  );
}
