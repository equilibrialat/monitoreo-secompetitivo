import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, CreditCard } from "lucide-react";
import { fetchMecAEntregablesPendientesPago, updateMecAEntregable } from "@/lib/mecA";
import { sendNotificacionMecA } from "@/lib/notificaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Simple CSV export (xlsx would require external lib; using CSV for now)
function exportarCSV(data: any[]) {
  const headers = ["Iniciativa","EPB","Consultor","Contrato","Producto","Presup S/","Presup USD","Fecha conformidad"];
  const rows = data.map(e => [
    e.mec_a_iniciativas?.nombre ?? "",
    e.mec_a_iniciativas?.epb_nombre ?? "",
    e.consultor_nombre,
    e.numero_contrato ?? "",
    e.numero_producto,
    e.presupuesto_soles ?? "",
    e.presupuesto_usd ?? "",
    e.updated_at ? format(new Date(e.updated_at), "dd/MM/yyyy") : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `pagos-pendientes-mec-a-${format(new Date(), "yyyyMMdd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function TabPagosPendientesMecA() {
  const [entregables, setEntregables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ fecha_pago: "", monto_comprobante_soles: "", tipo_cambio: "", numero_comprobante: "" });
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await fetchMecAEntregablesPendientesPago();
    setEntregables(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = entregables.filter(e =>
    !filtro ||
    e.consultor_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    (e.mec_a_iniciativas as any)?.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    e.numero_contrato?.toLowerCase().includes(filtro.toLowerCase())
  );

  const pagoUSD = form.tipo_cambio > 0 && form.monto_comprobante_soles
    ? +(Number(form.monto_comprobante_soles) / Number(form.tipo_cambio)).toFixed(2)
    : null;

  async function handleRegistrarPago() {
    if (!selected) return;
    if (!form.fecha_pago || !form.monto_comprobante_soles) {
      toast.error("Fecha y monto son obligatorios");
      return;
    }
    setSaving(true);
    const result = await updateMecAEntregable(selected.id, {
      fecha_pago: form.fecha_pago,
      monto_comprobante_soles: Number(form.monto_comprobante_soles),
      tipo_cambio: form.tipo_cambio ? Number(form.tipo_cambio) : null,
      pago_usd: pagoUSD,
      numero_comprobante: form.numero_comprobante || null,
    });
    if (!result.success) { toast.error(result.error); setSaving(false); return; }

    await sendNotificacionMecA({
      tipo: "auto_aprobado",
      asunto: "Pago SECO ejecutado",
      mensaje: `Se ha registrado el pago para el entregable ${selected.numero_producto} del consultor ${selected.consultor_nombre}.\n\nMonto: S/ ${Number(form.monto_comprobante_soles).toLocaleString()} (US$ ${pagoUSD?.toLocaleString() ?? "—"})\nFecha: ${form.fecha_pago}\nComprobante: ${form.numero_comprobante || "—"}`,
      destinatario_rol: "gestor_iniciativa",
    });

    toast.success("Pago registrado. Gestor notificado.");
    setSaving(false);
    setSelected(null);
    setForm({ fecha_pago: "", monto_comprobante_soles: "", tipo_cambio: "", numero_comprobante: "" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Entregables aprobados pendientes de pago ({filtered.length})
          </h3>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar consultor, iniciativa, contrato…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="h-8 w-56 text-xs"
          />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportarCSV(filtered)}>
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {filtro ? "Sin resultados para el filtro aplicado." : "No hay entregables pendientes de pago. ✅"}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Iniciativa","EPB","Consultor","Contrato","Producto","Presup S/","Presup USD","Conformidad","Acción"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(e => {
                const ini = (e as any).mec_a_iniciativas;
                return (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-xs">{ini?.nombre ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{ini?.epb_siglas ?? ini?.epb_nombre ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-medium">{e.consultor_nombre}</td>
                    <td className="px-3 py-2.5 text-xs font-mono">{e.numero_contrato ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <Badge variant="outline" className="text-[10px]">{e.numero_producto}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-right">{e.presupuesto_soles?.toLocaleString("es-PE") ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-right">{e.presupuesto_usd?.toLocaleString("es-PE") ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {e.updated_at ? format(new Date(e.updated_at), "dd MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setSelected(e)}>
                        <CreditCard className="h-3 w-3" /> Registrar pago
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Pago SECO — {selected?.numero_producto}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
                <p><span className="font-semibold">Consultor:</span> {selected.consultor_nombre}</p>
                <p><span className="font-semibold">Contrato:</span> {selected.numero_contrato ?? "—"}</p>
                <p><span className="font-semibold">Presupuesto:</span> US$ {selected.presupuesto_usd?.toLocaleString() ?? "—"} / S/ {selected.presupuesto_soles?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Fecha de pago *</Label><Input type="date" className="h-8 mt-1" value={form.fecha_pago} onChange={e => setForm({...form, fecha_pago: e.target.value})} /></div>
                <div><Label className="text-xs">Nº comprobante</Label><Input className="h-8 mt-1" value={form.numero_comprobante} onChange={e => setForm({...form, numero_comprobante: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><Label className="text-xs">Monto comprobante S/ *</Label><Input type="number" min={0} step="0.01" className="h-8 mt-1" value={form.monto_comprobante_soles} onChange={e => setForm({...form, monto_comprobante_soles: e.target.value})} /></div>
                <div><Label className="text-xs">Tipo cambio</Label><Input type="number" min={0} step="0.0001" className="h-8 mt-1" value={form.tipo_cambio} onChange={e => setForm({...form, tipo_cambio: e.target.value})} placeholder="3.75" /></div>
              </div>
              {pagoUSD !== null && (
                <div className="rounded bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                  Pago equivalente: <span className="font-bold">US$ {pagoUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={handleRegistrarPago} disabled={saving}>{saving ? "Guardando…" : "Marcar como pagado"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
