import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { fetchMecAIniciativas, fetchMecAReasignacionesPendientes, resolverMecAReasignacion, type MecAIniciativa } from "@/lib/mecA";
import { sendNotificacionMecA } from "@/lib/notificaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClaudiaPanelPage() {
  const [iniciativas, setIniciativas] = useState<MecAIniciativa[]>([]);
  const [reasignaciones, setReasignaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReas, setSelectedReas] = useState<any | null>(null);
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [inis, reas] = await Promise.all([
      fetchMecAIniciativas(),
      fetchMecAReasignacionesPendientes(),
    ]);
    setIniciativas(inis);
    setReasignaciones(reas);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function handleResolver(estado: "aprobado" | "rechazado") {
    if (!selectedReas) return;
    if (estado === "rechazado" && !comentario.trim()) {
      toast.error("El comentario es obligatorio al rechazar");
      return;
    }
    setSaving(true);
    const result = await resolverMecAReasignacion(selectedReas.id, estado, comentario);
    if (!result.success) { toast.error(result.error); setSaving(false); return; }

    await sendNotificacionMecA({
      tipo: estado === "aprobado" ? "auto_aprobado" : "auto_observado",
      asunto: `Tu solicitud de reasignación fue ${estado === "aprobado" ? "aprobada" : "rechazada"}`,
      mensaje: `Tu solicitud de reasignación presupuestal ha sido ${estado === "aprobado" ? "APROBADA ✅" : "RECHAZADA ❌"}.\n\nMonto: US$ ${selectedReas.monto_usd?.toLocaleString()}\n\n${comentario ? `Comentario de Claudia: ${comentario}` : ""}`,
      destinatario_rol: "gestor_iniciativa",
    });

    toast.success(`Solicitud ${estado === "aprobado" ? "aprobada" : "rechazada"}`);
    setSaving(false);
    setSelectedReas(null);
    setComentario("");
    load();
  }

  const ESTADO_COLORS: Record<string, string> = {
    activa: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cerrada: "bg-slate-100 text-slate-600 border-slate-200",
    suspendida: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Panel Mecanismo A</h1>
          <p className="text-sm text-muted-foreground">Gestión de iniciativas de política pública</p>
        </div>
        <Link to="/mec-a/iniciativa/nueva/configuracion">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Nueva iniciativa</Button>
        </Link>
      </div>

      {/* Reasignaciones pendientes */}
      {reasignaciones.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Reasignaciones pendientes ({reasignaciones.length})
          </h2>
          <div className="space-y-3">
            {reasignaciones.map(r => (
              <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {r.mec_a_iniciativas?.nombre ?? r.iniciativa_id} · US$ {r.monto_usd?.toLocaleString()}
                    {r.porcentaje && ` (${r.porcentaje.toFixed(1)}%)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.tipo === "entre_resultados" ? "Entre resultados" : "Entre productos"}
                    {" · "}
                    {format(new Date(r.fecha_solicitud), "dd MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-xs bg-white/80 rounded px-2 py-1 border">{r.justificacion}</p>
                </div>
                <Button size="sm" onClick={() => { setSelectedReas(r); setComentario(""); }}>
                  Resolver
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Initiatives list */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Iniciativas ({iniciativas.length})
        </h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando…</div>
        ) : iniciativas.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay iniciativas creadas. Crea la primera con el botón superior.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {iniciativas.map(ini => (
              <Card key={ini.id} className="hover:shadow-md transition-all hover:border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{ini.nombre}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{ini.epb_nombre}{ini.epb_siglas && ` (${ini.epb_siglas})`}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ${ESTADO_COLORS[ini.estado]}`}>
                      {ini.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(ini.fecha_inicio), "dd MMM yyyy", { locale: es })} → {format(new Date(ini.fecha_fin), "dd MMM yyyy", { locale: es })}</span>
                    {ini.presupuesto_seco_usd && <span className="font-mono font-semibold text-foreground">US$ {ini.presupuesto_seco_usd.toLocaleString()}</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link to={`/mec-a/iniciativa/${ini.id}/configuracion`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs">Configurar APE</Button>
                    </Link>
                    <Link to={`/mec-a/iniciativa/${ini.id}`} className="flex-1">
                      <Button size="sm" className="w-full h-7 text-xs gap-1">Dashboard <ArrowRight className="h-3 w-3" /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolver reasignación dialog */}
      <Dialog open={!!selectedReas} onOpenChange={() => { setSelectedReas(null); setComentario(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Resolver Solicitud de Reasignación</DialogTitle></DialogHeader>
          {selectedReas && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
                <p><span className="font-semibold">Iniciativa:</span> {selectedReas.mec_a_iniciativas?.nombre ?? selectedReas.iniciativa_id}</p>
                <p><span className="font-semibold">Monto:</span> US$ {selectedReas.monto_usd?.toLocaleString()}{selectedReas.porcentaje && ` (${selectedReas.porcentaje.toFixed(1)}%)`}</p>
                <p><span className="font-semibold">Tipo:</span> {selectedReas.tipo === "entre_resultados" ? "Entre resultados" : "Entre productos"}</p>
                <p className="mt-2 italic text-muted-foreground">{selectedReas.justificacion}</p>
              </div>
              <div>
                <Label className="text-xs">Comentario {selectedReas && "rechazado" ? "(obligatorio al rechazar)" : "(opcional)"}</Label>
                <Textarea className="mt-1 text-sm" rows={3} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Justificación de la decisión…" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { setSelectedReas(null); setComentario(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleResolver("rechazado")} disabled={saving} className="gap-1">
              <XCircle className="h-4 w-4" /> Rechazar
            </Button>
            <Button onClick={() => handleResolver("aprobado")} disabled={saving} className="gap-1">
              <CheckCircle className="h-4 w-4" /> Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
