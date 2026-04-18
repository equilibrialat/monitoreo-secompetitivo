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
import { useQueryClient } from "@tanstack/react-query";

/**
 * Botón de reset — visible solo en desarrollo.
 * Borra ÚNICAMENTE los registros de avance técnico y financiero
 * del mes actual en curso. No toca meses anteriores, planificación,
 * presupuestos, reasignaciones ni ningún otro dato histórico.
 */
export default function DevResetButton() {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  if (!import.meta.env.DEV) return null;

  async function handleReset() {
    setBusy(true);
    try {
      const now = new Date();
      const anio = now.getFullYear();
      const mes = now.getMonth() + 1; // 1-12
      const mesStr = `${anio}-${String(mes).padStart(2, "0")}`; // "YYYY-MM"

      // 1) Buscar registros mensuales del mes actual
      const { data: regs, error: errRegs } = await (supabase as any)
        .from("registros_mensuales")
        .select("id")
        .eq("anio", anio)
        .eq("mes", mes);
      if (errRegs) throw new Error(`registros_mensuales (select): ${errRegs.message}`);

      const regIds = (regs ?? []).map((r: any) => r.id);
      let totalBorrados = 0;

      if (regIds.length > 0) {
        // 2) Borrar sub-registros dependientes del mes actual
        const subTables = [
          "registro_capacitaciones",
          "registro_financiamiento",
          "registro_innovaciones",
          "registro_nuevos_productos",
          "registro_normativo",
          "registro_gei",
          "ejecucion_financiera",
        ];
        for (const t of subTables) {
          const { error } = await (supabase as any)
            .from(t).delete().in("registro_mensual_id", regIds);
          if (error) throw new Error(`${t}: ${error.message}`);
        }

        // 3) Borrar los registros mensuales del mes actual y verificar
        const { data: deleted, error: errDel } = await (supabase as any)
          .from("registros_mensuales")
          .delete()
          .in("id", regIds)
          .select("id");
        if (errDel) throw new Error(`registros_mensuales (delete): ${errDel.message}`);
        totalBorrados = (deleted ?? []).length;

        if (totalBorrados === 0) {
          throw new Error(
            "El borrado fue rechazado por la base de datos (0 filas afectadas). " +
            "Puede ser un problema de permisos RLS."
          );
        }
      }

      // 4) Comprobantes del mes actual (campo `mes` = "YYYY-MM")
      const { error: errComp } = await (supabase as any)
        .from("comprobantes").delete().eq("mes", mesStr);
      if (errComp) throw new Error(`comprobantes: ${errComp.message}`);

      // 5) Invalidar cachés de react-query antes de recargar para que
      //    cualquier vista que sí use react-query se refresque al instante.
      await qc.invalidateQueries();

      toast.success(
        regIds.length > 0
          ? `Reset OK: ${totalBorrados} actividad(es) del mes vuelven a "pendiente". Recargando…`
          : "No había registros del mes actual. Recargando…"
      );
      setTimeout(() => window.location.reload(), 600);
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
          <AlertDialogTitle>¿Resetear las actividades del mes actual a pendiente?</AlertDialogTitle>
          <AlertDialogDescription>
            Solo se borrarán los registros del mes en curso.
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
