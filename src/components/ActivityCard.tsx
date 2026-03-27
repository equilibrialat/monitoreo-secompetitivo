import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinanceBar } from "@/components/FinanceBar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ClipboardPlus, CheckCircle2, Clock, Send, AlertTriangle, Minus } from "lucide-react";
import type { ActividadDB } from "@/lib/supabaseQueries";
import type { RegistroPendiente } from "@/lib/registroAprobacion";

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  no_iniciada: { label: "No iniciada", className: "bg-muted text-muted-foreground" },
  iniciado_1_35: { label: "Iniciado (1-35%)", className: "bg-warning/15 text-warning" },
  en_proceso_36_65: { label: "En proceso (36-65%)", className: "bg-primary/15 text-primary" },
  proceso_avanzado_66_99: { label: "Avanzado (66-99%)", className: "bg-success/15 text-success" },
  culminado_100: { label: "Culminado", className: "bg-success/20 text-success font-medium" },
};

const REGISTRO_BADGE: Record<string, { label: string; icon: any; className: string }> = {
  borrador: { label: "Borrador", icon: Minus, className: "bg-warning/15 text-warning" },
  enviado: { label: "Enviado", icon: Send, className: "bg-primary/10 text-primary" },
  en_revision_tecnica: { label: "Rev. Técnica", icon: Clock, className: "bg-warning/15 text-warning" },
  en_revision_financiera: { label: "Rev. Financiera", icon: Clock, className: "bg-accent/15 text-accent-foreground" },
  en_revision_coordinador: { label: "Rev. Coordinador", icon: Clock, className: "bg-primary/15 text-primary" },
  aprobado: { label: "Aprobado", icon: CheckCircle2, className: "bg-success/15 text-success" },
  observado: { label: "Observado", icon: AlertTriangle, className: "bg-destructive/15 text-destructive" },
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
  ultimoRegistro?: RegistroPendiente;
  currentMonthStatus?: string | null;
  indicadores?: Array<{ codigo: string; nombre: string; meta: number | null; linea_base: number | null }>;
}

export function ActivityCard({ actividad, onRegistrar, ultimoRegistro, currentMonthStatus, indicadores }: ActivityCardProps) {
  const estado = ESTADO_CONFIG[actividad.estado_actual] ?? ESTADO_CONFIG.no_iniciada;
  const semaforoColor = getSemaforoColor(actividad.avance_operativo_pct);

  const regBadge = ultimoRegistro ? REGISTRO_BADGE[ultimoRegistro.estado_registro || ""] : null;
  const isAprobado = ultimoRegistro?.estado_registro === "aprobado";
  const isLocked = ultimoRegistro?.estado_registro === "enviado" ||
    ultimoRegistro?.estado_registro === "en_revision_tecnica" ||
    ultimoRegistro?.estado_registro === "en_revision_financiera" ||
    isAprobado;

  // Current month completeness badge
  const monthBadge = currentMonthStatus
    ? REGISTRO_BADGE[currentMonthStatus]
    : { label: "Sin registro", icon: Minus, className: "bg-muted text-muted-foreground" };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-mono text-muted-foreground mb-1">{actividad.codigo}</p>
          <h4 className="text-sm font-semibold text-card-foreground leading-snug">{actividad.nombre}</h4>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`shrink-0 text-xs ${estado.className}`}>{estado.label}</Badge>
          {/* Current month status badge */}
          <Badge className={`shrink-0 text-[10px] ${monthBadge.className}`}>
            <monthBadge.icon className="h-3 w-3 mr-0.5" />
            {monthBadge.label}
          </Badge>
          {regBadge && ultimoRegistro?.estado_registro !== currentMonthStatus && (
            <Badge className={`shrink-0 text-[10px] ${regBadge.className}`}>
              <regBadge.icon className="h-3 w-3 mr-0.5" />
              {regBadge.label}
            </Badge>
          )}
        </div>
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

      {/* Indicadores vinculados */}
      {actividad.indicadores_vinculados && actividad.indicadores_vinculados.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-1 mb-3">
            {actividad.indicadores_vinculados.map((ind) => {
              const match = indicadores?.find(i => i.codigo === ind);
              return (
                <Tooltip key={ind}>
                  <TooltipTrigger asChild>
                    <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 cursor-help">
                      {ind}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-xs font-medium">{match?.nombre || ind}</p>
                    {match?.meta && <p className="text-[10px] text-muted-foreground">Meta: {match.meta}</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      <div className="space-y-2 mb-4">
        <FinanceBar label="SECO" executed={actividad.ejecutado_seco_acum} budget={actividad.presupuesto_seco} colorClass="bg-primary" />
        <FinanceBar label="CM" executed={actividad.ejecutado_cm_acum} budget={actividad.presupuesto_contrapartida_monetaria} colorClass="bg-accent" />
        <FinanceBar label="CNM" executed={actividad.ejecutado_cnm_acum} budget={actividad.presupuesto_contrapartida_no_monetaria} colorClass="bg-sidebar-primary" />
      </div>

      {isAprobado ? (
        <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-success font-medium">
          <CheckCircle2 className="h-4 w-4" /> Registro aprobado
        </div>
      ) : (
        <Button
          size="sm"
          variant={ultimoRegistro?.estado_registro === "observado" ? "destructive" : "outline"}
          className="w-full text-xs"
          onClick={() => onRegistrar?.(actividad)}
          disabled={isLocked}
        >
          <ClipboardPlus className="h-3.5 w-3.5 mr-1.5" />
          {isLocked ? "En revisión" : ultimoRegistro?.estado_registro === "observado" ? "Corregir y reenviar" : "Registrar avance"}
        </Button>
      )}
    </div>
  );
}
