import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ESTADO_LABELS: Record<string, string> = { pendiente: "Pendiente", desembolsado: "Desembolsado", rendido: "Rendido", aprobado: "Aprobado" };
function fmt(n: number | null) { return n == null ? "—" : n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function DesembolsosPage() {
  const { entidades } = useRole();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterEntidad, setFilterEntidad] = useState("");

  const mecBEntidades = useMemo(() => entidades.filter(e => e.tipo_entidad?.includes("mec_b")), [entidades]);

  const [form, setForm] = useState({
    entidad_id: "", numero_remesa: 1, monto_usd: 0, tipo_cambio: 0, monto_pen: 0,
    fecha_desembolso: "", trimestre_vinculado: "", observaciones: "", estado: "pendiente",
  });

  async function loadData() {
    setLoading(true);
    const { data: d } = await (supabase as any).from("desembolsos").select("*").order("created_at", { ascending: false });
    setData(d ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let f = data;
    if (filterEntidad) f = f.filter(r => r.entidad_id === filterEntidad);
    return f;
  }, [data, filterEntidad]);

  const entName = (id: string) => entidades.find(e => e.id === id)?.nombre_corto ?? id.slice(0, 8);

  useEffect(() => {
    if (form.monto_usd && form.tipo_cambio) {
      setForm(p => ({ ...p, monto_pen: Math.round(p.monto_usd * p.tipo_cambio * 100) / 100 }));
    }
  }, [form.monto_usd, form.tipo_cambio]);

  async function handleSave() {
    if (!form.entidad_id) { toast.error("Seleccione entidad"); return; }
    if (!form.monto_usd) { toast.error("Ingrese monto USD"); return; }
    setSaving(true);
    const row = {
      ...form,
      fecha_desembolso: form.fecha_desembolso || null,
      monto_pen: form.monto_pen || null,
      tipo_cambio: form.tipo_cambio || null,
    };
    const { error } = await (supabase as any).from("desembolsos").insert(row);
    setSaving(false);
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Desembolso registrado");
    setOpen(false);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Desembolsos</h1><p className="text-muted-foreground">Control de remesas por entidad Mec B</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registrar desembolso</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo Desembolso</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Entidad (Mec B)</Label>
                <Select value={form.entidad_id} onValueChange={v => setForm(p => ({ ...p, entidad_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{mecBEntidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Nº Remesa</Label><Input type="number" min={1} value={form.numero_remesa} onChange={e => setForm(p => ({ ...p, numero_remesa: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Monto USD</Label><Input type="number" min={0} step="any" value={form.monto_usd || ""} onChange={e => setForm(p => ({ ...p, monto_usd: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Tipo cambio</Label><Input type="number" min={0} step="any" value={form.tipo_cambio || ""} onChange={e => setForm(p => ({ ...p, tipo_cambio: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Monto PEN (calc.)</Label><Input disabled value={fmt(form.monto_pen)} /></div>
              <div className="space-y-1"><Label className="text-xs">Fecha desembolso</Label><Input type="date" value={form.fecha_desembolso} onChange={e => setForm(p => ({ ...p, fecha_desembolso: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Trimestre vinculado</Label><Input value={form.trimestre_vinculado} onChange={e => setForm(p => ({ ...p, trimestre_vinculado: e.target.value }))} placeholder="T1-2025" /></div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Observaciones</Label><Textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} rows={2} /></div>
            </div>
            {form.trimestre_vinculado && (
              <Alert className="mt-2 border-yellow-500 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-xs">⚠ Verifique que el informe trimestral {form.trimestre_vinculado} esté aprobado antes de desembolsar.</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterEntidad} onChange={e => setFilterEntidad(e.target.value)}>
          <option value="">Todas las entidades</option>
          {mecBEntidades.map(e => <option key={e.id} value={e.id}>{e.nombre_corto}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="text-center py-8 text-muted-foreground">Cargando…</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Entidad</TableHead><TableHead className="text-right">Remesa Nº</TableHead>
                  <TableHead className="text-right">Monto USD</TableHead><TableHead className="text-right">T.C.</TableHead>
                  <TableHead className="text-right">Monto PEN</TableHead><TableHead>Fecha</TableHead>
                  <TableHead>Trimestre</TableHead><TableHead>Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin desembolsos</TableCell></TableRow>}
                  {filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{entName(d.entidad_id)}</TableCell>
                      <TableCell className="text-right">{d.numero_remesa}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(d.monto_usd)}</TableCell>
                      <TableCell className="text-right text-xs">{d.tipo_cambio ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(d.monto_pen)}</TableCell>
                      <TableCell className="text-xs">{d.fecha_desembolso ?? "—"}</TableCell>
                      <TableCell className="text-xs">{d.trimestre_vinculado ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{ESTADO_LABELS[d.estado] ?? d.estado}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
