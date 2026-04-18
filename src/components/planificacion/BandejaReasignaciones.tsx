import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertTriangle, Info, CheckCircle2, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { fetchReasignacionesPorEstado, ESTADO_LABELS, type ReasignacionPresupuestal } from "@/lib/reasignacionesPresupuestales";

type Mode = "coordinador" | "ivan";

interface Props {
  mode: Mode;
}

export default function BandejaReasignaciones({ mode }: Props) {
  const { role } = useRole();
  const [items, setItems] = useState<ReasignacionPresupuestal[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const estadoFiltrar = mode === "coordinador"
    ? ["pendiente_coordinador" as const]
    : ["pendiente_ivan" as const];

  async function load() {
    setLoading(true);
    try {
      const data = await fetchReasignacionesPorEstado(estadoFiltrar);
      setItems(data);
    } catch (e: any) {
      toast.error("Error al cargar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [mode]);

  async function actualizar(
    r: ReasignacionPresupuestal,
    nuevoEstado: ReasignacionPresupuestal["estado"],
    comentarioField: "comentario_coordinador" | "comentario_ivan",
    nombreField: "coordinador_nombre" | "ivan_nombre",
    fechaField: "fecha_coordinador" | "fecha_aprobacion",
  ) {
    const text = (comentario[r.id] || "").trim();
    if ((nuevoEstado === "devuelta_coordinador" || nuevoEstado === "rechazada_ivan") && !text) {
      toast.error("Escribe una observación para devolver/rechazar");
      return;
    }
    setBusy(r.id);
    const update: any = {
      estado: nuevoEstado,
      [comentarioField]: text || null,
      [nombreField]: mode === "coordinador" ? "Coordinador Regional" : "Iván",
      [fechaField]: new Date().toISOString(),
    };
    const { error } = await (supabase as any)
      .from("reasignaciones_presupuestales")
      .update(update)
      .eq("id", r.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(
      nuevoEstado === "pendiente_ivan" ? "Aprobada — enviada a Iván"
      : nuevoEstado === "aprobada" ? "Reasignación aprobada — presupuesto vigente actualizado"
      : "Solicitud actualizada"
    );
    setComentario(c => ({ ...c, [r.id]: "" }));
    load();
  }

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Cargando solicitudes…</div>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-10 text-sm text-muted-foreground">
          No hay solicitudes pendientes de tu revisión.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(r => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="font-mono">{r.actividad_origen_codigo}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{r.actividad_destino_codigo}</span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {r.entidad_codigo} · Mecanismo {r.mecanismo} · {new Date(r.fecha_solicitud).toLocaleDateString("es-PE")}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {ESTADO_LABELS[r.estado]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border rounded p-2">
                <p className="text-muted-foreground">Monto</p>
                <p className="font-semibold font-mono">USD {Number(r.monto_usd).toLocaleString()}</p>
              </div>
              <div className="border rounded p-2">
                <p className="text-muted-foreground">% Variación</p>
                <p className="font-semibold">{r.pct_variacion ? `${Number(r.pct_variacion).toFixed(1)}%` : "—"}</p>
              </div>
              <div className="border rounded p-2">
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-semibold text-[11px]">
                  {r.tipo_reasignacion === "entre_resultados" ? "Entre resultados" : "Mismo resultado"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Justificación</p>
              <p className="text-xs bg-muted/30 rounded p-2">{r.justificacion}</p>
            </div>

            {r.alerta_mensaje && (
              <Alert className={r.alerta_nivel === "warning" ? "border-amber-500" : "border-blue-300"}>
                {r.alerta_nivel === "warning"
                  ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                  : <Info className="h-4 w-4 text-blue-600" />}
                <AlertDescription className="text-xs">{r.alerta_mensaje}</AlertDescription>
              </Alert>
            )}

            {mode === "ivan" && r.comentario_coordinador && (
              <div className="border-l-2 border-blue-400 pl-2">
                <p className="text-[11px] font-medium flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Coordinador Regional ({r.coordinador_nombre || "—"})
                </p>
                <p className="text-xs mt-0.5">{r.comentario_coordinador}</p>
              </div>
            )}

            <Textarea
              placeholder={mode === "coordinador"
                ? "Comentario (obligatorio si devuelves)…"
                : "Observación (obligatoria si rechazas)…"}
              value={comentario[r.id] || ""}
              onChange={e => setComentario(c => ({ ...c, [r.id]: e.target.value }))}
              className="text-xs min-h-[60px]"
            />

            <div className="flex gap-2 justify-end">
              {mode === "coordinador" ? (
                <>
                  <Button size="sm" variant="outline" disabled={busy === r.id}
                    onClick={() => actualizar(r, "devuelta_coordinador", "comentario_coordinador", "coordinador_nombre", "fecha_coordinador")}>
                    <XCircle className="h-3 w-3 mr-1" /> Devolver
                  </Button>
                  <Button size="sm" disabled={busy === r.id}
                    onClick={() => actualizar(r, "pendiente_ivan", "comentario_coordinador", "coordinador_nombre", "fecha_coordinador")}>
                    {busy === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Aprobar con comentario
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" disabled={busy === r.id}
                    onClick={() => actualizar(r, "rechazada_ivan", "comentario_ivan", "ivan_nombre", "fecha_aprobacion")}>
                    <XCircle className="h-3 w-3 mr-1" /> Rechazar
                  </Button>
                  <Button size="sm" disabled={busy === r.id}
                    onClick={() => actualizar(r, "aprobada", "comentario_ivan", "ivan_nombre", "fecha_aprobacion")}>
                    {busy === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Aprobar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
