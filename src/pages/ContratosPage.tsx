import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ESTADO_LABELS: Record<string, string> = {
  en_proceso: "En proceso", adjudicado: "Adjudicado", vigente: "Vigente", finalizado: "Finalizado", cancelado: "Cancelado",
};
const TIPO_LABELS: Record<string, string> = { persona_natural: "Persona Natural", persona_juridica: "Persona Jurídica" };
const FUENTE_LABELS: Record<string, string> = {
  cofinanciamiento_seco: "Cof. SECO", contrapartida_monetaria: "Contrapartida Mon.", contrapartida_no_monetaria: "Contrapartida No Mon.",
};

function diasRestantes(fechaFin: string | null) {
  if (!fechaFin) return null;
  return Math.ceil((new Date(fechaFin).getTime() - Date.now()) / 86400000);
}

function diasBadge(dias: number | null) {
  if (dias == null) return <span className="text-muted-foreground">—</span>;
  if (dias < 0) return <Badge variant="destructive">Vencido ({Math.abs(dias)}d)</Badge>;
  if (dias < 30) return <Badge className="bg-yellow-500 text-black">{dias}d</Badge>;
  return <Badge className="bg-green-600 text-white">{dias}d</Badge>;
}

function fmt(n: number | null) { return n == null ? "—" : n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ContratosPage() {
  const { role, entidadId, entidades } = useRole();
  const isAdmin = role === "administracion";
  const [contratos, setContratos] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterEntidad, setFilterEntidad] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  const [form, setForm] = useState({
    entidad_id: "", actividad_id: "", tipo: "persona_natural" as string,
    nombre_contratado: "", ruc_dni: "", objeto: "", monto: 0, moneda: "USD",
    fecha_inicio: "", fecha_fin: "", fuente: "cofinanciamiento_seco", tipo_seleccion: "", estado: "en_proceso",
  });

  async function loadData() {
    setLoading(true);
    const query = (supabase as any).from("contratos").select("*").order("created_at", { ascending: false });
    if (!isAdmin && entidadId) query.eq("entidad_id", entidadId);
    const { data } = await query;
    setContratos(data ?? []);
    const { data: acts } = await (supabase as any).from("actividades").select("id, codigo, nombre, entidad_id");
    setActividades(acts ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [entidadId, role]);

  const filtered = useMemo(() => {
    let f = contratos;
    if (filterEntidad) f = f.filter(c => c.entidad_id === filterEntidad);
    if (filterEstado) f = f.filter(c => c.estado === filterEstado);
    if (filterTipo) f = f.filter(c => c.tipo === filterTipo);
    return f;
  }, [contratos, filterEntidad, filterEstado, filterTipo]);

  const entName = (id: string) => entidades.find(e => e.id === id)?.nombre_corto ?? id.slice(0, 8);
  const actsFiltradas = actividades.filter(a => a.entidad_id === (form.entidad_id || entidadId));

  async function handleSave() {
    if (!form.nombre_contratado.trim()) { toast.error("Ingrese nombre del contratado"); return; }
    setSaving(true);
    const row = {
      ...form,
      entidad_id: isAdmin ? form.entidad_id : entidadId,
      monto: form.monto || null,
      actividad_id: form.actividad_id || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    };
    const { error } = await (supabase as any).from("contratos").insert(row);
    setSaving(false);
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Contrato registrado");
    setOpen(false);
    setForm({ entidad_id: "", actividad_id: "", tipo: "persona_natural", nombre_contratado: "", ruc_dni: "", objeto: "", monto: 0, moneda: "USD", fecha_inicio: "", fecha_fin: "", fuente: "cofinanciamiento_seco", tipo_seleccion: "", estado: "en_proceso" });
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Contratos</h1><p className="text-muted-foreground">Gestión de contratos y adquisiciones</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo contrato</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo Contrato</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {isAdmin && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Entidad</Label>
                  <Select value={form.entidad_id} onValueChange={v => setForm(p => ({ ...p, entidad_id: v, actividad_id: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
                    <SelectContent>{entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Actividad vinculada</Label>
                <Select value={form.actividad_id} onValueChange={v => setForm(p => ({ ...p, actividad_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{actsFiltradas.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="persona_natural">Persona Natural</SelectItem>
                    <SelectItem value="persona_juridica">Persona Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre contratado</Label>
                <Input value={form.nombre_contratado} onChange={e => setForm(p => ({ ...p, nombre_contratado: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RUC / DNI</Label>
                <Input value={form.ruc_dni} onChange={e => setForm(p => ({ ...p, ruc_dni: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monto</Label>
                <Input type="number" min={0} step="any" value={form.monto || ""} onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Moneda</Label>
                <Select value={form.moneda} onValueChange={v => setForm(p => ({ ...p, moneda: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="PEN">PEN</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fuente financiamiento</Label>
                <Select value={form.fuente} onValueChange={v => setForm(p => ({ ...p, fuente: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cofinanciamiento_seco">Cof. SECO</SelectItem>
                    <SelectItem value="contrapartida_monetaria">Contrapartida Mon.</SelectItem>
                    <SelectItem value="contrapartida_no_monetaria">Contrapartida No Mon.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Fecha fin</Label><Input type="date" value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Tipo selección</Label><Input value={form.tipo_seleccion} onChange={e => setForm(p => ({ ...p, tipo_seleccion: e.target.value }))} placeholder="Licitación, cotización…" /></div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Objeto del contrato</Label>
                <Textarea value={form.objeto} onChange={e => setForm(p => ({ ...p, objeto: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterEntidad} onChange={e => setFilterEntidad(e.target.value)}>
            <option value="">Todas las entidades</option>
            {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre_corto}</option>)}
          </select>
        )}
        <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="text-center py-8 text-muted-foreground">Cargando…</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  {isAdmin && <TableHead>Entidad</TableHead>}
                  <TableHead>Contratado</TableHead><TableHead>Tipo</TableHead><TableHead>Objeto</TableHead>
                  <TableHead className="text-right">Monto</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead>
                  <TableHead>Días rest.</TableHead><TableHead>Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">Sin contratos</TableCell></TableRow>}
                  {filtered.map(c => {
                    const dias = diasRestantes(c.fecha_fin);
                    return (
                      <TableRow key={c.id}>
                        {isAdmin && <TableCell className="text-xs">{entName(c.entidad_id)}</TableCell>}
                        <TableCell className="font-medium text-xs">{c.nombre_contratado}</TableCell>
                        <TableCell className="text-xs">{TIPO_LABELS[c.tipo] ?? c.tipo}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{c.objeto ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(c.monto)} {c.moneda}</TableCell>
                        <TableCell className="text-xs">{c.fecha_inicio ?? "—"}</TableCell>
                        <TableCell className="text-xs">{c.fecha_fin ?? "—"}</TableCell>
                        <TableCell>{diasBadge(dias)}</TableCell>
                        <TableCell><Badge variant="outline">{ESTADO_LABELS[c.estado] ?? c.estado}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
