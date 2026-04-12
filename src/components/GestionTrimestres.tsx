import { useState } from "react";
import { CalendarCheck, CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTrimestres, useActivarTrimestre, getTrimestreLabel, type Trimestre } from "@/hooks/useTrimestreActivo";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  cerrado: { label: "Cerrado", variant: "secondary" },
  activo: { label: "Activo", variant: "default" },
  planificacion: { label: "Planificación", variant: "outline" },
  futuro: { label: "Futuro", variant: "outline" },
};

export function GestionTrimestres() {
  const { data: trimestres, isLoading } = useTrimestres();
  const activarMut = useActivarTrimestre();
  const [confirmTrimestre, setConfirmTrimestre] = useState<Trimestre | null>(null);

  const activo = trimestres?.find(t => t.estado === "activo");
  const nextToActivate = trimestres?.find(t => t.estado === "planificacion" || t.estado === "futuro");

  const handleActivar = async () => {
    if (!confirmTrimestre) return;
    try {
      await activarMut.mutateAsync(confirmTrimestre.id);
      toast.success(`Trimestre ${getTrimestreLabel(confirmTrimestre)} activado`);
      setConfirmTrimestre(null);
    } catch (e: any) {
      toast.error("Error al activar trimestre", { description: e.message });
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-primary" />
          Gestión de Trimestres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!activo && nextToActivate && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
            <p className="text-sm text-warning font-medium mb-2">
              No hay trimestre activo
            </p>
            <Button
              size="sm"
              onClick={() => setConfirmTrimestre(nextToActivate)}
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1" />
              Activar {getTrimestreLabel(nextToActivate)}
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          {(trimestres || []).map(t => {
            const sl = STATUS_LABEL[t.estado] || STATUS_LABEL.futuro;
            const canActivate = t.estado === "planificacion" || t.estado === "futuro";
            return (
              <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{getTrimestreLabel(t)}</span>
                  <Badge variant={sl.variant} className="text-[10px]">{sl.label}</Badge>
                </div>
                {canActivate && !activo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => setConfirmTrimestre(t)}
                  >
                    Activar <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <ConfirmDialog
          open={!!confirmTrimestre}
          onCancel={() => setConfirmTrimestre(null)}
          title="Activar trimestre"
          description={confirmTrimestre
            ? `¿Activar ${getTrimestreLabel(confirmTrimestre)}?${activo ? ` Esto cerrará ${getTrimestreLabel(activo)} y habilitará la planificación para todas las entidades.` : " Esto habilitará la planificación para todas las entidades."}`
            : ""}
          onConfirm={handleActivar}
          confirmLabel="Activar"
        />
      </CardContent>
    </Card>
  );
}
