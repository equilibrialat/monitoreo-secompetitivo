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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ESTADO_LABELS: Record<string, string> = { solicitado: "Solicitado", aprobado: "Aprobado", rechazado: "Rechazado" };
function fmt(n: number | null) { return n == null ? "—" : n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ReasignacionesPage() {
  const { role, entidadId, entidades } = useRole();
  const isEntidad = role === "entidad";
  const canApprove = ["administracion", "coordinador_regional", "direccion"].includes(role);
  const [data, setData] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    actividad_origen_id: "", actividad_destino_id: "", fuente: "cofinanciamiento_seco",
    monto: 0, motivo: "",
  });

  async function loadData() {
    setLoading(true);
    const query = (supabase as any).from("reasignaciones").select("*").order("created_at", { ascending: false });
    if (isEntidad && entidadId) query.eq("entidad_id", entidadId);
    const [r, a] = await Promise.all([
      query,
      (supabase as any).from("actividades").select("id, codigo, nombre, entidad_id, presupuesto_seco, presupuesto_contrapartida_monetaria, presupuesto_contrapartida_no_monetaria, ejecutado_seco_acum, ejecutado_cm_acum, ejecutado_cnm_acum"),
    ]);
    setData(r.data ?? []);
    setActividades(a.data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [entidadId, role]);

  const actsFiltradas = actividades.filter(a => a.entidad_id === entidadId);
  const entName = (id: string) => entidades.find(e => e.id === id)?.nombre_corto ?? id.slice(0, 8);
  const actName = (id: string) => { const a = actividades.find(x => x.id === id); return a ? `${a.codigo} — ${a.nombre}` : id.slice(0, 8); };

  const disponibleOrigen = useMemo(() => {
    const act = actividades.find(a => a.id === form.actividad_origen_id);
    if (!act) return 0;
    if (form.fuente === "cofinanciamiento_seco") return Math.max(0, (act.presupuesto_seco ?? 0) - (act.ejecutado_seco_acum ?? 0));
    if (form.fuente === "contrapartida_monetaria") return Math.max(0, (act.presupuesto_contrapartida_monetaria ?? 0) - (act.ejecutado_cm_acum ?? 0));
    return Math.max(0, (act.presupuesto_contrapartida_no_monetaria ?? 0) - (act.ejecutado_cnm_acum ?? 0));
  }, [form.actividad_origen_id, form.fuente, actividades]);

  const excedeMonto = form.monto > disponibleOrigen && disponibleOrigen > 0;

  async function handleSave() {
    if (!form.actividad_origen_id || !form.actividad_destino_id) { toast.error("Seleccione actividades"); return; }
    if (form.actividad_origen_id === form.actividad_destino_id) { toast.error("Origen y destino deben ser diferentes"); return; }
    if (!form.monto || form.monto <= 0) { toast.error("Ingrese monto válido"); return; }
    if (excedeMonto) { toast.error("El monto excede el disponible en la actividad origen"); return; }
    if (!form.motivo.trim()) { toast.error("Ingrese justificación"); return; }

    setSaving(true);
    const row = {
      entidad_id: entidadId,
      motivo: form.motivo,
      estado: "solicitado",
      movimientos: JSON.stringify([{
        actividad_origen_id: form.actividad_origen_id,
        actividad_destino_id: form.actividad_destino_id,
        fuente: form.fuente,
        monto: form.monto,
      }]),
    };
    const { error } = await (supabase as any).from("reasignaciones").insert(row);
    setSaving(false);
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Reasignación solicitada");
    setOpen(false);
    setForm({ actividad_origen_id: "", actividad_destino_id: "", fuente: "cofinanciamiento_seco", monto: 0, motivo: "" });
    loadData();
  }

  async function handleApprove(id: string) {
    const reas = data.find(r => r.id === id);
    if (!reas) return;
    let movs: any[];
    try { movs = typeof reas.movimientos === "string" ? JSON.parse(reas.movimientos) : reas.movimientos; } catch { toast.error("Error parsing movimientos"); return; }

    // Update reasignacion status
    const { error } = await (supabase as any).from("reasignaciones").update({ estado: "aprobado" }).eq("id", id);
    if (error) { toast.error("Error", { description: error.message }); return; }

    // Update budgets for each movement
    for (const mov of movs) {
      const fuenteField = mov.fuente === "cofinanciamiento_seco" ? "presupuesto_seco"
        : mov.fuente === "contrapartida_monetaria" ? "presupuesto_contrapartida_monetaria"
        : "presupuesto_contrapartida_no_monetaria";

      const actOrigen = actividades.find(a => a.id === mov.actividad_origen_id);
      const actDestino = actividades.find(a => a.id === mov.actividad_destino_id);
      if (actOrigen) {
        await (supabase as any).from("actividades").update({ [fuenteField]: Math.max(0, (actOrigen[fuenteField] ?? 0) - mov.monto) }).eq("id", mov.actividad_origen_id);
      }
      if (actDestino) {
        await (supabase as any).from("actividades").update({ [fuenteField]: (actDestino[fuenteField] ?? 0) + mov.monto }).eq("id", mov.actividad_destino_id);
      }
    }
    toast.success("Reasignación aprobada y presupuestos actualizados");
    loadData();
  }

  async function handleReject(id: string) {
    const { error } = await (supabase as any).from("reasignaciones").update({ estado: "rechazado", observaciones: "Rechazado" }).eq("id", id);
    if (error) { toast.error("Error", { description: error.message }); return; }
    toast.success("Reasignación rechazada");
    loadData();
  }

  function parseMovimientos(m: any): any[] {
    try { return typeof m === "string" ? JSON.parse(m) : Array.isArray(m) ? m : [m]; } catch { return []; }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Reasignaciones</h1><p className="text-muted-foreground">Solicitudes de reasignación presupuestaria</p></div>
        {isEntidad && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Solicitar reasignación</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nueva Reasignación</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Actividad origen</Label>
                  <Select value={form.actividad_origen_id} onValueChange={v => setForm(p => ({ ...p, actividad_origen_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{actsFiltradas.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Actividad destino</Label>
                  <Select value={form.actividad_destino_id} onValueChange={v => setForm(p => ({ ...p, actividad_destino_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{actsFiltradas.filter(a => a.id !== form.actividad_origen_id).map(a => <SelectItem key={a.id} value={a.id}>{a.codigo} — {a.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fuente de financiamiento</Label>
                  <Select value={form.fuente} onValueChange={v => setForm(p => ({ ...p, fuente: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cofinanciamiento_seco">Cof. SECO</SelectItem>
                      <SelectItem value="contrapartida_monetaria">Contrapartida Mon.</SelectItem>
                      <SelectItem value="contrapartida_no_monetaria">Contrapartida No Mon.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.actividad_origen_id && (
                  <p className="text-xs text-muted-foreground">Disponible en origen: {fmt(disponibleOrigen)}</p>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Monto a reasignar</Label>
                  <Input type="number" min={0} step="any" value={form.monto || ""} onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))} />
                </div>
                {excedeMonto && (
                  <Alert className="border-destructive bg-destructive/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">El monto excede el disponible en la actividad origen.</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1"><Label className="text-xs">Justificación</Label><Textarea value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} rows={3} /></div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving || excedeMonto}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Solicitar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="text-center py-8 text-muted-foreground">Cargando…</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Entidad</TableHead><TableHead>Origen → Destino</TableHead><TableHead>Fuente</TableHead>
                  <TableHead className="text-right">Monto</TableHead><TableHead>Justificación</TableHead>
                  <TableHead>Estado</TableHead>{canApprove && <TableHead>Acciones</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {data.length === 0 && <TableRow><TableCell colSpan={canApprove ? 7 : 6} className="text-center py-8 text-muted-foreground">Sin reasignaciones</TableCell></TableRow>}
                  {data.map(r => {
                    const movs = parseMovimientos(r.movimientos);
                    const mov = movs[0] ?? {};
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{entName(r.entidad_id)}</TableCell>
                        <TableCell className="text-xs">{actName(mov.actividad_origen_id ?? "")} → {actName(mov.actividad_destino_id ?? "")}</TableCell>
                        <TableCell className="text-xs">{mov.fuente ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(mov.monto)}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{r.motivo}</TableCell>
                        <TableCell>
                          <Badge variant={r.estado === "aprobado" ? "default" : r.estado === "rechazado" ? "destructive" : "outline"}>
                            {ESTADO_LABELS[r.estado] ?? r.estado}
                          </Badge>
                        </TableCell>
                        {canApprove && (
                          <TableCell>
                            {r.estado === "solicitado" && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="text-xs h-7 text-green-600 border-green-600" onClick={() => handleApprove(r.id)}>
                                  <Check className="h-3 w-3 mr-1" /> Aprobar
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 text-destructive border-destructive" onClick={() => handleReject(r.id)}>
                                  <X className="h-3 w-3 mr-1" /> Rechazar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
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
