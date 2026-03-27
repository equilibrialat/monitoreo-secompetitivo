import { useState, useEffect, useCallback } from "react";
import { Bell, Send, Loader2, Check, AlertTriangle, Info, Clock } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { fetchNotificaciones, sendNotificacion, sendBulkNotificaciones, type Notificacion } from "@/lib/notificaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPOS_NOTIF = [
  { value: "recordatorio", label: "Recordatorio de vencimiento" },
  { value: "solicitud_info", label: "Solicitud de información" },
  { value: "aviso_general", label: "Aviso general" },
];

const DESTINO_OPTIONS = [
  { value: "todas", label: "Todas las entidades" },
  { value: "mec_a", label: "Solo Mecanismo A" },
  { value: "mec_b", label: "Solo Mecanismo B" },
  { value: "especificas", label: "Entidades específicas" },
];

export default function NotificacionesPage() {
  const { entidades } = useRole();
  const [historial, setHistorial] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form
  const [tipo, setTipo] = useState("aviso_general");
  const [destino, setDestino] = useState("todas");
  const [entidadesSeleccionadas, setEntidadesSeleccionadas] = useState<string[]>([]);
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");

  const loadHistorial = useCallback(async () => {
    setLoading(true);
    const data = await fetchNotificaciones();
    setHistorial(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadHistorial(); }, [loadHistorial]);

  const getDestinatarios = () => {
    if (destino === "todas") return entidades;
    if (destino === "mec_a") return entidades.filter((e) => e.tipo_entidad === "mec_a");
    if (destino === "mec_b") return entidades.filter((e) => e.tipo_entidad.startsWith("mec_b"));
    return entidades.filter((e) => entidadesSeleccionadas.includes(e.id));
  };

  const handleSend = async () => {
    if (!asunto.trim() || !mensaje.trim()) {
      toast.error("Completa asunto y mensaje");
      return;
    }
    setSending(true);

    const targets = getDestinatarios();
    const destinatariosJson = { tipo: destino, entidades: targets.map((e) => ({ id: e.id, nombre: e.nombre_corto })) };

    if (destino === "todas" || destino === "mec_a" || destino === "mec_b") {
      // One notification per target entity for filtering
      const rows = targets.map((t) => ({
        tipo,
        asunto,
        mensaje,
        destinatarios: destinatariosJson,
        entidad_destino_id: t.id,
      }));
      if (rows.length > 0) {
        const result = await sendBulkNotificaciones(rows);
        if (!result.success) { toast.error("Error al enviar", { description: result.error }); setSending(false); return; }
      }
    } else {
      // Specific entities
      const rows = targets.map((t) => ({
        tipo,
        asunto,
        mensaje,
        destinatarios: destinatariosJson,
        entidad_destino_id: t.id,
      }));
      const result = await sendBulkNotificaciones(rows);
      if (!result.success) { toast.error("Error al enviar", { description: result.error }); setSending(false); return; }
    }

    toast.success(`Notificación enviada a ${targets.length} entidades`);
    setAsunto("");
    setMensaje("");
    setSending(false);
    loadHistorial();
  };

  const toggleEntidad = (id: string) => {
    setEntidadesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const TIPO_BADGE: Record<string, { label: string; className: string }> = {
    recordatorio: { label: "Recordatorio", className: "bg-warning/15 text-warning" },
    solicitud_info: { label: "Solicitud", className: "bg-primary/15 text-primary" },
    aviso_general: { label: "Aviso", className: "bg-muted text-muted-foreground" },
    auto_observado: { label: "Observado", className: "bg-destructive/15 text-destructive" },
    auto_aprobado: { label: "Aprobado", className: "bg-success/15 text-success" },
    auto_vencimiento: { label: "Vencimiento", className: "bg-warning/15 text-warning" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">Enviar avisos a las entidades</p>
        </div>
      </div>

      {/* Send form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">📤 Enviar aviso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de aviso</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_NOTIF.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Destinatarios</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESTINO_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {destino === "especificas" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Seleccionar entidades</Label>
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-md max-h-32 overflow-y-auto">
                {entidades.map((e) => (
                  <Badge
                    key={e.id}
                    variant={entidadesSeleccionadas.includes(e.id) ? "default" : "outline"}
                    className="text-[10px] cursor-pointer"
                    onClick={() => toggleEntidad(e.id)}
                  >
                    {e.nombre_corto}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Asunto</Label>
            <Input className="h-9 text-xs" placeholder="Ej: Recordatorio de reporte trimestral" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mensaje</Label>
            <Textarea className="text-xs min-h-[80px]" placeholder="Escriba el contenido del aviso..." value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          </div>

          <Button size="sm" className="text-xs" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Enviar aviso
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Historial de avisos enviados</h2>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No hay avisos enviados.</p>
        ) : (
          <div className="space-y-2">
            {historial.slice(0, 50).map((n) => {
              const badge = TIPO_BADGE[n.tipo] ?? TIPO_BADGE.aviso_general;
              return (
                <div key={n.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                      <span className="font-medium text-xs">{n.asunto}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.mensaje}</p>
                  {n.destinatarios?.entidades && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      → {n.destinatarios.entidades.length} destinatarios
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
