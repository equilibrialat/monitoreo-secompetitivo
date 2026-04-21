import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, CheckCircle, AlertCircle, XCircle, Clock, FileText, Loader2, Link as LinkIcon } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ESTADO_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  pendiente: { label: "Pendiente", icon: Clock, cls: "border-slate-200 text-slate-600 bg-slate-50" },
  conforme: { label: "Conforme", icon: CheckCircle, cls: "border-green-200 text-green-700 bg-green-50" },
  observaciones: { label: "Con observaciones", icon: AlertCircle, cls: "border-amber-200 text-amber-700 bg-amber-50" },
  rechazado: { label: "Rechazado", icon: XCircle, cls: "border-red-200 text-red-700 bg-red-50" },
  pagado: { label: "Pagado", icon: CheckCircle, cls: "border-blue-200 text-blue-700 bg-blue-50" },
};

export default function EntregablesGestorPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";

  const { iniciativa, arbol } = useMecAIniciativa(resolvedId);
  const entidadCodigo = iniciativa?.entidad_codigo;

  const [entregables, setEntregables] = useState<any[]>([]);
  const [comprobantes, setComprobantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    actividad_codigo: "",
    nombre_producto: "",
    fecha_entrega: "",
  });

  const loadData = useCallback(async () => {
    if (!entidadCodigo) { setLoading(false); return; }
    setLoading(true);
    try {
      const [eRes, cRes] = await Promise.all([
        (supabase as any).from("entregables").select("*").eq("entidad_codigo", entidadCodigo).order("created_at", { ascending: false }),
        (supabase as any).from("comprobantes").select("id, numero_documento, clase_documento, actividad_codigo").eq("entidad_codigo", entidadCodigo),
      ]);
      setEntregables(eRes.data || []);
      setComprobantes(cRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [entidadCodigo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!entidadCodigo) return;
    if (!form.actividad_codigo || !form.nombre_producto || !form.fecha_entrega) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any).from("entregables").insert({
      entidad_codigo: entidadCodigo,
      actividad_codigo: form.actividad_codigo,
      titulo: form.nombre_producto,
      fecha_compromiso: form.fecha_entrega,
      estado: "pendiente",
    });
    setSaving(false);

    if (error) {
      toast.error("Error al crear entregable");
    } else {
      toast.success("Entregable registrado exitosamente");
      setShowModal(false);
      setForm({ actividad_codigo: "", nombre_producto: "", fecha_entrega: "" });
      loadData();
    }
  };

  const getComprobantesVinculados = (entregable: any) => {
    // Vinculación por código de actividad (no existe columna entregable_id en comprobantes)
    return comprobantes.filter(c => c.actividad_codigo === entregable.actividad_codigo);
  };

  if (!entidadCodigo) {
    return <div className="p-8 text-center text-muted-foreground">Seleccione una iniciativa válida (Mecanismo A).</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Entregables
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de productos y entregables técnicos de la iniciativa (Mec A).</p>
        </div>
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo Entregable</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar Entregable</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-xs">Actividad vinculada *</Label>
                <Select value={form.actividad_codigo} onValueChange={(v) => setForm(p => ({ ...p, actividad_codigo: v }))}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue placeholder="Seleccione actividad" />
                  </SelectTrigger>
                  <SelectContent>
                    {arbol.map(a => (
                      <SelectItem key={a.codigo} value={a.codigo} className="text-xs">
                        {a.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nombre del producto / entregable *</Label>
                <Textarea
                  value={form.nombre_producto}
                  onChange={(e) => setForm(p => ({ ...p, nombre_producto: e.target.value }))}
                  placeholder="Ej: Informe técnico inicial..."
                  className="text-sm min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-xs">Fecha de entrega *</Label>
                <Input
                  type="date"
                  value={form.fecha_entrega}
                  onChange={(e) => setForm(p => ({ ...p, fecha_entrega: e.target.value }))}
                  className="text-sm h-9"
                />
              </div>
              <Button className="w-full mt-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Entregable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Cargando entregables...</p>
        </div>
      ) : entregables.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No hay entregables registrados</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Registre el primer entregable para hacer seguimiento de los productos de las actividades.
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Crear Entregable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {entregables.map((entregable) => {
            const Conf = ESTADO_CONFIG[entregable.estado] || ESTADO_CONFIG.pendiente;
            const Icon = Conf.icon;
            const vinculados = getComprobantesVinculados(entregable);
            return (
              <Card key={entregable.id} className="overflow-hidden transition-all hover:shadow-md">
                <div className="flex flex-col md:flex-row gap-0 md:gap-6 p-5">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {entregable.actividad_codigo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Compromiso: {entregable.fecha_compromiso ? format(new Date(entregable.fecha_compromiso + "T12:00:00"), "dd MMM yyyy", { locale: es }) : "—"}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-foreground leading-tight">
                          {entregable.titulo}
                        </h3>
                      </div>
                      <Badge variant="outline" className={`shrink-0 capitalize gap-1 ${Conf.cls}`}>
                        <Icon className="h-3 w-3" /> {Conf.label}
                      </Badge>
                    </div>
                    
                    {entregable.observaciones && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                        <p className="text-xs font-medium text-amber-800 mb-1">Observaciones:</p>
                        <p className="text-xs text-amber-700">{entregable.observaciones}</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-64 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 mt-4 md:mt-0">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
                          Comprobantes de pago vinculados
                        </p>
                        {vinculados.length > 0 ? (
                          <div className="space-y-1.5">
                            {vinculados.map((c: any) => (
                              <div key={c.id} className="flex items-center gap-1.5 text-xs bg-muted/40 p-1.5 rounded text-muted-foreground">
                                <LinkIcon className="h-3 w-3 shrink-0" />
                                <span className="font-medium truncate">{c.clase_documento} {c.numero_documento}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></span>
                            Sin comprobantes vinculados
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
