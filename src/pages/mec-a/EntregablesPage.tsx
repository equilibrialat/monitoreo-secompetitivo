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
import { Plus, CheckCircle, AlertCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import { fetchMecAEntregables, updateMecAEntregable, insertMecAEntregable, type MecAEntregable } from "@/lib/mecA";
import { sendNotificacionMecA } from "@/lib/notificaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ESTADO_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  pendiente:         { label: "Pendiente",         icon: Clock,       cls: "border-slate-200 text-slate-600 bg-slate-50" },
  conforme:          { label: "Conforme",           icon: CheckCircle, cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
  con_observaciones: { label: "Con observaciones",  icon: AlertCircle, cls: "border-amber-200 text-amber-700 bg-amber-50" },
  rechazado:         { label: "Rechazado",          icon: XCircle,     cls: "border-red-200 text-red-700 bg-red-50" },
};

const PAGO_CONFIG: Record<string, { label: string; cls: string }> = {
  sin_pago:      { label: "Sin pago",      cls: "border-slate-200 text-slate-500 bg-slate-50" },
  pendiente:     { label: "Pdte. pago",    cls: "border-amber-200 text-amber-700 bg-amber-50" },
  pago_ejecutado:{ label: "Pago ejecutado",cls: "border-blue-200 text-blue-700 bg-blue-50" },
};

export default function EntregablesPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";

  const [entregables, setEntregables] = useState<MecAEntregable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MecAEntregable | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<any>({
    actividad_id: "",
    consultor_nombre: "",
    rol_responsable: "",
    numero_producto: "",
    descripcion_producto: "",
    tipo_producto: "",
    plazo_entrega: "",
    estado_producto: "pendiente",
    presupuesto_usd: "",
    observaciones_tecnicas: ""
  });

  const { arbol } = useMecAIniciativa(resolvedId);

  const load = async () => {
    setLoading(true);
    const data = await fetchMecAEntregables(resolvedId);
    setEntregables(data);
    setLoading(false);
  };

  useEffect(() => { if (resolvedId) load(); }, [resolvedId]);

  function openConformidad(ent: MecAEntregable) {
    setSelected(ent);
    setForm({
      fecha_recepcion: ent.fecha_recepcion ?? "",
      estado_producto: ent.estado_producto,
      observaciones_tecnicas: ent.observaciones_tecnicas ?? "",
      medidas_correctivas: ent.medidas_correctivas ?? "",
    });
  }

  async function handleSaveConformidad() {
    if (!selected) return;
    if (!form.fecha_recepcion) { toast.error("La fecha de recepción es obligatoria"); return; }
    if (!form.estado_producto) { toast.error("El estado del producto es obligatorio"); return; }
    if ((form.estado_producto === "con_observaciones" || form.estado_producto === "rechazado") && !form.observaciones_tecnicas) {
      toast.error("Las observaciones técnicas son obligatorias para este estado");
      return;
    }

    setSaving(true);
    const result = await updateMecAEntregable(selected.id, {
      fecha_recepcion: form.fecha_recepcion || null,
      estado_producto: form.estado_producto,
      observaciones_tecnicas: form.observaciones_tecnicas || null,
      medidas_correctivas: form.medidas_correctivas || null,
    });
    if (!result.success) { toast.error(result.error); setSaving(false); return; }

    if (form.estado_producto === "conforme") {
      await sendNotificacionMecA({
        tipo: "aviso_general",
        asunto: `Entregable aprobado — ${selected.consultor_nombre}`,
        mensaje: `[Iniciativa ${resolvedId}] — Producto ${selected.numero_producto} del consultor ${selected.consultor_nombre} ha sido marcado como CONFORME. Pendiente de pago SECO.\n\nContrato: ${selected.numero_contrato ?? "—"}\nMonto: US$ ${selected.presupuesto_usd?.toLocaleString() ?? "—"}`,
        destinatario_rol: "administracion",
      });
      toast.success("Conformidad registrada y notificación enviada a Carmen");
    } else {
      toast.success("Registro actualizado");
    }

    setSelected(null);
    setSaving(false);
    load();
  }

  async function handleSaveNewEntregable() {
    if (!newForm.actividad_id) { toast.error("Selecciona una actividad"); return; }
    if (!newForm.consultor_nombre) { toast.error("Ingresa el responsable"); return; }
    if (!newForm.numero_producto) { toast.error("Ingresa el nombre del producto"); return; }
    
    setSaving(true);
    const result = await insertMecAEntregable({
      iniciativa_id: resolvedId,
      actividad_id: newForm.actividad_id,
      consultor_nombre: newForm.consultor_nombre,
      consultor_dni_ruc: null,
      rol_responsable: newForm.rol_responsable || null,
      objetivo_consultoria: null,
      numero_contrato: null,
      fecha_inicio_contrato: null,
      fecha_fin_contrato: null,
      numero_producto: newForm.numero_producto,
      descripcion_producto: newForm.descripcion_producto || null,
      tipo_producto: newForm.tipo_producto || null,
      plazo_entrega: newForm.plazo_entrega || null,
      estado_producto: newForm.estado_producto || "pendiente",
      presupuesto_usd: newForm.presupuesto_usd ? Number(newForm.presupuesto_usd) : null,
      presupuesto_soles: null,
      fecha_recepcion: null,
      observaciones_tecnicas: newForm.observaciones_tecnicas || null,
      medidas_correctivas: null,
      fecha_no_objecion: null,
      fecha_pago: null,
      monto_comprobante_soles: null,
      tipo_cambio: null,
      pago_usd: null,
      numero_comprobante: null,
      has_adjunto: true
    });

    setSaving(false);
    if (!result.success) { toast.error(result.error); return; }
    
    toast.success("Entregable registrado");
    setIsNewOpen(false);
    load();
  }

  // Group by consultant
  const consultores = [...new Set(entregables.map(e => e.consultor_nombre))];

  const totalPresupUSD = entregables.reduce((s, e) => s + (e.presupuesto_usd ?? 0), 0);
  const totalPagadoUSD = entregables.reduce((s, e) => s + (e.pago_usd ?? 0), 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Entregables de Consultores</h1>
          <p className="text-sm text-muted-foreground">Registro de conformidades y seguimiento de pagos SECO</p>
        </div>
        <Button onClick={() => {
          setNewForm({
            actividad_id: "", consultor_nombre: "", rol_responsable: "",
            numero_producto: "", descripcion_producto: "", tipo_producto: "",
            plazo_entrega: "", estado_producto: "pendiente", presupuesto_usd: "",
            observaciones_tecnicas: ""
          });
          setIsNewOpen(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo entregable
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total entregables", val: entregables.length, cls: "" },
          { label: "Conformes", val: entregables.filter(e => e.estado_producto === "conforme").length, cls: "text-emerald-600" },
          { label: "Comprometido SECO", val: `US$ ${totalPresupUSD.toLocaleString()}`, cls: "" },
          { label: "Pagado SECO", val: `US$ ${totalPagadoUSD.toLocaleString()}`, cls: "text-blue-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando entregables…</div>
      ) : entregables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay entregables registrados. Tu asesora de políticas configura los contratos.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultores.map(consultor => {
            const ents = entregables.filter(e => e.consultor_nombre === consultor);
            const primerEnt = ents[0];
            return (
              <Card key={consultor}>
                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-sm">{consultor}</p>
                      <p className="text-xs text-muted-foreground">
                        {primerEnt.numero_contrato && `Contrato: ${primerEnt.numero_contrato}`}
                        {primerEnt.fecha_inicio_contrato && ` · ${format(new Date(primerEnt.fecha_inicio_contrato), "dd MMM yyyy", { locale: es })}`}
                        {primerEnt.fecha_fin_contrato && ` → ${format(new Date(primerEnt.fecha_fin_contrato), "dd MMM yyyy", { locale: es })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 sm:mt-0">
                      <div>
                        <DollarSign className="h-3 w-3 inline mr-0.5" />
                        US$ {ents.reduce((s, e) => s + (e.presupuesto_usd ?? 0), 0).toLocaleString()} total
                      </div>
                      <Button size="sm" variant="outline" className="cursor-pointer inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => {
                        setNewForm({
                          actividad_id: "", consultor_nombre: consultor, rol_responsable: "",
                          numero_producto: "", descripcion_producto: "", tipo_producto: "",
                          plazo_entrega: "", estado_producto: "pendiente", presupuesto_usd: "",
                          observaciones_tecnicas: ""
                        });
                        setIsNewOpen(true);
                      }}>
                        <Plus className="h-3 w-3 inline mr-0.5" />
                        Subir producto
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {["Producto","Descripción","Plazo","Presupuesto","Estado técnico","Estado pago","Documento","Acción"].map(h => (
                          <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ents.map(ent => {
                        const ec = ESTADO_CONFIG[ent.estado_producto] ?? ESTADO_CONFIG.pendiente;
                        const pc = ent.fecha_pago ? PAGO_CONFIG.pago_ejecutado : (ent.estado_producto === "conforme" ? PAGO_CONFIG.pendiente : PAGO_CONFIG.sin_pago);
                        return (
                          <tr key={ent.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-mono text-xs font-bold">{ent.numero_producto}</td>
                            <td className="px-4 py-2.5 text-xs max-w-[200px]"><p className="line-clamp-2">{ent.descripcion_producto ?? "—"}</p></td>
                            <td className="px-4 py-2.5 text-xs">
                              {ent.plazo_entrega ? format(new Date(ent.plazo_entrega), "dd MMM yyyy", { locale: es }) : "—"}
                              {ent.plazo_entrega && new Date(ent.plazo_entrega) < new Date() && ent.estado_producto === "pendiente" && (
                                <span className="ml-1 text-[9px] text-red-600 font-semibold">VENCIDO</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono">
                              {ent.presupuesto_usd ? `US$ ${ent.presupuesto_usd.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className={`text-[10px] gap-1 ${ec.cls}`}>
                                <ec.icon className="h-3 w-3" />
                                {ec.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className={`text-[10px] ${pc.cls}`}>{pc.label}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-center">
                              {ent.has_adjunto ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {ent.estado_producto !== "conforme" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openConformidad(ent)}>
                                  Revisar
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Conformidad Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Conformidad — {selected?.numero_producto}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
                <p><span className="font-semibold">Consultor:</span> {selected.consultor_nombre}</p>
                <p><span className="font-semibold">Descripción:</span> {selected.descripcion_producto ?? "—"}</p>
                <p><span className="font-semibold">Presupuesto:</span> US$ {selected.presupuesto_usd?.toLocaleString() ?? "—"} / S/ {selected.presupuesto_soles?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fecha de recepción *</Label>
                  <Input type="date" className="mt-1 h-8" value={form.fecha_recepcion} onChange={e => setForm({...form, fecha_recepcion: e.target.value})} required />
                </div>
                <div>
                  <Label className="text-xs">Estado del producto *</Label>
                  <Select value={form.estado_producto} onValueChange={v => setForm({...form, estado_producto: v})}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conforme">Conforme ✓</SelectItem>
                      <SelectItem value="con_observaciones">Con observaciones</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">
                  Observaciones técnicas {(form.estado_producto === "con_observaciones" || form.estado_producto === "rechazado") && <span className="text-red-500">*</span>}
                </Label>
                <Textarea className="mt-1 text-sm" rows={2} value={form.observaciones_tecnicas} onChange={e => setForm({...form, observaciones_tecnicas: e.target.value})} placeholder="Detalles sobre el producto recibido…" />
              </div>
              {(form.estado_producto === "con_observaciones" || form.estado_producto === "rechazado") && (
                <div>
                  <Label className="text-xs">Medidas correctivas</Label>
                  <Textarea className="mt-1 text-sm" rows={2} value={form.medidas_correctivas} onChange={e => setForm({...form, medidas_correctivas: e.target.value})} placeholder="Acciones requeridas al consultor…" />
                </div>
              )}
              {form.estado_producto === "conforme" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  ✅ Al guardar, se notificará automáticamente a Carmen para ejecutar el pago SECO.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={handleSaveConformidad} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Nuevo Entregable Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Entregable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Actividad vinculada *</Label>
              <Select value={newForm.actividad_id} onValueChange={v => setNewForm({...newForm, actividad_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona la actividad" /></SelectTrigger>
                <SelectContent>
                  {arbol.map(act => (
                    <SelectItem key={act.id} value={act.id}>{act.codigo} - {act.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Responsable *</Label>
                <Input value={newForm.consultor_nombre} onChange={e => setNewForm({...newForm, consultor_nombre: e.target.value})} className="mt-1" placeholder="Nombre completo" />
              </div>
              <div>
                <Label className="text-xs">Rol</Label>
                <Select value={newForm.rol_responsable} onValueChange={v => setNewForm({...newForm, rol_responsable: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    <SelectItem value="equipo_interno">Equipo interno</SelectItem>
                    <SelectItem value="socio">Socio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <Label className="text-xs">Nombre producto *</Label>
                <Input value={newForm.numero_producto} onChange={e => setNewForm({...newForm, numero_producto: e.target.value})} className="mt-1" placeholder="Ej. Informe Final" />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={newForm.tipo_producto} onValueChange={v => setNewForm({...newForm, tipo_producto: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informe">Informe</SelectItem>
                    <SelectItem value="producto">Producto</SelectItem>
                    <SelectItem value="estudio">Estudio</SelectItem>
                    <SelectItem value="capacitacion">Capacitación</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={newForm.descripcion_producto} onChange={e => setNewForm({...newForm, descripcion_producto: e.target.value})} className="mt-1 h-16" placeholder="Descripción breve..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Fecha de entrega</Label>
                <Input type="date" value={newForm.plazo_entrega} onChange={e => setNewForm({...newForm, plazo_entrega: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Estado técnico</Label>
                <Select value={newForm.estado_producto} onValueChange={v => setNewForm({...newForm, estado_producto: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="con_observaciones">Observado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Presupuesto vinculado (USD)</Label>
                <Input type="number" min="0" step="0.01" value={newForm.presupuesto_usd} onChange={e => setNewForm({...newForm, presupuesto_usd: e.target.value})} className="mt-1" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Documento adjunto</Label>
                <Input type="file" className="mt-1" accept=".pdf,.doc,.docx,.jpg,.png" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea value={newForm.observaciones_tecnicas} onChange={e => setNewForm({...newForm, observaciones_tecnicas: e.target.value})} className="mt-1 h-16" placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNewEntregable} disabled={saving}>Guardar entregable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
