import { useState } from "react";
import { Save, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SeccionAvanceOperativo } from "./registro/SeccionAvanceOperativo";
import { SeccionEjecucionFinanciera } from "./registro/SeccionEjecucionFinanciera";
import { SeccionIndicadoresContextuales } from "./registro/SeccionIndicadoresContextuales";
import { useRole } from "@/contexts/RoleContext";
import type { ActividadDB } from "@/lib/supabaseQueries";
import { saveRegistroMensual } from "@/lib/supabaseQueries";
import type { FuenteFinanciera, RegistroCapacitacion } from "@/types/registroMensual";

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

const EMPTY_CAPACITACION: RegistroCapacitacion = {
  tema: "", num_participantes_hombres: 0, num_participantes_mujeres: 0,
  horas_capacitacion: 0, lugar: "", fecha: undefined, metodologia: "",
};

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
  const [capacitacion, setCapacitacion] = useState<RegistroCapacitacion>({ ...EMPTY_CAPACITACION });
  const [saving, setSaving] = useState(false);

  const [lastActId, setLastActId] = useState<string | null>(null);
  if (actividad && actividad.id !== lastActId) {
    setLastActId(actividad.id);
    setFuentes(buildFuentes(actividad));
    setValorAvance(0);
    setEstado("");
    setDescripcion("");
    setFechaEjecucion(undefined);
    setCapacitacion({ ...EMPTY_CAPACITACION });
  }

  if (!actividad) return null;

  const handleSave = async (draft: boolean) => {
    if (!entidadId) {
      toast.error("Selecciona una entidad primero");
      return;
    }

    setSaving(true);

    // Collect all gastos from all fuentes
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
        mes: mes + 1, // 1-indexed for DB
        avance_valor: valorAvance,
        estado,
        descripcion_avance: descripcion,
        estado_registro: draft ? "borrador" : "enviado",
      },
      allGastos
    );

    setSaving(false);

    if (result.success) {
      toast.success(
        draft ? "Borrador guardado exitosamente" : "Registro enviado para revisión",
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
              <SheetTitle className="text-base font-semibold leading-snug text-left">Registro Mensual</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{actividad.nombre}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5">
          <div className="py-4 space-y-6">
            <SeccionAvanceOperativo
              mes={mes} anio={anio} valorAvance={valorAvance} estado={estado}
              descripcion={descripcion} fechaEjecucion={fechaEjecucion}
              unidadMedida={actividad.meta_unidad_medida}
              onMesChange={setMes} onAnioChange={setAnio}
              onValorAvanceChange={setValorAvance} onEstadoChange={setEstado}
              onDescripcionChange={setDescripcion} onFechaEjecucionChange={setFechaEjecucion}
            />
            <Separator />
            <SeccionEjecucionFinanciera fuentes={fuentes} onFuentesChange={setFuentes} />
            <Separator />
            <SeccionIndicadoresContextuales
              tags={actividad.tags ?? []}
              capacitacion={capacitacion}
              onCapacitacionChange={setCapacitacion}
            />
          </div>
        </ScrollArea>

        <div className="border-t px-5 py-3 flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Guardar borrador
          </Button>
          <Button size="sm" className="flex-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Enviar para revisión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
