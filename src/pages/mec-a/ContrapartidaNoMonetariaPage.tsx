import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ContrapartidaNoMonetariaRow {
  id: string;
  entidad_codigo: string;
  actividad_codigo: string;
  fecha: string;
  funcionario_nombre: string;
  funcionario_cargo: string | null;
  concepto: string;
  unidad: string | null;
  cantidad: number;
  costo_unitario_soles: number;
  total_soles: number | null;
  tipo_cambio: number | null;
  total_usd: number | null;
  created_at: string;
}

export default function ContrapartidaNoMonetariaPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";
  const { iniciativa, actividades } = useMecAIniciativa(resolvedId);
  const entidadCodigo = iniciativa?.entidad_codigo ?? null;

  const [registros, setRegistros] = useState<ContrapartidaNoMonetariaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    actividad_codigo: "", fecha: "", funcionario_nombre: "", funcionario_cargo: "",
    concepto: "", unidad: "Hora", cantidad: "", costo_unitario_soles: "", tipo_cambio: "",
  });

  const load = async () => {
    if (!entidadCodigo) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contrapartida_no_monetaria")
      .select("*")
      .eq("entidad_codigo", entidadCodigo)
      .order("fecha", { ascending: false });
    if (error) { console.error(error); toast.error("Error al cargar registros"); }
    setRegistros((data as ContrapartidaNoMonetariaRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (entidadCodigo) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entidadCodigo]);

  const totalSoles = form.cantidad && form.costo_unitario_soles
    ? (Number(form.cantidad) * Number(form.costo_unitario_soles)).toFixed(2)
    : "—";
  const totalUSD = form.tipo_cambio > 0 && totalSoles !== "—"
    ? (Number(totalSoles) / Number(form.tipo_cambio)).toFixed(2)
    : "—";

  async function handleSave() {
    if (!entidadCodigo) { toast.error("Iniciativa sin entidad asociada"); return; }
    if (!form.actividad_codigo || !form.fecha || !form.funcionario_nombre || !form.funcionario_cargo || !form.concepto || !form.cantidad || !form.costo_unitario_soles) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setSaving(true);
    const cantidad = Number(form.cantidad);
    const costo = Number(form.costo_unitario_soles);
    const tc = form.tipo_cambio ? Number(form.tipo_cambio) : null;
    const total_usd = tc && tc > 0 ? +((cantidad * costo) / tc).toFixed(2) : null;
    const { error } = await (supabase as any).from("contrapartida_no_monetaria").insert({
      entidad_codigo: entidadCodigo,
      actividad_codigo: form.actividad_codigo,
      fecha: form.fecha,
      funcionario_nombre: form.funcionario_nombre,
      funcionario_cargo: form.funcionario_cargo,
      concepto: form.concepto,
      unidad: form.unidad || "Hora",
      cantidad,
      costo_unitario_soles: costo,
      tipo_cambio: tc,
      total_usd,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Horas registradas correctamente");
    setDialogOpen(false);
    setForm({ actividad_codigo: "", fecha: "", funcionario_nombre: "", funcionario_cargo: "", concepto: "", unidad: "Hora", cantidad: "", costo_unitario_soles: "", tipo_cambio: "" });
    load();
  }

  async function handleDelete(rid: string) {
    const { error } = await (supabase as any).from("contrapartida_no_monetaria").delete().eq("id", rid);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    load();
  }

  const grandTotalSoles = registros.reduce((s, r) => s + (Number(r.total_soles) || (r.cantidad * r.costo_unitario_soles)), 0);
  const grandTotalUSD = registros.reduce((s, r) => s + (Number(r.total_usd) || 0), 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Contrapartida No Monetaria</h1>
          <p className="text-sm text-muted-foreground">Horas de funcionarios públicos valorizadas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar horas
        </Button>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Total contrapartida no monetaria registrada</span>
        <div className="text-right">
          <p className="font-bold">S/ {grandTotalSoles.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
          {grandTotalUSD > 0 && <p className="text-xs text-muted-foreground">≈ US$ {grandTotalUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando…</div>
      ) : registros.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">Sin registros. Usa "Agregar horas" para comenzar.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                {["Fecha","Actividad","Funcionario","Cargo","Concepto","Unidad","Cantidad","C. Unitario S/","Total S/","Total US$",""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y">
                {registros.map(r => {
                  const act = actividades.find(a => a.id === r.actividad_id);
                  const totS = r.total_soles ?? r.cantidad * r.costo_unitario_soles;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs">{format(new Date(r.fecha_actividad), "dd/MM/yyyy")}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{act?.codigo ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{r.nombre_funcionario}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.cargo_funcionario}</td>
                      <td className="px-3 py-2 text-xs max-w-[160px]"><p className="line-clamp-1">{r.concepto}</p></td>
                      <td className="px-3 py-2 text-xs">{r.unidad_medida}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{r.cantidad}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{r.costo_unitario_soles.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono font-semibold">{totS.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{r.total_usd ? r.total_usd.toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—"}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={async () => { await deleteMecAContrapartidaNoMonetaria(r.id); toast.success("Eliminado"); load(); }}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Horas de Funcionario</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Actividad</Label>
                <Select value={form.actividad_id} onValueChange={v => setForm({...form, actividad_id: v})}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>{actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fecha de la actividad *</Label>
                <Input type="date" className="h-8 mt-1" value={form.fecha_actividad} onChange={e => setForm({...form, fecha_actividad: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre del funcionario *</Label>
                <Input className="h-8 mt-1" value={form.nombre_funcionario} onChange={e => setForm({...form, nombre_funcionario: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Cargo *</Label>
                <Input className="h-8 mt-1" value={form.cargo_funcionario} onChange={e => setForm({...form, cargo_funcionario: e.target.value})} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Concepto *</Label>
              <Input className="h-8 mt-1" value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Reunión con proveedor, Monitoreo de campo…" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Unidad</Label>
                <Input className="h-8 mt-1" value={form.unidad_medida} onChange={e => setForm({...form, unidad_medida: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Cantidad *</Label>
                <Input type="number" min={0} step="0.5" className="h-8 mt-1" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Costo unit. S/ *</Label>
                <Input type="number" min={0} step="0.01" className="h-8 mt-1" value={form.costo_unitario_soles} onChange={e => setForm({...form, costo_unitario_soles: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Tipo cambio</Label>
                <Input type="number" min={0} step="0.0001" className="h-8 mt-1" value={form.tipo_cambio} onChange={e => setForm({...form, tipo_cambio: e.target.value})} placeholder="3.75" />
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Total S/: </span><span className="font-bold">S/ {totalSoles !== "—" ? Number(totalSoles).toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—"}</span></div>
              <div><span className="text-muted-foreground">Total US$: </span><span className="font-bold">US$ {totalUSD !== "—" ? Number(totalUSD).toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—"}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar registro"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
