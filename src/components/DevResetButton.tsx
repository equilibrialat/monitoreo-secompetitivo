import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

/**
 * Botón de reset de datos de prueba — visible solo en desarrollo.
 * Borra ejecución (técnica + financiera) y reasignaciones, pero
 * preserva planificación, presupuestos y catálogo de actividades.
 */
export default function DevResetButton() {
  const [busy, setBusy] = useState(false);

  // Solo visible en desarrollo (Vite expone import.meta.env.DEV)
  if (!import.meta.env.DEV) return null;

  async function handleReset() {
    setBusy(true);
    try {
      // Helper: delete-all con filtro siempre verdadero
      const wipe = async (table: string, key = "id") => {
        const { error } = await (supabase as any)
          .from(table).delete().not(key, "is", null);
        if (error) throw new Error(`${table}: ${error.message}`);
      };

      // 1) Avance financiero / comprobantes y dependencias
      await wipe("ejecucion_financiera");
      await wipe("comprobantes");

      // 2) Sub-registros mensuales (dependientes de registros_mensuales)
      await wipe("registro_capacitaciones");
      await wipe("registro_financiamiento");
      await wipe("registro_innovaciones");
      await wipe("registro_nuevos_productos");
      await wipe("registro_normativo");
      await wipe("registro_gei");
      await wipe("participantes_capacitacion");

      // 3) Avance técnico (registros mensuales)
      await wipe("registros_mensuales");

      // 4) Reasignaciones presupuestales
      await wipe("reasignaciones_presupuestales");
      await wipe("reasignaciones");

      // 5) Observaciones e historial menor
      await wipe("observaciones_coordinador");

      toast.success("Datos de prueba reseteados. Recargando…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(`Error en reset: ${e.message || e}`);
      setBusy(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive gap-1"
          title="Solo visible en modo desarrollo"
        >
          <RotateCcw className="h-3 w-3" />
          Reset datos de prueba
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Resetear todos los datos de prueba?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminarán todos los registros
            de avance técnico, avance financiero, comprobantes y solicitudes de
            reasignación. La planificación, los presupuestos originales y el
            catálogo de actividades se mantienen intactos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Sí, resetear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
