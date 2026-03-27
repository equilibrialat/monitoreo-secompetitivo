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
import { Plus, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

const ESTADO_LABELS: Record<string, string> = { solicitado: "Solicitado", aprobado: "Aprobado", liquidado: "Liquidado" };
function fmt(n: number | null) { return n == null ? "—" : n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ViaticosPage() {
  const { role, entidadId, entidades } = useRole();
  const isAdmin = role === "administracion";
  const [viaticos, setViaticos] = useState<any[]>([]);
  const [ciudades, setCiudades] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterEntidad, setFilterEntidad] = useState("");
  const [liquidarId, setLiquidarId] = useState<string | null>(null);
  const [montoLiquidado, setMontoLiquidado] = useState(0);

  const [form, setForm] = useState({
    nombre_viajero: "", destino_ciudad: "", motivo: "", fecha_salida: "", fecha_retorno: "",
    actividad_id: "", tarifa_alojamiento: 0, tarifa_alimentacion: 0, tarifa_transporte: 0,
  });

  async function loadData() {
    setLoading(true);
    const query = (supabase as any).from("viaticos").select("*").order("created_at", { ascending: false });
    if (!isAdmin && entidadId) query.eq("entidad_id", entidadId);
    const [v, c, a] = await Promise.all([
      query,
      (supabase as any).from("escala_viaticos").select("*").eq("vigente", true).order("ciudad"),
      (supabase as any).from("actividades").select("id, codigo, nombre, entidad_id").eq("entidad_id", entidadId ?? ""),
    ]);
    setViaticos(v.data ?? []);
    setCiudades(c.data ?? []);
    setActividades(a.data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [entidadId, role]);

  const filtered = useMemo(() => {
    let f = viaticos;
    if (filterEntidad) f = f.filter(v => v.entidad_id === filterEntidad);
    return f;
  }, [viaticos, filterEntidad]);

  const entName = (id: string) => entidades.find(e => e.id === id)?.nombre_corto ?? id.slice(0, 8);

  function onCiudadChange(ciudad: string) {
    const tarifa = ciudades.find(c => c.ciudad === ciudad);
    setForm(p => ({
      ...p, destino_ciudad: ciudad,
      tarifa_alojamiento: tarifa?.alojamiento ?? 0,
      tarifa_alimentacion: tarifa?.alimentacion ?? 0,
      tarifa_transporte: tarifa?.transporte_local ?? 0,
    }));
  }

  const numDias = useMemo(() => {
    if (!form.fecha_salida || !form.fecha_retorno) return 1;
    return Math.max(1, Math.ceil((new Date(form.fecha_retorno).getTime() - new Date(form.fecha_salida).getTime()) / 86400000));
  }, [form.fecha_salida, form.fecha_retorno]);

  const montoEstimado = (form.tarifa_alojamiento + form.tarifa_alimentacion + form.tarifa_transporte) * numDias;

  async function handleSave() {
    if (!form.nombre_viajero.trim() || !form.destino_ciudad) { toast.error("Complete los campos requeridos"); return; }
    setSaving(true);
    const row = {
      entidad_id: entidadId,
      nombre_viajero: form.nombre_viajero,
      destino: form.destino_ciudad,
      motivo: form.motivo,
      fecha_salida: form.fecha_salida || null,
      fecha_retorno: form.fecha_retorno || null,
      actividad_id: form.actividad_id || null,
      alojamiento_diario: form.tarifa_alojamiento,
      alimentacion_diaria: form.tarifa_alimentacion,
      transporte_local: form.tarifa_transporte,
      monto_solicitado: montoEstimado,
      estado: "solicitado",
    };
    const { error } = await (supabase as any).from("viaticos").insert(row);
    setSaving(false);
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Viático solicitado");
    setOpen(false);
    setForm({ nombre_viajero: "", destino_ciudad: "", motivo: "", fecha_salida: "", fecha_retorno: "", actividad_id: "", tarifa_alojamiento: 0, tarifa_alimentacion: 0, tarifa_transporte: 0 });
    loadData();
  }

  async function handleLiquidar() {
    if (!liquidarId) return;
    const { error } = await (supabase as any).from("viaticos").update({ monto_liquidado: montoLiquidado, estado: "liquidado" }).eq("id", liquidarId);
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Viático liquidado");
    setLiquidarId(null);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Viáticos</h1><p className="text-muted-foreground">Solicitudes y liquidación de viáticos</p></div>
        {!isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Solicitar viáticos</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nueva Solicitud de Viáticos</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2"><Label className="text-xs">Nombre viajero</Label><Input value={form.nombre_viajero} onChange={e => setForm(p => ({ ...p, nombre_viajero: e.target.value }))} /></div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Destino (ciudad)</Label>
                  <Select value={form.destino_ciudad} onValueChange={onCiudadChange}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar ciudad" /></SelectTrigger>
                    <SelectContent>{ciudades.map(c => <SelectItem key={c.id} value={c.ciudad}>{c.ciudad} — {c.departamento}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.destino_ciudad && (
                  <div className="col-span-2 bg-muted/50 p-3 rounded-md text-xs space-y-1">
                    <p className="font-semibold">Tarifas vigentes:</p>
                    <p>Alojamiento: S/ {form.tarifa_alojamiento} | Alimentación: S/ {form.tarifa_alimentacion} | Transporte: S/ {form.tarifa_transporte}</p>
                    <p className="font-bold">Estimado total ({numDias} días): S/ {fmt(montoEstimado)}</p>
                  </div>
                )}
                <div className="space-y-1"><Label className="text-xs">Fecha salida</Label><Input type="date" value={form.fecha_salida} onChange={e => setForm(p => ({ ...p, fecha_salida: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Fecha retorno</Label><Input type="date" value={form.fecha_retorno} onChange={e => setForm(p => ({ ...p, fecha_retorno: e.target.value }))} /></div>
                <div className="space-y-1 col-span-2"><Label className="text-xs">Motivo</Label><Textarea value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} rows={2} /></div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Actividad vinculada</Label>
                  <Select value={form.actividad_id} onValueChange={v => setForm(p => ({ ...p, actividad_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>{actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Solicitar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1 text-sm bg-background text-foreground" value={filterEntidad} onChange={e => setFilterEntidad(e.target.value)}>
            <option value="">Todas las entidades</option>
            {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre_corto}</option>)}
          </select>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="text-center py-8 text-muted-foreground">Cargando…</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  {isAdmin && <TableHead>Entidad</TableHead>}
                  <TableHead>Viajero</TableHead><TableHead>Destino</TableHead><TableHead>Motivo</TableHead>
                  <TableHead>Salida</TableHead><TableHead>Retorno</TableHead>
                  <TableHead className="text-right">Estimado</TableHead><TableHead className="text-right">Liquidado</TableHead>
                  <TableHead>Estado</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">Sin viáticos</TableCell></TableRow>}
                  {filtered.map(v => (
                    <TableRow key={v.id}>
                      {isAdmin && <TableCell className="text-xs">{entName(v.entidad_id)}</TableCell>}
                      <TableCell className="text-xs font-medium">{v.nombre_viajero}</TableCell>
                      <TableCell className="text-xs">{v.destino_ciudad}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{v.motivo}</TableCell>
                      <TableCell className="text-xs">{v.fecha_salida ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.fecha_retorno ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(v.monto_estimado)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(v.monto_liquidado)}</TableCell>
                      <TableCell><Badge variant="outline">{ESTADO_LABELS[v.estado] ?? v.estado}</Badge></TableCell>
                      <TableCell>
                        {v.estado === "aprobado" && !isAdmin && (
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => { setLiquidarId(v.id); setMontoLiquidado(v.monto_estimado ?? 0); }}>
                            <Receipt className="h-3 w-3 mr-1" /> Liquidar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liquidar dialog */}
      <Dialog open={!!liquidarId} onOpenChange={() => setLiquidarId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Liquidar Viático</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Monto liquidado (PEN)</Label><Input type="number" min={0} step="any" value={montoLiquidado || ""} onChange={e => setMontoLiquidado(Number(e.target.value))} /></div>
            <Button onClick={handleLiquidar} className="w-full">Confirmar liquidación</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
