import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import { fetchMecAReasignaciones, insertMecAReasignacion, type MecAReasignacion, fetchMecAEntregables, type MecAEntregable } from "@/lib/mecA";
import { sendNotificacionMecA } from "@/lib/notificaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ESTADO_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  pendiente: { label: "Pendiente",  icon: Clock,       cls: "border-amber-200 text-amber-700 bg-amber-50" },
  aprobado:  { label: "Aprobado",   icon: CheckCircle, cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
  rechazado: { label: "Rechazado",  icon: XCircle,     cls: "border-red-200 text-red-700 bg-red-50" },
};

export default function ReasignacionesMecAPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";
  const { actividades } = useMecAIniciativa(resolvedId);

  const [reasignaciones, setReasignaciones] = useState<MecAReasignacion[]>([]);
  const [entregables, setEntregables] = useState<MecAEntregable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ tipo: "entre_productos", actividad_origen_id: "", actividad_destino_id: "", monto_usd: "", justificacion: "" });

  const load = async () => {
    setLoading(true);
    const [data, ents] = await Promise.all([
      fetchMecAReasignaciones(resolvedId),
      fetchMecAEntregables(resolvedId)
    ]);
    setReasignaciones(data);
    setEntregables(ents.filter(e => e.estado_producto === "conforme" && e.pago_usd));
    setLoading(false);
  };

  useEffect(() => { if (resolvedId) load(); }, [resolvedId]);

  const hayPendiente = reasignaciones.some(r => r.estado === "pendiente");

  // Calculate percentage alert
  const actOrigen = actividades.find(a => a.id === form.actividad_origen_id);
  const secoOrigen = actOrigen ? actOrigen.seco_honorarios_usd + actOrigen.seco_viaticos_usd + actOrigen.seco_servicios_usd + actOrigen.seco_materiales_usd : 0;
  const pct = secoOrigen > 0 && form.monto_usd ? ((Number(form.monto_usd) / secoOrigen) * 100) : 0;

  let alertMsg = "";
  let requiresNoObjecion = false;
  if (pct > 0) {
    if (form.tipo === "entre_resultados" && pct > 10) {
      requiresNoObjecion = true;
      alertMsg = "Esta solicitud requiere No Objeción de SECO. Claudia gestionará el trámite.";
    } else if (form.tipo === "entre_productos" && pct > 20) {
      requiresNoObjecion = true;
      alertMsg = "Esta solicitud requiere No Objeción de SECO.";
    } else {
      alertMsg = "Esta solicitud será comunicada a HELVETAS. No requiere aprobación formal.";
    }
  }

  function renderInfoPresupuestal(actId: string) {
    if (!actId) return null;
    const act = actividades.find(a => a.id === actId);
    if (!act) return null;
    const plan = act.seco_honorarios_usd + act.seco_viaticos_usd + act.seco_servicios_usd + act.seco_materiales_usd;
    const ejec = entregables.filter(e => e.actividad_id === actId).reduce((s, e) => s + (e.pago_usd || 0), 0);
    const saldo = plan - ejec;
    return (
      <div className="mt-1.5 text-[10px] text-muted-foreground flex gap-3 bg-muted/40 p-1.5 rounded border border-muted">
        <span>Planificado: <span className="font-mono text-foreground font-medium">US$ {plan.toLocaleString()}</span></span>
        <span>Saldo: <span className={`font-mono font-medium ${saldo < 0 ? 'text-red-500' : 'text-emerald-600'}`}>US$ {saldo.toLocaleString()}</span></span>
      </div>
    );
  }

  async function handleSave() {
    if (!form.actividad_origen_id || !form.actividad_destino_id || !form.monto_usd || !form.justificacion) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (form.actividad_origen_id === form.actividad_destino_id) {
      toast.error("La actividad origen y destino no pueden ser la misma");
      return;
    }
    setSaving(true);
    const result = await insertMecAReasignacion({
      iniciativa_id: resolvedId,
      tipo: form.tipo,
      actividad_origen_id: form.actividad_origen_id,
      actividad_destino_id: form.actividad_destino_id,
      monto_usd: Number(form.monto_usd),
      porcentaje: pct > 0 ? +pct.toFixed(2) : null,
      justificacion: form.justificacion,
      solicitado_por: null,
    });
    if (!result.success) { toast.error(result.error); setSaving(false); return; }

    const actOrigenNombre = actOrigen?.codigo ?? "";
    const actDestinoNombre = actividades.find(a => a.id === form.actividad_destino_id)?.codigo ?? "";

    await sendNotificacionMecA({
      tipo: "solicitud_info",
      asunto: `Nueva solicitud de reasignación presupuestal`,
      mensaje: `Se ha enviado una solicitud de reasignación presupuestal para tu revisión.\n\nIniciativa: ${resolvedId}\nOrigen: ${actOrigenNombre} → Destino: ${actDestinoNombre}\nMonto: US$ ${Number(form.monto_usd).toLocaleString()}\nTipo: ${form.tipo === "entre_resultados" ? "Entre resultados" : "Entre productos"}\n${requiresNoObjecion ? "⚠️ Requiere No Objeción de SECO" : ""}\n\nJustificación: ${form.justificacion}`,
      destinatario_rol: "asesora_politicas",
    });

    toast.success("Solicitud enviada. Claudia ha sido notificada.");
    setSaving(false);
    setDialogOpen(false);
    setForm({ tipo: "entre_productos", actividad_origen_id: "", actividad_destino_id: "", monto_usd: "", justificacion: "" });
    load();
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Reasignaciones Presupuestales</h1>
          <p className="text-sm text-muted-foreground">Solicitudes de modificación del presupuesto APE</p>
        </div>
        {!hayPendiente && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva solicitud
          </Button>
        )}
      </div>

      {hayPendiente && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">Hay una solicitud pendiente de resolución. Espera la respuesta de Claudia antes de enviar otra.</p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando…</div>
      ) : reasignaciones.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">Sin solicitudes previas.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reasignaciones.map(r => {
            const ec = ESTADO_CFG[r.estado] ?? ESTADO_CFG.pendiente;
            const actOrigen = actividades.find(a => a.id === r.actividad_origen_id);
            const actDestino = actividades.find(a => a.id === r.actividad_destino_id);
            return (
              <Card key={r.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] gap-1 ${ec.cls}`}>
                          <ec.icon className="h-3 w-3" />{ec.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.fecha_solicitud), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold">
                        {r.tipo === "entre_resultados" ? "Entre resultados" : "Entre productos"}
                        {" · "}US$ {r.monto_usd.toLocaleString()}
                        {r.porcentaje && ` (${r.porcentaje.toFixed(1)}%)`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{actOrigen?.codigo ?? r.actividad_origen_id?.slice(0,8)}</span>
                        {" → "}
                        <span className="font-mono">{actDestino?.codigo ?? r.actividad_destino_id?.slice(0,8)}</span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground max-w-xs">
                      {r.estado !== "pendiente" && r.fecha_resolucion && (
                        <p className="mb-1">{format(new Date(r.fecha_resolucion), "dd MMM yyyy", { locale: es })}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-xs bg-muted/30 rounded p-2.5">
                    <p className="font-semibold mb-1">Justificación:</p>
                    <p className="text-muted-foreground">{r.justificacion}</p>
                  </div>
                  {r.comentario_claudia && (
                    <div className={`mt-2 text-xs rounded p-2.5 ${r.estado === "aprobado" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      <p className="font-semibold mb-1">Respuesta de Claudia:</p>
                      <p>{r.comentario_claudia}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Solicitud de Reasignación</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Tipo de reasignación *</Label>
              <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entre_productos">Entre productos del mismo resultado</SelectItem>
                  <SelectItem value="entre_resultados">Entre resultados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Actividad origen (de donde sale) *</Label>
                <Select value={form.actividad_origen_id} onValueChange={v => setForm({...form, actividad_origen_id: v})}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>{actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo}</SelectItem>)}</SelectContent>
                </Select>
                {renderInfoPresupuestal(form.actividad_origen_id)}
              </div>
              <div>
                <Label className="text-xs">Actividad destino (a donde va) *</Label>
                <Select value={form.actividad_destino_id} onValueChange={v => setForm({...form, actividad_destino_id: v})}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>{actividades.filter(a => a.id !== form.actividad_origen_id).map(a => <SelectItem key={a.id} value={a.id}>{a.codigo}</SelectItem>)}</SelectContent>
                </Select>
                {renderInfoPresupuestal(form.actividad_destino_id)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto en USD *</Label>
                <Input type="number" min={0} step="0.01" className="h-8 mt-1" value={form.monto_usd} onChange={e => setForm({...form, monto_usd: e.target.value})} />
              </div>
              {pct > 0 && (
                <div className="flex items-end pb-1">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span> del presupuesto SECO de la actividad origen
                  </div>
                </div>
              )}
            </div>
            {alertMsg && (
              <div className={`text-xs rounded-lg p-2.5 border ${requiresNoObjecion ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                {requiresNoObjecion ? "⚠️ " : "ℹ️ "}{alertMsg}
              </div>
            )}
            <div>
              <Label className="text-xs">Justificación * (detallada)</Label>
              <Textarea className="mt-1 text-sm" rows={4} value={form.justificacion} onChange={e => setForm({...form, justificacion: e.target.value})} placeholder="Explica la razón técnica y operativa que motiva esta reasignación…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enviando…" : "Enviar solicitud"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
