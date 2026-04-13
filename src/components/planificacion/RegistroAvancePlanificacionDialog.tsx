import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PlanificacionActividad {
  id: string;
  actividad_codigo: string;
  actividad_descripcion: string;
  unidad_medida: string;
  resultado_intermedio_codigo: string;
  resultado_intermedio_descripcion: string;
  meta_total: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividad: PlanificacionActividad;
  entidadId: string;
  ejecutadoHastaHoy: number;
  onSaved: () => void;
}

export function RegistroAvancePlanificacionDialog({ open, onOpenChange, actividad, entidadId, ejecutadoHastaHoy, onSaved }: Props) {
  const [avanceCantidad, setAvanceCantidad] = useState<string>("");
  const [resumenResultado, setResumenResultado] = useState("");
  const [avanceLogrado, setAvanceLogrado] = useState("");
  const [limitaciones, setLimitaciones] = useState("");
  const [proximosPasos, setProximosPasos] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  async function handleSave() {
    if (!avanceLogrado.trim()) {
      toast.error("Describe el avance logrado antes de guardar.");
      return;
    }

    setSaving(true);

    // Find matching actividad in the actividades table
    const { data: actData } = await (supabase as any)
      .from("actividades")
      .select("id")
      .eq("entidad_id", entidadId)
      .eq("codigo", actividad.actividad_codigo)
      .maybeSingle();

    const actividadDbId = actData?.id;

    if (!actividadDbId) {
      toast.error("No se encontró la actividad vinculada en la base de datos.");
      setSaving(false);
      return;
    }

    const descripcionCompleta = [
      resumenResultado && `**Resumen del resultado (${actividad.resultado_intermedio_codigo}):**\n${resumenResultado}`,
      `**Avance logrado:**\n${avanceLogrado}`,
      limitaciones && `**Limitaciones:**\n${limitaciones}`,
      proximosPasos && `**Próximos pasos:**\n${proximosPasos}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const avanceNum = parseFloat(avanceCantidad) || 0;

    const { error } = await (supabase as any).from("registros_mensuales").insert({
      actividad_id: actividadDbId,
      entidad_id: entidadId,
      anio: anioActual,
      mes: mesActual,
      descripcion_avance: descripcionCompleta,
      avance_valor: avanceNum > 0 ? avanceNum : null,
      avance_unidad_medida: actividad.unidad_medida,
      prioridades_proximo_mes: proximosPasos || null,
      limitaciones: limitaciones || null,
      estado_registro: "borrador",
    });

    setSaving(false);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Avance registrado correctamente.");
      setAvanceCantidad("");
      setResumenResultado("");
      setAvanceLogrado("");
      setLimitaciones("");
      setProximosPasos("");
      onSaved();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Avance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Read-only context */}
          <div className="space-y-2 bg-muted/50 rounded-lg p-3 text-sm">
            <div>
              <span className="text-muted-foreground">Actividad: </span>
              <span className="font-mono font-bold text-primary">{actividad.actividad_codigo}</span>
              {" — "}
              <span>{actividad.actividad_descripcion}</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-muted-foreground">Unidad: </span>
                <span>{actividad.unidad_medida}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Meta total: </span>
                <span className="font-semibold">{actividad.meta_total} {actividad.unidad_medida}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-muted-foreground">Ejecutado hasta hoy: </span>
                <span className="font-semibold">{ejecutadoHastaHoy} {actividad.unidad_medida}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mes reportado: </span>
                <Badge variant="default" className="text-xs">{monthNames[mesActual - 1]} {anioActual}</Badge>
              </div>
            </div>
          </div>

          {/* Avance numérico */}
          <div>
            <Label className="text-xs text-muted-foreground">Avance este mes (cantidad)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={avanceCantidad}
                onChange={(e) => setAvanceCantidad(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">{actividad.unidad_medida} completadas este mes</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Resumen ejecutivo del resultado ({actividad.resultado_intermedio_codigo})
            </Label>
            <Textarea
              placeholder={`¿Qué está pasando a nivel del ${actividad.resultado_intermedio_codigo}?`}
              value={resumenResultado}
              onChange={(e) => setResumenResultado(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Avance logrado en esta actividad *</Label>
            <Textarea
              placeholder="¿Qué se hizo concretamente este mes?"
              value={avanceLogrado}
              onChange={(e) => setAvanceLogrado(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Limitaciones encontradas</Label>
            <Textarea
              placeholder="Dificultades, riesgos o bloqueos identificados"
              value={limitaciones}
              onChange={(e) => setLimitaciones(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Próximos pasos</Label>
            <Textarea
              placeholder="Acciones planificadas para el próximo mes"
              value={proximosPasos}
              onChange={(e) => setProximosPasos(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Guardar avance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
