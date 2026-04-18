import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp, ArrowDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchReasignacionesPorEstado,
  ESTADO_LABELS,
  ESTADO_VARIANT,
  type ReasignacionPresupuestal,
} from "@/lib/reasignacionesPresupuestales";
import DetalleSolicitudReasignacion from "./DetalleSolicitudReasignacion";

type Mode = "coordinador" | "ivan";

interface Props {
  mode: Mode;
}

export default function BandejaReasignaciones({ mode }: Props) {
  const [items, setItems] = useState<ReasignacionPresupuestal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const estado = mode === "coordinador" ? "pendiente_coordinador" : "pendiente_ivan";

  async function load() {
    setLoading(true);
    try {
      const data = await fetchReasignacionesPorEstado([estado]);
      setItems(data);
    } catch (e: any) {
      toast.error("Error al cargar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode]);

  if (loading) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Cargando…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center">
        No hay solicitudes pendientes de tu revisión.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((r) => (
          <SolicitudCard
            key={r.id}
            r={r}
            onOpen={() => setOpenId(r.id)}
          />
        ))}
      </div>

      {openId && (
        <DetalleSolicitudReasignacion
          open={!!openId}
          onOpenChange={(o) => { if (!o) setOpenId(null); }}
          solicitudId={openId}
          mode={mode}
          onResolved={() => { setOpenId(null); load(); }}
        />
      )}
    </>
  );
}

/**
 * Tarjeta-resumen de una solicitud (sección 3 del spec).
 * Muestra entidad/proyecto/fecha + resumen visual con flechas ↑↓ del par afectado.
 */
function SolicitudCard({
  r,
  onOpen,
}: {
  r: ReasignacionPresupuestal;
  onOpen: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onOpen}
    >
      <CardContent className="py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{r.entidad_codigo}</p>
            <p className="text-[11px] text-muted-foreground">
              Mecanismo {r.mecanismo} ·{" "}
              {new Date(r.fecha_solicitud).toLocaleDateString("es-PE", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
          </div>
          <Badge variant={ESTADO_VARIANT[r.estado]} className="text-[10px] shrink-0">
            {ESTADO_LABELS[r.estado]}
          </Badge>
        </div>

        {/* Resumen visual compacto: actividades afectadas con flechas */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 font-mono">
            {r.actividad_origen_codigo}
            <ArrowDown className="h-3 w-3 text-destructive" />
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="inline-flex items-center gap-1 font-mono">
            {r.actividad_destino_codigo}
            <ArrowUp className="h-3 w-3 text-emerald-600" />
          </span>
          <span className="text-muted-foreground ml-auto font-mono">
            USD {Number(r.monto_usd).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-end text-[11px] text-muted-foreground">
          Ver detalle <ChevronRight className="h-3 w-3 ml-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}
