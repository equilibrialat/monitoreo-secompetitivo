import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const DOT_LEGEND = [
  { color: "bg-success", label: "Verde", desc: "Mes completado — ejecutado ≥ meta del mes" },
  { color: "bg-warning", label: "Amarillo", desc: "En progreso — hay avance pero no alcanza la meta aún" },
  { color: "bg-destructive", label: "Rojo", desc: "Mes vencido — el mes pasó con ejecutado < meta" },
  { color: "bg-muted-foreground", label: "Gris oscuro", desc: "Mes futuro — aún no ha comenzado" },
  { color: "bg-muted", label: "Gris claro", desc: "Sin plan aprobado — pendiente de planificación" },
];

const APPROVAL_LEGEND = [
  { icon: "📋", label: "Borrador", desc: "Plan guardado, no enviado a la entidad aún" },
  { icon: "⏳", label: "Propuesta enviada", desc: "Coordinador envió plan, entidad pendiente de respuesta" },
  { icon: "💬", label: "En disputa", desc: "Entidad comentó, coordinador debe resolver" },
  { icon: "✅", label: "Aprobada", desc: "Plan confirmado, registro habilitado" },
  { icon: "❌", label: "Rechazada", desc: "Coordinador rechazó ajuste solicitado" },
];

export function StatusLegendFab() {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-colors"
            aria-label="Leyenda de estados"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-80 p-4">
          <p className="text-sm font-semibold text-foreground mb-2">Estados de actividades</p>
          <div className="space-y-1.5">
            {DOT_LEGEND.map((d) => (
              <div key={d.label} className="flex items-start gap-2">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${d.color}`} />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{d.label}</span> — {d.desc}
                </p>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <p className="text-sm font-semibold text-foreground mb-2">Estados de aprobación de metas</p>
          <div className="space-y-1.5">
            {APPROVAL_LEGEND.map((a) => (
              <div key={a.label} className="flex items-start gap-2">
                <span className="mt-0.5 text-sm shrink-0">{a.icon}</span>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{a.label}</span> — {a.desc}
                </p>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Reusable dot tooltip descriptions */
export const DOT_TOOLTIPS: Record<string, string> = {
  complete: "Mes completado — ejecutado ≥ meta del mes",
  in_progress: "En progreso — avance registrado pero por debajo de la meta del mes",
  missed: "Mes vencido — el mes pasó con ejecutado < meta",
  future: "Mes futuro — aún no ha comenzado",
  no_plan: "Sin plan aprobado — pendiente de planificación",
};
