import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ChevronRight, Upload } from "lucide-react";
import {
  fetchMecAIniciativa, upsertMecAIniciativa, fetchMecAResultados, fetchMecAProductos,
  fetchMecAActividades, insertMecAResultado, insertMecAProducto, insertMecAActividad,
  insertMecAEntregable, type MecAIniciativa, type MecAResultado, type MecAProducto, type MecAActividad,
} from "@/lib/mecA";

type DialogType = "resultado" | "producto" | "actividad" | "consultor" | null;

export default function ConfiguracionAPEPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "nueva";

  const [iniciativa, setIniciativa] = useState<Partial<MecAIniciativa>>({ nombre: "", epb_nombre: "", epb_siglas: "", fecha_inicio: "", fecha_fin: "", presupuesto_seco_usd: undefined, estado: "activa" });
  const [resultados, setResultados] = useState<MecAResultado[]>([]);
  const [productos, setProductos] = useState<MecAProducto[]>([]);
  const [actividades, setActividades] = useState<MecAActividad[]>([]);
  const [saving, setSaving] = useState(false);
  const [iniciativaId, setIniciativaId] = useState<string | null>(isNew ? null : id ?? null);

  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [parentId, setParentId] = useState("");
  const [form, setForm] = useState<any>({});

  async function loadAPE(iniId: string) {
    const [res, prod, acts] = await Promise.all([
      fetchMecAResultados(iniId), fetchMecAProductos(iniId), fetchMecAActividades(iniId),
    ]);
    setResultados(res); setProductos(prod); setActividades(acts);
  }

  useEffect(() => {
    if (!isNew && id) {
      fetchMecAIniciativa(id).then(ini => { if (ini) setIniciativa(ini); });
      loadAPE(id);
    }
  }, [id]);

  async function handleSaveIniciativa() {
    if (!iniciativa.nombre || !iniciativa.epb_nombre || !iniciativa.fecha_inicio || !iniciativa.fecha_fin) {
      toast.error("Nombre, EPB, fechas son obligatorios"); return;
    }
    setSaving(true);
    const result = await upsertMecAIniciativa(
      iniciativa as any,
      iniciativaId ?? undefined,
    );
    setSaving(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(isNew ? "Iniciativa creada" : "Iniciativa actualizada");
    if (isNew && result.id) {
      setIniciativaId(result.id);
      navigate(`/mec-a/iniciativa/${result.id}/configuracion`, { replace: true });
      loadAPE(result.id);
    }
  }

  async function handleAddItem() {
    if (!iniciativaId) { toast.error("Guarda primero la iniciativa"); return; }
    if (dialogType === "resultado") {
      if (!form.numero || !form.nombre) { toast.error("Número y nombre son obligatorios"); return; }
      const r = await insertMecAResultado({ iniciativa_id: iniciativaId, numero: form.numero, nombre: form.nombre, indicador_nombre: form.indicador_nombre || null, indicador_unidad: form.indicador_unidad || null, indicador_meta: form.indicador_meta ? Number(form.indicador_meta) : null, orden: resultados.length });
      if (!r.success) { toast.error(r.error); return; }
    } else if (dialogType === "producto") {
      if (!form.numero || !form.nombre) { toast.error("Número y nombre son obligatorios"); return; }
      const r = await insertMecAProducto({ resultado_id: parentId, iniciativa_id: iniciativaId, numero: form.numero, nombre: form.nombre, orden: productos.filter(p => p.resultado_id === parentId).length });
      if (!r.success) { toast.error(r.error); return; }
    } else if (dialogType === "actividad") {
      if (!form.codigo || !form.descripcion || !form.unidad_medida) { toast.error("Código, descripción y unidad son obligatorios"); return; }
      const r = await insertMecAActividad({
        producto_id: parentId, iniciativa_id: iniciativaId,
        codigo: form.codigo, descripcion: form.descripcion, unidad_medida: form.unidad_medida,
        meta_total: form.meta_total ? Number(form.meta_total) : null,
        seco_honorarios_usd: Number(form.seco_honorarios_usd ?? 0), seco_viaticos_usd: Number(form.seco_viaticos_usd ?? 0),
        seco_servicios_usd: Number(form.seco_servicios_usd ?? 0), seco_materiales_usd: Number(form.seco_materiales_usd ?? 0),
        cm_honorarios_usd: Number(form.cm_honorarios_usd ?? 0), cm_viaticos_usd: Number(form.cm_viaticos_usd ?? 0),
        cm_servicios_usd: Number(form.cm_servicios_usd ?? 0), cm_materiales_usd: Number(form.cm_materiales_usd ?? 0),
        cnm_total_usd: Number(form.cnm_total_usd ?? 0),
        orden: actividades.filter(a => a.producto_id === parentId).length,
      });
      if (!r.success) { toast.error(r.error); return; }
    } else if (dialogType === "consultor") {
      if (!form.consultor_nombre || !form.numero_producto) { toast.error("Nombre del consultor y número de producto son obligatorios"); return; }
      const r = await insertMecAEntregable({
        actividad_id: form.actividad_id || null, iniciativa_id: iniciativaId,
        consultor_nombre: form.consultor_nombre, consultor_dni_ruc: form.consultor_dni_ruc || null,
        objetivo_consultoria: form.objetivo_consultoria || null, numero_contrato: form.numero_contrato || null,
        fecha_inicio_contrato: form.fecha_inicio_contrato || null, fecha_fin_contrato: form.fecha_fin_contrato || null,
        numero_producto: form.numero_producto, descripcion_producto: form.descripcion_producto || null,
        presupuesto_soles: form.presupuesto_soles ? Number(form.presupuesto_soles) : null,
        presupuesto_usd: form.presupuesto_usd ? Number(form.presupuesto_usd) : null,
        plazo_entrega: form.plazo_entrega || null, estado_producto: "pendiente",
        fecha_recepcion: null, observaciones_tecnicas: null, medidas_correctivas: null,
        fecha_no_objecion: null, fecha_pago: null, monto_comprobante_soles: null,
        tipo_cambio: null, pago_usd: null, numero_comprobante: null, registrado_por: null,
      });
      if (!r.success) { toast.error(r.error); return; }
    }
    toast.success("Creado correctamente");
    setDialogType(null);
    setForm({});
    if (iniciativaId) loadAPE(iniciativaId);
  }

  const secoTotal = actividades.reduce((s, a) => s + a.seco_honorarios_usd + a.seco_viaticos_usd + a.seco_servicios_usd + a.seco_materiales_usd, 0);

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-lg font-bold">{isNew ? "Nueva Iniciativa" : "Configurar APE"}</h1>
        <p className="text-sm text-muted-foreground">Datos generales y estructura del Acta de Participación y Entendimiento</p>
      </div>

      {/* General data */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Datos Generales</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Nombre de la iniciativa *</Label><Input className="mt-1 h-8" value={iniciativa.nombre ?? ""} onChange={e => setIniciativa({...iniciativa, nombre: e.target.value})} /></div>
            <div><Label className="text-xs">Presupuesto SECO (USD)</Label><Input type="number" className="mt-1 h-8" value={iniciativa.presupuesto_seco_usd ?? ""} onChange={e => setIniciativa({...iniciativa, presupuesto_seco_usd: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Entidad Pública (EPB) *</Label><Input className="mt-1 h-8" value={iniciativa.epb_nombre ?? ""} onChange={e => setIniciativa({...iniciativa, epb_nombre: e.target.value})} placeholder="SENASA, MINCETUR…" /></div>
            <div><Label className="text-xs">Siglas EPB</Label><Input className="mt-1 h-8" value={iniciativa.epb_siglas ?? ""} onChange={e => setIniciativa({...iniciativa, epb_siglas: e.target.value})} placeholder="SENASA" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Fecha inicio *</Label><Input type="date" className="mt-1 h-8" value={iniciativa.fecha_inicio ?? ""} onChange={e => setIniciativa({...iniciativa, fecha_inicio: e.target.value})} /></div>
            <div><Label className="text-xs">Fecha fin *</Label><Input type="date" className="mt-1 h-8" value={iniciativa.fecha_fin ?? ""} onChange={e => setIniciativa({...iniciativa, fecha_fin: e.target.value})} /></div>
            <div><Label className="text-xs">Estado</Label>
              <Select value={iniciativa.estado} onValueChange={v => setIniciativa({...iniciativa, estado: v as any})}>
                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activa">Activa</SelectItem><SelectItem value="cerrada">Cerrada</SelectItem><SelectItem value="suspendida">Suspendida</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end"><Button onClick={handleSaveIniciativa} disabled={saving} size="sm">{saving ? "Guardando…" : isNew ? "Crear iniciativa" : "Actualizar datos"}</Button></div>
        </CardContent>
      </Card>

      {/* APE Tree */}
      {iniciativaId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Estructura APE ({actividades.length} actividades · US$ {secoTotal.toLocaleString()} SECO)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setDialogType("resultado"); setForm({}); }}>
                  <Plus className="h-3 w-3 mr-1" /> Resultado
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setDialogType("consultor"); setForm({}); }}>
                  <Plus className="h-3 w-3 mr-1" /> Consultor/Contrato
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {resultados.map(res => (
              <div key={res.id} className="border rounded-lg">
                <div className="px-3 py-2.5 bg-primary/5 border-b flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{res.numero}</span>
                    <span className="text-sm font-semibold">{res.nombre}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setDialogType("producto"); setParentId(res.id); setForm({}); }}>
                    <Plus className="h-3 w-3 mr-0.5" /> Producto
                  </Button>
                </div>
                {productos.filter(p => p.resultado_id === res.id).map(prod => (
                  <div key={prod.id} className="ml-4 border-l">
                    <div className="px-3 py-2 flex items-center justify-between border-b last:border-0">
                      <div>
                        <ChevronRight className="h-3 w-3 inline text-muted-foreground mr-1" />
                        <span className="font-mono text-xs text-muted-foreground mr-1">{prod.numero}</span>
                        <span className="text-xs">{prod.nombre}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px]" onClick={() => { setDialogType("actividad"); setParentId(prod.id); setForm({}); }}>
                        <Plus className="h-2.5 w-2.5 mr-0.5" /> Actividad
                      </Button>
                    </div>
                    {actividades.filter(a => a.producto_id === prod.id).map(act => {
                      const secoAct = act.seco_honorarios_usd + act.seco_viaticos_usd + act.seco_servicios_usd + act.seco_materiales_usd;
                      return (
                        <div key={act.id} className="ml-4 px-3 py-1.5 border-b last:border-0 flex items-center justify-between text-[11px]">
                          <span><span className="font-mono text-muted-foreground mr-1">{act.codigo}</span>{act.descripcion.slice(0, 60)}{act.descripcion.length > 60 && "…"}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {act.meta_total && <Badge variant="outline" className="text-[9px]">{act.meta_total} {act.unidad_medida}</Badge>}
                            {secoAct > 0 && <Badge variant="secondary" className="text-[9px]">SECO: ${secoAct.toLocaleString()}</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
            {resultados.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Añade el primer resultado para empezar a construir el APE.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={!!dialogType} onOpenChange={() => { setDialogType(null); setForm({}); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "resultado" ? "Agregar Resultado" : dialogType === "producto" ? "Agregar Producto" : dialogType === "actividad" ? "Agregar Actividad" : "Agregar Consultor / Entregable"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {(dialogType === "resultado" || dialogType === "producto") && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Número * (ej: R1, P1.1)</Label><Input className="h-8 mt-1" value={form.numero ?? ""} onChange={e => setForm({...form, numero: e.target.value})} /></div>
                  <div><Label className="text-xs">Nombre *</Label><Input className="h-8 mt-1" value={form.nombre ?? ""} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
                </div>
                {dialogType === "resultado" && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2"><Label className="text-xs">Indicador del resultado</Label><Input className="h-8 mt-1" value={form.indicador_nombre ?? ""} onChange={e => setForm({...form, indicador_nombre: e.target.value})} /></div>
                    <div><Label className="text-xs">Meta</Label><Input type="number" className="h-8 mt-1" value={form.indicador_meta ?? ""} onChange={e => setForm({...form, indicador_meta: e.target.value})} /></div>
                  </div>
                )}
              </>
            )}
            {dialogType === "actividad" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Código * (ej: 1.1.1)</Label><Input className="h-8 mt-1" value={form.codigo ?? ""} onChange={e => setForm({...form, codigo: e.target.value})} /></div>
                  <div className="col-span-2"><Label className="text-xs">Descripción *</Label><Input className="h-8 mt-1" value={form.descripcion ?? ""} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Unidad de medida *</Label><Input className="h-8 mt-1" value={form.unidad_medida ?? ""} onChange={e => setForm({...form, unidad_medida: e.target.value})} placeholder="Taller, Servicio, Procedimiento…" /></div>
                  <div><Label className="text-xs">Meta total</Label><Input type="number" className="h-8 mt-1" value={form.meta_total ?? ""} onChange={e => setForm({...form, meta_total: e.target.value})} /></div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Presupuesto SECO planificado (USD)</p>
                <div className="grid grid-cols-4 gap-2">
                  {["Honorarios","Viáticos","Servicios","Materiales"].map((lbl, i) => {
                    const key = ["seco_honorarios_usd","seco_viaticos_usd","seco_servicios_usd","seco_materiales_usd"][i];
                    return <div key={key}><Label className="text-[10px]">{lbl}</Label><Input type="number" min={0} className="h-7 mt-0.5 text-xs" value={form[key] ?? ""} onChange={e => setForm({...form, [key]: e.target.value})} /></div>;
                  })}
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contrapartida monetaria planificada (USD)</p>
                <div className="grid grid-cols-4 gap-2">
                  {["Honorarios","Viáticos","Servicios","Materiales"].map((lbl, i) => {
                    const key = ["cm_honorarios_usd","cm_viaticos_usd","cm_servicios_usd","cm_materiales_usd"][i];
                    return <div key={key}><Label className="text-[10px]">{lbl}</Label><Input type="number" min={0} className="h-7 mt-0.5 text-xs" value={form[key] ?? ""} onChange={e => setForm({...form, [key]: e.target.value})} /></div>;
                  })}
                </div>
                <div><Label className="text-xs">Contrapartida no monetaria total (USD)</Label><Input type="number" min={0} className="h-8 mt-1" value={form.cnm_total_usd ?? ""} onChange={e => setForm({...form, cnm_total_usd: e.target.value})} /></div>
              </>
            )}
            {dialogType === "consultor" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Nombre del consultor *</Label><Input className="h-8 mt-1" value={form.consultor_nombre ?? ""} onChange={e => setForm({...form, consultor_nombre: e.target.value})} /></div>
                  <div><Label className="text-xs">DNI/RUC</Label><Input className="h-8 mt-1" value={form.consultor_dni_ruc ?? ""} onChange={e => setForm({...form, consultor_dni_ruc: e.target.value})} /></div>
                </div>
                <div><Label className="text-xs">Objetivo de la consultoría</Label><Input className="h-8 mt-1" value={form.objetivo_consultoria ?? ""} onChange={e => setForm({...form, objetivo_consultoria: e.target.value})} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Nº Contrato</Label><Input className="h-8 mt-1" value={form.numero_contrato ?? ""} onChange={e => setForm({...form, numero_contrato: e.target.value})} /></div>
                  <div><Label className="text-xs">Inicio contrato</Label><Input type="date" className="h-8 mt-1" value={form.fecha_inicio_contrato ?? ""} onChange={e => setForm({...form, fecha_inicio_contrato: e.target.value})} /></div>
                  <div><Label className="text-xs">Fin contrato</Label><Input type="date" className="h-8 mt-1" value={form.fecha_fin_contrato ?? ""} onChange={e => setForm({...form, fecha_fin_contrato: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Nº Producto * (P1, P2…)</Label><Input className="h-8 mt-1" value={form.numero_producto ?? ""} onChange={e => setForm({...form, numero_producto: e.target.value})} /></div>
                  <div><Label className="text-xs">Plazo de entrega</Label><Input type="date" className="h-8 mt-1" value={form.plazo_entrega ?? ""} onChange={e => setForm({...form, plazo_entrega: e.target.value})} /></div>
                </div>
                <div><Label className="text-xs">Descripción del producto/entregable</Label><Textarea className="mt-1 text-sm" rows={2} value={form.descripcion_producto ?? ""} onChange={e => setForm({...form, descripcion_producto: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Presupuesto S/</Label><Input type="number" className="h-8 mt-1" value={form.presupuesto_soles ?? ""} onChange={e => setForm({...form, presupuesto_soles: e.target.value})} /></div>
                  <div><Label className="text-xs">Presupuesto USD</Label><Input type="number" className="h-8 mt-1" value={form.presupuesto_usd ?? ""} onChange={e => setForm({...form, presupuesto_usd: e.target.value})} /></div>
                </div>
                <div>
                  <Label className="text-xs">Actividad asociada</Label>
                  <Select value={form.actividad_id ?? ""} onValueChange={v => setForm({...form, actividad_id: v})}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Opcional — seleccionar actividad" /></SelectTrigger>
                    <SelectContent>{actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.descripcion.slice(0,40)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogType(null); setForm({}); }}>Cancelar</Button>
            <Button onClick={handleAddItem}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
