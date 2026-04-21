import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import {
  fetchMecAContrapartidaMonetaria, insertMecAContrapartidaMonetaria, deleteMecAContrapartidaMonetaria,
  type MecAContrapartidaMonetaria, TIPO_RECURSO_LABELS,
} from "@/lib/mecA";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPOS = ["honorarios","viajes_viaticos","servicios_terceros","materiales"] as const;

export default function ContrapartidaMonetariaPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";
  const { actividades } = useMecAIniciativa(resolvedId);

  const [registros, setRegistros] = useState<MecAContrapartidaMonetaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ tipo_recurso: "honorarios", monto_soles: "", tipo_cambio: "", fecha_comprobante: "", concepto: "", nombre_proveedor: "", numero_comprobante: "", actividad_id: "" });

  const load = async () => {
    setLoading(true);
    const data = await fetchMecAContrapartidaMonetaria(resolvedId);
    setRegistros(data);
    setLoading(false);
  };

  useEffect(() => { if (resolvedId) load(); }, [resolvedId]);

  const montoUSD = form.tipo_cambio > 0 ? (Number(form.monto_soles) / Number(form.tipo_cambio)).toFixed(2) : "—";

  async function handleSave() {
    if (!form.fecha_comprobante || !form.concepto || !form.monto_soles) {
      toast.error("Fecha, concepto y monto son obligatorios");
      return;
    }
    setSaving(true);
    const result = await insertMecAContrapartidaMonetaria({
      actividad_id: form.actividad_id || null,
      iniciativa_id: resolvedId,
      tipo_recurso: form.tipo_recurso,
      fecha_comprobante: form.fecha_comprobante,
      nombre_proveedor: form.nombre_proveedor || null,
      numero_comprobante: form.numero_comprobante || null,
      concepto: form.concepto,
      monto_soles: Number(form.monto_soles),
      tipo_cambio: form.tipo_cambio ? Number(form.tipo_cambio) : null,
      monto_usd: form.tipo_cambio > 0 ? Number(montoUSD) : null,
      registrado_por: null,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success("Pago registrado");
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    await deleteMecAContrapartidaMonetaria(id);
    toast.success("Registro eliminado");
    load();
  }

  // Totals by tipo
  const totalesPorTipo = TIPOS.map(t => ({
    tipo: t,
    total: registros.filter(r => r.tipo_recurso === t).reduce((s, r) => s + r.monto_soles, 0),
    totalUSD: registros.filter(r => r.tipo_recurso === t).reduce((s, r) => s + (r.monto_usd ?? 0), 0),
  }));
  const grandTotal = registros.reduce((s, r) => s + r.monto_soles, 0);
  const grandTotalUSD = registros.reduce((s, r) => s + (r.monto_usd ?? 0), 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Contrapartida Monetaria</h1>
          <p className="text-sm text-muted-foreground">Pagos propios de la EPB registrados en el período</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar pago
        </Button>
      </div>

      {/* Summary by type */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {totalesPorTipo.map(t => (
          <div key={t.tipo} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{TIPO_RECURSO_LABELS[t.tipo]}</p>
            <p className="text-base font-bold mt-0.5">S/ {t.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
            {t.totalUSD > 0 && <p className="text-xs text-muted-foreground">≈ US$ {t.totalUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>}
          </div>
        ))}
      </div>

      {/* Grand total */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Total contrapartida monetaria registrada</span>
        <div className="text-right">
          <p className="font-bold">S/ {grandTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
          {grandTotalUSD > 0 && <p className="text-xs text-muted-foreground">≈ US$ {grandTotalUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando…</div>
      ) : registros.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">Sin registros aún. Usa "Agregar pago" para comenzar.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                {["Fecha","Actividad","Tipo","Concepto","Proveedor","Nº Comprobante","S/","US$",""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y">
                {registros.map(r => {
                  const act = actividades.find(a => a.id === r.actividad_id);
                  return (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs">{format(new Date(r.fecha_comprobante), "dd/MM/yyyy")}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{act?.codigo ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{TIPO_RECURSO_LABELS[r.tipo_recurso]}</Badge></td>
                      <td className="px-3 py-2 text-xs max-w-[180px]"><p className="line-clamp-1">{r.concepto}</p></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.nombre_proveedor ?? "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono">{r.numero_comprobante ?? "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono text-right">{r.monto_soles.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-xs font-mono text-right">{r.monto_usd ? r.monto_usd.toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—"}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
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
          <DialogHeader><DialogTitle>Agregar Pago — Contrapartida Monetaria</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Actividad</Label>
                <Select value={form.actividad_id} onValueChange={v => setForm({...form, actividad_id: v})}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>{actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.descripcion.slice(0,40)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de recurso *</Label>
                <Select value={form.tipo_recurso} onValueChange={v => setForm({...form, tipo_recurso: v})}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{TIPO_RECURSO_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Concepto *</Label>
              <Input className="h-8 mt-1" value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Descripción del gasto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fecha del comprobante *</Label>
                <Input type="date" className="h-8 mt-1" value={form.fecha_comprobante} onChange={e => setForm({...form, fecha_comprobante: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Nombre del proveedor</Label>
                <Input className="h-8 mt-1" value={form.nombre_proveedor} onChange={e => setForm({...form, nombre_proveedor: e.target.value})} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Número de comprobante</Label>
              <Input className="h-8 mt-1" value={form.numero_comprobante} onChange={e => setForm({...form, numero_comprobante: e.target.value})} placeholder="Nº Factura, Recibo…" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Monto S/ *</Label>
                <Input type="number" min={0} step="0.01" className="h-8 mt-1" value={form.monto_soles} onChange={e => setForm({...form, monto_soles: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Tipo de cambio</Label>
                <Input type="number" min={0} step="0.0001" className="h-8 mt-1" value={form.tipo_cambio} onChange={e => setForm({...form, tipo_cambio: e.target.value})} placeholder="3.7500" />
              </div>
              <div>
                <Label className="text-xs">Equivalente US$</Label>
                <div className="h-8 mt-1 flex items-center rounded-md border bg-muted px-3 text-sm font-mono">{montoUSD}</div>
              </div>
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
