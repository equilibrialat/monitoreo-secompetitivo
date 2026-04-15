import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ModalAvanceTecnicoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividadCodigo: string;
  actividadDescripcion: string;
  actividadId?: string;
  entidadId: string;
  onSaved?: () => void;
}

export default function ModalAvanceTecnico({
  open,
  onOpenChange,
  actividadCodigo,
  actividadDescripcion,
  actividadId,
  entidadId,
  onSaved,
}: ModalAvanceTecnicoProps) {
  const [descripcion, setDescripcion] = useState("");
  const [porcentaje, setPorcentaje] = useState<number>(0);
  const [fecha, setFecha] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!descripcion.trim()) {
      toast.error("Describe el avance realizado");
      return;
    }
    if (!actividadId) {
      toast.error("No se encontró el ID de la actividad en la tabla principal");
      return;
    }

    setSaving(true);
    try {
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();

      // Insert registro mensual
      const { error: regError } = await supabase.from("registros_mensuales").insert({
        actividad_id: actividadId,
        entidad_id: entidadId,
        mes,
        anio,
        descripcion_avance: descripcion.trim(),
        avance_valor: porcentaje,
        avance_unidad_medida: "%",
        fecha_ejecucion: format(fecha, "yyyy-MM-dd"),
        estado_registro: "borrador",
      });

      if (regError) throw regError;

      // Update avance_operativo_pct on actividades
      await supabase
        .from("actividades")
        .update({ avance_operativo_pct: porcentaje } as any)
        .eq("id", actividadId);

      toast.success("Avance técnico registrado");
      setDescripcion("");
      setPorcentaje(0);
      setFecha(new Date());
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message || "Intenta de nuevo"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Avance Técnico</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono font-bold text-primary">{actividadCodigo}</span> — {actividadDescripcion}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="desc-avance">Descripción del avance</Label>
            <Textarea
              id="desc-avance"
              placeholder="Describe las acciones realizadas y resultados obtenidos…"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pct">% de ejecución</Label>
              <Input
                id="pct"
                type="number"
                min={0}
                max={100}
                value={porcentaje}
                onChange={(e) => setPorcentaje(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fecha de ejecución</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fecha && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fecha ? format(fecha, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(d) => d && setFecha(d)}
                    locale={es}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
