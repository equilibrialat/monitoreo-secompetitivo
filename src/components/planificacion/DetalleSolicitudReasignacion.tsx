import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowDown, ArrowUp, ArrowRight, AlertTriangle, Info,
  CheckCircle2, XCircle, Loader2, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ESTADO_LABELS, ESTADO_VARIANT,
  calcularAlerta, calcularEfectoPorActividad, presupuestoVigente,
  type ReasignacionPresupuestal, type EstadoReasignacion,
} from "@/lib/reasignacionesPresupuestales";
import { sendNotificacion } from "@/lib/notificaciones";

interface ActMin {
  actividad_codigo: string;
  actividad_descripcion: string;
  presupuesto_seco_usd: number;
  resultado_intermedio_codigo?: string;
  resultado_intermedio_descripcion?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  solicitudId: string;
  mode: "coordinador" | "ivan";
  onResolved?: () => void;
}

export default function DetalleSolicitudReasignacion({
  open, onOpenChange, solicitudId, mode, onResolved,
}: Props) {
  const [r, setR] = useState<ReasignacionPresupuestal | null>(null);
  const [actividades, setActividades] = useState<ActMin[]>([]);
  const [aprobadasPrevias, setAprobadasPrevias] = useState<ReasignacionPresupuestal[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  const [popupAct, setPopupAct] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !solicitudId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: solRow } = await (supabase as any)
        .from("reasignaciones_presupuestales")
        .select("*")
        .eq("id", solicitudId)
        .single();
      if (!alive || !solRow) { setLoading(false); return; }
      setR(solRow as ReasignacionPresupuestal);

      // Cargar actividades del proyecto y reasignaciones aprobadas previas
      const [{ data: acts }, { data: aprob }] = await Promise.all([
        (supabase as any)
          .from("planificacion_actividades")
          .select("actividad_codigo, actividad_descripcion, presupuesto_seco_usd, resultado_intermedio_codigo, resultado_intermedio_descripcion")
          .eq("entidad_codigo", solRow.entidad_codigo),
        (supabase as any)
          .from("reasignaciones_presupuestales")
          .select("*")
          .eq("entidad_codigo", solRow.entidad_codigo)
          .eq("estado", "aprobada"),
      ]);

      if (!alive) return;
      setActividades(acts || []);
      setAprobadasPrevias((aprob || []) as ReasignacionPresupuestal[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, solicitudId]);

  const efectos = useMemo(
    () => calcularEfectoPorActividad(aprobadasPrevias),
    [aprobadasPrevias],
  );

  const actMap = useMemo(() => {
    const m = new Map<string, ActMin & { vigente: number }>();
    for (const a of actividades) {
      const vig = presupuestoVigente(
        Number(a.presupuesto_seco_usd || 0),
        efectos.get(a.actividad_codigo),
      );
      m.set(a.actividad_codigo, { ...a, vigente: vig });
    }
    return m;
  }, [actividades, efectos]);

  const origen = r ? actMap.get(r.actividad_origen_codigo) : undefined;
  const destino = r ? actMap.get(r.actividad_destino_codigo) : undefined;

  const nuevoOrigen = r && origen ? origen.vigente - Number(r.monto_usd) : 0;
  const nuevoDestino = r && destino ? destino.vigente + Number(r.monto_usd) : 0;

  const pctOrigen = r && origen && origen.vigente > 0
    ? (Number(r.monto_usd) / origen.vigente) * 100 : 0;
  const pctDestino = r && destino && destino.vigente > 0
    ? (Number(r.monto_usd) / destino.vigente) * 100 : 0;

  const alerta = useMemo(() => {
    if (!r) return null;
    return calcularAlerta(r.mecanismo, r.tipo_reasignacion, Number(r.pct_variacion || pctOrigen));
  }, [r, pctOrigen]);

  /** Intensidad visual de la flecha según % */
  function arrowFor(codigo: string): { dir: "up" | "down" | null; intensity: number } {
    if (!r) return { dir: null, intensity: 0 };
    if (codigo === r.actividad_origen_codigo) return { dir: "down", intensity: pctOrigen };
    if (codigo === r.actividad_destino_codigo) return { dir: "up", intensity: pctDestino };
    return { dir: null, intensity: 0 };
  }

  async function ejecutar(accion: "aprobar" | "rechazar") {
    if (!r) return;
    const text = comentario.trim();
    if (accion === "rechazar" && !text) {
      toast.error("La observación es obligatoria para rechazar.");
      return;
    }

    setBusy(true);

    // Determinar nuevo estado y campos
    let nuevoEstado: EstadoReasignacion;
    const update: any = { updated_at: new Date().toISOString() };

    if (mode === "coordinador") {
      nuevoEstado = accion === "aprobar" ? "pendiente_ivan" : "rechazada";
      update.comentario_coordinador = text || null;
      update.coordinador_nombre = "Coordinador Regional";
      update.fecha_coordinador = new Date().toISOString();
    } else {
      nuevoEstado = accion === "aprobar" ? "aprobada" : "rechazada";
      update.comentario_ivan = text || null;
      update.ivan_nombre = "Iván";
      update.fecha_aprobacion = new Date().toISOString();
    }
    update.estado = nuevoEstado;

    const { error } = await (supabase as any)
      .from("reasignaciones_presupuestales")
      .update(update)
      .eq("id", r.id);

    if (error) {
      setBusy(false);
      toast.error("No se pudo actualizar: " + error.message);
      return;
    }

    // Notificaciones según tabla sección 7
    try {
      if (mode === "coordinador" && accion === "aprobar") {
        await sendNotificacion({
          tipo: "reasignacion_a_ivan",
          asunto: `Solicitud de ${r.entidad_codigo} aprobada por Coordinador`,
          mensaje: `Solicitud de ${r.entidad_codigo} aprobada por Coordinador Regional. Pendiente tu revisión.`,
          destinatarios: { rol: "coordinador_cadenas" },
          entidad_destino_id: null,
        });
      } else if (mode === "coordinador" && accion === "rechazar") {
        await sendNotificacion({
          tipo: "reasignacion_rechazada",
          asunto: `Tu solicitud de reasignación fue rechazada`,
          mensaje: `Tu solicitud fue rechazada por Coordinador Regional: ${text}`,
          destinatarios: { entidad_codigo: r.entidad_codigo },
          entidad_destino_id: null,
        });
      } else if (mode === "ivan" && accion === "aprobar") {
        await sendNotificacion({
          tipo: "reasignacion_aprobada",
          asunto: `Tu reasignación fue aprobada`,
          mensaje: `Tu reasignación fue aprobada. Presupuesto vigente actualizado: ${r.actividad_origen_codigo} → ${r.actividad_destino_codigo} (USD ${Number(r.monto_usd).toLocaleString()}).`,
          destinatarios: { entidad_codigo: r.entidad_codigo },
          entidad_destino_id: null,
        });
      } else if (mode === "ivan" && accion === "rechazar") {
        await sendNotificacion({
          tipo: "reasignacion_rechazada",
          asunto: `Tu solicitud de reasignación fue rechazada`,
          mensaje: `Tu solicitud fue rechazada por Iván: ${text}`,
          destinatarios: { entidad_codigo: r.entidad_codigo },
          entidad_destino_id: null,
        });
      }
    } catch { /* noop */ }

    setBusy(false);
    toast.success(
      accion === "rechazar" ? "Solicitud rechazada"
      : mode === "coordinador" ? "Aprobada — enviada a Iván"
      : "Aprobada — presupuesto vigente actualizado",
    );
    setComentario("");
    onResolved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Detalle de la solicitud de reasignación</DialogTitle>
        </DialogHeader>

        {loading || !r ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Cargando…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{r.entidad_codigo}</p>
                <p className="text-[11px] text-muted-foreground">
                  Mecanismo {r.mecanismo} ·{" "}
                  {new Date(r.fecha_solicitud).toLocaleDateString("es-PE", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant={ESTADO_VARIANT[r.estado]} className="text-[10px]">
                {ESTADO_LABELS[r.estado]}
              </Badge>
            </div>

            {/* Resumen visual de impacto */}
            <div className="border rounded-md p-3 bg-muted/20">
              <p className="text-xs font-medium mb-2">Resumen visual de impacto</p>
              <div className="flex flex-wrap gap-1.5">
                {actividades.map((a) => {
                  const arr = arrowFor(a.actividad_codigo);
                  const isAffected = arr.dir !== null;
                  const colorClass = arr.dir === "up"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : arr.dir === "down"
                    ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                    : "bg-muted text-muted-foreground border-border";
                  // intensidad opacidad para no afectadas en gris
                  const opacityClass = isAffected
                    ? arr.intensity > 20 ? "" : arr.intensity > 10 ? "opacity-90" : "opacity-80"
                    : "";
                  return (
                    <button
                      key={a.actividad_codigo}
                      onClick={() => setPopupAct(a.actividad_codigo)}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 hover:ring-1 hover:ring-primary transition ${colorClass} ${opacityClass}`}
                      title={a.actividad_descripcion}
                    >
                      {a.actividad_codigo}
                      {arr.dir === "up" && <ArrowUp className="h-2.5 w-2.5" />}
                      {arr.dir === "down" && <ArrowDown className="h-2.5 w-2.5" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Clic en cualquier actividad para ver detalle.
              </p>
            </div>

            {/* Detalle origen / destino */}
            <div className="grid md:grid-cols-2 gap-3">
              <DetalleActividadCard
                titulo="Actividad origen"
                codigo={r.actividad_origen_codigo}
                act={origen}
                vigenteActual={origen?.vigente || 0}
                vigentePropuesto={nuevoOrigen}
                pct={pctOrigen}
                direccion="down"
              />
              <DetalleActividadCard
                titulo="Actividad destino"
                codigo={r.actividad_destino_codigo}
                act={destino}
                vigenteActual={destino?.vigente || 0}
                vigentePropuesto={nuevoDestino}
                pct={pctDestino}
                direccion="up"
              />
            </div>

            {/* Tipo + justificación */}
            <div className="text-xs space-y-2">
              <div>
                <span className="text-muted-foreground">Tipo: </span>
                <span className="font-medium">
                  {r.tipo_reasignacion === "entre_resultados"
                    ? "Entre resultados distintos"
                    : "Entre productos del mismo resultado"}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Justificación de la entidad:</p>
                <p className="bg-muted/30 rounded p-2 whitespace-pre-wrap">{r.justificacion}</p>
              </div>
            </div>

            {/* Si es Iván muestra comentario del Coordinador */}
            {mode === "ivan" && r.comentario_coordinador && (
              <div className="border-l-2 border-primary pl-2 text-xs">
                <p className="font-medium flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Coordinador Regional ({r.coordinador_nombre || "—"})
                </p>
                <p className="mt-0.5">{r.comentario_coordinador}</p>
              </div>
            )}

            {/* Alerta MOP */}
            {alerta && (
              <Alert className={alerta.nivel === "warning" ? "border-amber-500" : "border-blue-300"}>
                {alerta.nivel === "warning"
                  ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                  : <Info className="h-4 w-4 text-blue-600" />}
                <AlertDescription className="text-xs">
                  <div className="font-medium mb-0.5">
                    Variación: {Number(r.pct_variacion || pctOrigen).toFixed(1)}% del presupuesto vigente origen
                  </div>
                  {alerta.mensaje}
                </AlertDescription>
              </Alert>
            )}

            {/* Caja de comentario / observación */}
            <div>
              <p className="text-xs font-medium mb-1">
                {mode === "coordinador" ? "Comentario (opcional al aprobar, obligatorio al rechazar)" : "Observación (obligatoria al rechazar)"}
              </p>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="text-xs min-h-[70px]"
                placeholder="Escribe aquí..."
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cerrar
          </Button>
          <Button
            variant="destructive"
            onClick={() => ejecutar("rechazar")}
            disabled={busy || loading}
          >
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
            Rechazar
          </Button>
          <Button onClick={() => ejecutar("aprobar")} disabled={busy || loading}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            Aprobar
          </Button>
        </DialogFooter>

        {/* Popup detalle por actividad */}
        {popupAct && (
          <PopupActividad
            actividad={actMap.get(popupAct)!}
            esAfectada={popupAct === r?.actividad_origen_codigo || popupAct === r?.actividad_destino_codigo}
            vigentePropuesto={
              popupAct === r?.actividad_origen_codigo ? nuevoOrigen
              : popupAct === r?.actividad_destino_codigo ? nuevoDestino
              : actMap.get(popupAct)?.vigente || 0
            }
            pctVar={
              popupAct === r?.actividad_origen_codigo ? pctOrigen
              : popupAct === r?.actividad_destino_codigo ? pctDestino
              : 0
            }
            direccion={
              popupAct === r?.actividad_origen_codigo ? "down"
              : popupAct === r?.actividad_destino_codigo ? "up"
              : null
            }
            mecanismo={r?.mecanismo || ""}
            tipoReasignacion={r?.tipo_reasignacion || ""}
            onClose={() => setPopupAct(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Tarjeta detalle origen/destino ─── */

function DetalleActividadCard({
  titulo, codigo, act, vigenteActual, vigentePropuesto, pct, direccion,
}: {
  titulo: string;
  codigo: string;
  act: (ActMin & { vigente: number }) | undefined;
  vigenteActual: number;
  vigentePropuesto: number;
  pct: number;
  direccion: "up" | "down";
}) {
  const colorFlecha = direccion === "up" ? "text-emerald-600" : "text-destructive";
  const Icon = direccion === "up" ? ArrowUp : ArrowDown;
  return (
    <div className="border rounded-md p-3 text-xs space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="font-mono font-semibold">{codigo}</p>
      <p className="text-muted-foreground line-clamp-2">{act?.actividad_descripcion || "—"}</p>
      {act?.resultado_intermedio_codigo && (
        <p className="text-[10px] text-muted-foreground">
          Resultado: {act.resultado_intermedio_codigo}
          {act.resultado_intermedio_descripcion ? ` — ${act.resultado_intermedio_descripcion.slice(0, 50)}…` : ""}
        </p>
      )}
      <div className="font-mono pt-1.5 flex items-center gap-1.5">
        <span>USD {vigenteActual.toLocaleString()}</span>
        <Icon className={`h-3 w-3 ${colorFlecha}`} />
        <span className={`font-semibold ${colorFlecha}`}>
          USD {vigentePropuesto.toLocaleString()}
        </span>
      </div>
      <p className={`text-[11px] font-medium ${colorFlecha}`}>
        {direccion === "down" ? "−" : "+"}{pct.toFixed(1)}%
      </p>
    </div>
  );
}

/* ─── Popup detalle individual de actividad ─── */

function PopupActividad({
  actividad, esAfectada, vigentePropuesto, pctVar, direccion, mecanismo, tipoReasignacion, onClose,
}: {
  actividad: ActMin & { vigente: number };
  esAfectada: boolean;
  vigentePropuesto: number;
  pctVar: number;
  direccion: "up" | "down" | null;
  mecanismo: string;
  tipoReasignacion: string;
  onClose: () => void;
}) {
  const alerta = esAfectada && pctVar > 0
    ? calcularAlerta(mecanismo, (tipoReasignacion as any) || "productos_mismo_resultado", pctVar)
    : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono">{actividad.actividad_codigo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs py-2">
          <p>{actividad.actividad_descripcion}</p>
          {actividad.resultado_intermedio_codigo && (
            <p className="text-muted-foreground">
              Resultado: <span className="font-medium text-foreground">{actividad.resultado_intermedio_codigo}</span>
              {actividad.resultado_intermedio_descripcion ? ` — ${actividad.resultado_intermedio_descripcion}` : ""}
            </p>
          )}
          <div className="border rounded p-2 space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vigente actual:</span>
              <span>USD {actividad.vigente.toLocaleString()}</span>
            </div>
            {esAfectada && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vigente propuesto:</span>
                  <span className={`font-semibold ${direccion === "up" ? "text-emerald-600" : "text-destructive"}`}>
                    USD {vigentePropuesto.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">% Variación:</span>
                  <span className={`${direccion === "up" ? "text-emerald-600" : "text-destructive"}`}>
                    {direccion === "down" ? "−" : "+"}{pctVar.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
          {alerta && (
            <Alert className={alerta.nivel === "warning" ? "border-amber-500" : "border-blue-300"}>
              {alerta.nivel === "warning"
                ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                : <Info className="h-4 w-4 text-blue-600" />}
              <AlertDescription className="text-xs">{alerta.mensaje}</AlertDescription>
            </Alert>
          )}
          {!esAfectada && (
            <p className="text-muted-foreground text-[11px]">
              Esta actividad no se ve afectada por la reasignación.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
