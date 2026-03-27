import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinanceBar } from "@/components/FinanceBar";
import { ClipboardPlus } from "lucide-react";
import type { ActividadDB } from "@/lib/supabaseQueries";

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  en_ejecucion: { label: "En ejecución", className: "bg-primary/15 text-primary" },
  atrasado: { label: "Atrasado", className: "bg-destructive/15 text-destructive" },
  completado: { label: "Completado", className: "bg-success/15 text-success" },
};

function getSemaforoColor(avance: number): string {
  const gap = 100 - avance;
  if (gap <= 15) return "bg-success";
  if (gap <= 30) return "bg-warning";
  return "bg-destructive";
}

interface ActivityCardProps {
  actividad: ActividadDB;
  onRegistrar?: (actividad: ActividadDB) => void;
}

export function ActivityCard({ actividad, onRegistrar }: ActivityCardProps) {
  const estado = ESTADO_CONFIG[actividad.estado_actual] ?? ESTADO_CONFIG.pendiente;
  const semaforoColor = getSemaforoColor(actividad.avance_operativo_pct);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-mono text-muted-foreground mb-1">{actividad.codigo}</p>
          <h4 className="text-sm font-semibold text-card-foreground leading-snug">{actividad.nombre}</h4>
        </div>
        <Badge className={`shrink-0 text-xs ${estado.className}`}>{estado.label}</Badge>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Avance operativo</span>
          <span className="font-medium">{actividad.avance_operativo_pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all ${semaforoColor}`} style={{ width: `${actividad.avance_operativo_pct}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Meta: {actividad.meta_valor} {actividad.meta_unidad_medida}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <FinanceBar label="SECO" executed={actividad.ejecutado_seco_acum} budget={actividad.presupuesto_seco} colorClass="bg-primary" />
        <FinanceBar label="CM" executed={actividad.ejecutado_cm_acum} budget={actividad.presupuesto_contrapartida_monetaria} colorClass="bg-accent" />
        <FinanceBar label="CNM" executed={actividad.ejecutado_cnm_acum} budget={actividad.presupuesto_contrapartida_no_monetaria} colorClass="bg-sidebar-primary" />
      </div>

      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => onRegistrar?.(actividad)}>
        <ClipboardPlus className="h-3.5 w-3.5 mr-1.5" />
        Registrar avance
      </Button>
    </div>
  );
}
