import { useState, useEffect, useCallback } from "react";
import { Save, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SeccionAvanceOperativo } from "./registro/SeccionAvanceOperativo";
import { SeccionEjecucionFinanciera } from "./registro/SeccionEjecucionFinanciera";
import { SeccionIndicadoresContextuales } from "./registro/SeccionIndicadoresContextuales";
import { useRole } from "@/contexts/RoleContext";
import type { ActividadDB } from "@/lib/supabaseQueries";
import { saveRegistroMensual, fetchRegistroExistente, fetchAcumuladoAnterior } from "@/lib/supabaseQueries";
import type { FuenteFinanciera, ContextualData } from "@/types/registroMensual";
import {
  createEmptyCapacitacion, createEmptyInnovacion,
  createEmptyGei, createEmptyNuevoProducto,
} from "@/types/registroMensual";

interface RegistroMensualDialogProps {
  actividad: ActividadDB | null;
  open: boolean;
  onClose: () => void;
}

function buildFuentes(act: ActividadDB): FuenteFinanciera[] {
  return [
    { key: "cofinanciamiento_seco", label: "SECO (Cooperación Suiza)", presupuesto: act.presupuesto_seco, ejecutado_acum: act.ejecutado_seco_acum, gastos: [] },
    { key: "contrapartida_monetaria", label: "Contrapartida Monetaria", presupuesto: act.presupuesto_contrapartida_monetaria, ejecutado_acum: act.ejecutado_cm_acum, gastos: [] },
    { key: "contrapartida_no_monetaria", label: "Contrapartida No Monetaria", presupuesto: act.presupuesto_contrapartida_no_monetaria, ejecutado_acum: act.ejecutado_cnm_acum, gastos: [] },
  ];
}

function buildContextual(tags: string[]): ContextualData {
  return {
    capacitacion: tags.includes("capacitacion") ? createEmptyCapacitacion() : undefined,
    innovacion: tags.includes("innovacion") ? createEmptyInnovacion() : undefined,
    gei: tags.includes("gei") ? createEmptyGei() : undefined,
    nuevo_producto: tags.includes("nuevo_producto") ? createEmptyNuevoProducto() : undefined,
  };
}

export function RegistroMensualDialog({ actividad, open, onClose }: RegistroMensualDialogProps) {
  const { entidadId } = useRole();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [anio, setAnio] = useState(now.getFullYear());
  const [valorAvance, setValorAvance] = useState(0);
  const [estado, setEstado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEjecucion, setFechaEjecucion] = useState<Date | undefined>();
  const [fuentes, setFuentes] = useState<FuenteFinanciera[]>([]);
  const [contextual, setContextual] = useState<ContextualData>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState<string | null>(null);
  const [lastActId, setLastActId] = useState<string | null>(null);
  if (actividad && actividad.id !== lastActId) {
    setLastActId(actividad.id);
    setFuentes(buildFuentes(actividad));
    setContextual(buildContextual(actividad.tags ?? []));
    setValorAvance(0);
    setEstado("");
    setDescripcion("");
    setFechaEjecucion(undefined);
    setIsEdit(false);
    setValidationErrors({});
    setObservaciones(null);
  }

  const loadExisting = useCallback(async () => {
    if (!actividad) return;
    setLoading(true);
    const existing = await fetchRegistroExistente(actividad.id, anio, mes + 1);
    if (existing) {
      setValorAvance(existing.avance_valor ?? 0);
      setEstado(existing.estado ?? "");
      setDescripcion(existing.descripcion_avance ?? "");
      setFechaEjecucion(existing.fecha_ejecucion ? parseISO(existing.fecha_ejecucion) : undefined);
      setIsEdit(true);
      setObservaciones(existing.observaciones_revision ?? null);
    } else {
      setValorAvance(0);
      setEstado("");
      setDescripcion("");
      setFechaEjecucion(undefined);
      setIsEdit(false);
    }
    setValidationErrors({});
    setLoading(false);
  }, [actividad?.id, anio, mes]);

  useEffect(() => {
    if (open && actividad) {
      loadExisting();
    }
  }, [open, actividad?.id, anio, mes, loadExisting]);

  if (!actividad) return null;

  const validate = (draft: boolean): boolean => {
    const errors: Record<string, string> = {};
    if (!draft) {
      if (valorAvance <= 0) errors.avance = "El valor de avance es obligatorio";
    }
    if (!estado) errors.estado = "Selecciona un estado";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (draft: boolean) => {
    if (!entidadId) {
      toast.error("Selecciona una entidad primero");
      return;
    }
    if (!validate(draft)) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setSaving(true);

    const allGastos = fuentes.flatMap((f) =>
      f.gastos
        .filter((g) => g.monto > 0 && g.tipo_gasto)
        .map((g) => ({
          actividad_id: actividad.id,
          fuente: f.key,
          monto: g.monto,
          tipo_gasto: g.tipo_gasto,
          fecha_gasto: g.fecha ? format(g.fecha, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        }))
    );

    const result = await saveRegistroMensual(
      {
        actividad_id: actividad.id,
        entidad_id: entidadId,
        anio,
        mes: mes + 1,
        avance_valor: valorAvance,
        estado,
        descripcion_avance: descripcion,
        estado_registro: draft ? "borrador" : "enviado",
      },
      allGastos,
      contextual
    );

    setSaving(false);

    if (result.success) {
      toast.success(
        draft ? (isEdit ? "Borrador actualizado" : "Borrador guardado exitosamente") : "Registro enviado para revisión",
        { description: `${actividad.codigo} — ${actividad.nombre}` }
      );
      onClose();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-4">
              <p className="text-xs font-mono text-muted-foreground mb-0.5">{actividad.codigo}</p>
              <SheetTitle className="text-base font-semibold leading-snug text-left">
                {isEdit ? "Editar Registro Mensual" : "Registro Mensual"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{actividad.nombre}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando registro...</span>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {observaciones && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <p className="text-xs font-semibold text-destructive mb-1">⚠️ Observaciones del revisor:</p>
                  <p className="text-xs text-destructive/80 italic">"{observaciones}"</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Corrige y vuelve a enviar.</p>
                </div>
              )}
              <SeccionAvanceOperativo
                mes={mes} anio={anio} valorAvance={valorAvance} estado={estado}
                descripcion={descripcion} fechaEjecucion={fechaEjecucion}
                unidadMedida={actividad.meta_unidad_medida}
                onMesChange={setMes} onAnioChange={setAnio}
                onValorAvanceChange={setValorAvance} onEstadoChange={setEstado}
                onDescripcionChange={setDescripcion} onFechaEjecucionChange={setFechaEjecucion}
                errors={validationErrors}
              />
              <Separator />
              <SeccionEjecucionFinanciera fuentes={fuentes} onFuentesChange={setFuentes} />
              {(actividad.tags ?? []).some((t) => ["capacitacion", "innovacion", "gei", "nuevo_producto"].includes(t)) && (
                <>
                  <Separator />
                  <SeccionIndicadoresContextuales
                    tags={actividad.tags ?? []}
                    contextual={contextual}
                    onContextualChange={setContextual}
                  />
                </>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-5 py-3 flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleSave(true)} disabled={saving || loading}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Guardar borrador
          </Button>
          <Button size="sm" className="flex-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleSave(false)} disabled={saving || loading}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Enviar para revisión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
