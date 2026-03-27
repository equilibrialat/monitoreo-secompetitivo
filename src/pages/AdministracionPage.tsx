import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Power, Upload, Trash2 } from "lucide-react";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { useRole } from "@/contexts/RoleContext";

// --- Tab 1: Gestión de Entidades ---
function TabEntidades() {
  const [entidades, setEntidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    codigo: "", nombre_completo: "", nombre_corto: "", mecanismo: "B" as "A" | "B",
    tipo_entidad: "mec_b_agro", region: "", cadena_valor: "", titulo_proyecto: "",
    fecha_inicio: "", fecha_fin: "",
  });

  const fetchEntidades = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("entidades").select("*").order("codigo");
    setEntidades(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntidades(); }, [fetchEntidades]);

  function openNew() {
    setEditing(null);
    setForm({ codigo: "", nombre_completo: "", nombre_corto: "", mecanismo: "B", tipo_entidad: "mec_b_agro", region: "", cadena_valor: "", titulo_proyecto: "", fecha_inicio: "", fecha_fin: "" });
    setDialogOpen(true);
  }

  function openEdit(e: any) {
    setEditing(e);
    setForm({
      codigo: e.codigo, nombre_completo: e.nombre_completo, nombre_corto: e.nombre_corto,
      mecanismo: e.mecanismo, tipo_entidad: e.tipo_entidad, region: e.region || "",
      cadena_valor: e.cadena_valor || "", titulo_proyecto: e.titulo_proyecto || "",
      fecha_inicio: e.fecha_inicio || "", fecha_fin: e.fecha_fin || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.codigo || !form.nombre_completo || !form.nombre_corto) {
      toast.error("Código, nombre completo y nombre corto son obligatorios");
      return;
    }
    const payload = { ...form, activo: true };
    if (editing) {
      const { error } = await (supabase as any).from("entidades").update(payload).eq("id", editing.id);
      if (error) { toast.error("Error al actualizar"); return; }
      toast.success("Entidad actualizada");
    } else {
      const { error } = await (supabase as any).from("entidades").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Entidad creada");
    }
    setDialogOpen(false);
    fetchEntidades();
  }

  async function toggleActive(id: string, current: boolean) {
    await (supabase as any).from("entidades").update({ activo: !current }).eq("id", id);
    fetchEntidades();
    toast.success(current ? "Entidad desactivada" : "Entidad activada");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-muted-foreground">Entidades registradas</h3>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva Entidad</Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Mec.</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>CdV</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entidades.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                <TableCell className="text-sm">{e.nombre_corto}</TableCell>
                <TableCell><Badge variant={e.mecanismo === "A" ? "default" : "secondary"} className="text-[10px]">MEC-{e.mecanismo}</Badge></TableCell>
                <TableCell className="text-xs">{e.tipo_entidad}</TableCell>
                <TableCell className="text-xs">{e.region || "—"}</TableCell>
                <TableCell className="text-xs">{e.cadena_valor || "—"}</TableCell>
                <TableCell><Badge variant={e.activo ? "default" : "outline"} className="text-[10px]">{e.activo ? "Sí" : "No"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(e.id, e.activo)}><Power className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Entidad" : "Nueva Entidad"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
              <div><Label>Mecanismo *</Label>
                <Select value={form.mecanismo} onValueChange={(v) => setForm({ ...form, mecanismo: v as "A" | "B" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nombre completo *</Label><Input value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} /></div>
            <div><Label>Nombre corto *</Label><Input value={form.nombre_corto} onChange={(e) => setForm({ ...form, nombre_corto: e.target.value })} /></div>
            <div><Label>Tipo de entidad</Label>
              <Select value={form.tipo_entidad} onValueChange={(v) => setForm({ ...form, tipo_entidad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mec_b_agro">Mec B Agro</SelectItem>
                  <SelectItem value="mec_b_turismo">Mec B Turismo</SelectItem>
                  <SelectItem value="mec_b_mixto">Mec B Mixto</SelectItem>
                  <SelectItem value="mec_a">Mec A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Región</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="San Martín, Piura..." /></div>
              <div><Label>Cadena de valor</Label><Input value={form.cadena_valor} onChange={(e) => setForm({ ...form, cadena_valor: e.target.value })} /></div>
            </div>
            <div><Label>Título del proyecto</Label><Input value={form.titulo_proyecto} onChange={(e) => setForm({ ...form, titulo_proyecto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
              <div><Label>Fecha fin</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar cambios" : "Crear entidad"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Tab 2: Carga de Marco Lógico ---
function TabMarcoLogico() {
  const { entidades } = useRole();
  const [selectedEntidad, setSelectedEntidad] = useState<string>("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [dialogType, setDialogType] = useState<"resultado" | "producto" | "actividad" | null>(null);
  const [parentId, setParentId] = useState<string>("");
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!selectedEntidad) return;
    fetchAll();
  }, [selectedEntidad]);

  async function fetchAll() {
    const [r, p, a] = await Promise.all([
      (supabase as any).from("resultados").select("*").eq("entidad_id", selectedEntidad).order("codigo"),
      (supabase as any).from("productos").select("*").eq("entidad_id", selectedEntidad).order("codigo"),
      (supabase as any).from("actividades").select("*").eq("entidad_id", selectedEntidad).order("codigo"),
    ]);
    setResultados(r.data || []);
    setProductos(p.data || []);
    setActividades(a.data || []);
  }

  async function handleSave() {
    if (dialogType === "resultado") {
      const { error } = await (supabase as any).from("resultados").insert({
        entidad_id: selectedEntidad, codigo: form.codigo, nombre: form.nombre, nivel: form.nivel || "RESULTADO",
      });
      if (error) { toast.error(error.message); return; }
    } else if (dialogType === "producto") {
      const { error } = await (supabase as any).from("productos").insert({
        entidad_id: selectedEntidad, resultado_id: parentId, codigo: form.codigo, nombre: form.nombre,
      });
      if (error) { toast.error(error.message); return; }
    } else if (dialogType === "actividad") {
      const { error } = await (supabase as any).from("actividades").insert({
        entidad_id: selectedEntidad, producto_id: parentId, codigo: form.codigo, nombre: form.nombre,
        meta_valor: form.meta_valor ? Number(form.meta_valor) : null,
        meta_unidad_medida: form.meta_unidad_medida || null,
        presupuesto_seco: form.presupuesto_seco ? Number(form.presupuesto_seco) : 0,
        presupuesto_contrapartida_monetaria: form.presupuesto_cm ? Number(form.presupuesto_cm) : 0,
        presupuesto_contrapartida_no_monetaria: form.presupuesto_cnm ? Number(form.presupuesto_cnm) : 0,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()) : [],
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Registro creado");
    setDialogType(null);
    fetchAll();
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedEntidad) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1).filter(l => l.trim());
    let created = 0;
    const resMap = new Map<string, string>();
    const prodMap = new Map<string, string>();

    for (const line of lines) {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const [codRes, nomRes, nivel, codProd, nomProd, codAct, nomAct, meta, unidad, pSeco, pCm, pCnm, tags] = cols;

      if (codRes && nomRes && !resMap.has(codRes)) {
        const { data } = await (supabase as any).from("resultados").insert({
          entidad_id: selectedEntidad, codigo: codRes, nombre: nomRes, nivel: nivel || "RESULTADO",
        }).select("id").single();
        if (data) resMap.set(codRes, data.id);
      }
      if (codProd && nomProd && !prodMap.has(codProd)) {
        const resId = resMap.get(codRes);
        if (resId) {
          const { data } = await (supabase as any).from("productos").insert({
            entidad_id: selectedEntidad, resultado_id: resId, codigo: codProd, nombre: nomProd,
          }).select("id").single();
          if (data) prodMap.set(codProd, data.id);
        }
      }
      if (codAct && nomAct) {
        const prodId = prodMap.get(codProd);
        if (prodId) {
          await (supabase as any).from("actividades").insert({
            entidad_id: selectedEntidad, producto_id: prodId, codigo: codAct, nombre: nomAct,
            meta_valor: meta ? Number(meta) : null, meta_unidad_medida: unidad || null,
            presupuesto_seco: pSeco ? Number(pSeco) : 0,
            presupuesto_contrapartida_monetaria: pCm ? Number(pCm) : 0,
            presupuesto_contrapartida_no_monetaria: pCnm ? Number(pCnm) : 0,
            tags: tags ? tags.split(";").map((t: string) => t.trim()) : [],
          });
          created++;
        }
      }
    }
    toast.success(`Importación completada: ${created} actividades creadas`);
    fetchAll();
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedEntidad} onValueChange={setSelectedEntidad}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
          <SelectContent>
            {entidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedEntidad && (
          <>
            <Button size="sm" variant="outline" onClick={() => { setDialogType("resultado"); setForm({}); }}>
              <Plus className="h-3 w-3 mr-1" /> Resultado
            </Button>
            <label>
              <Button size="sm" variant="outline" asChild><span><Upload className="h-3 w-3 mr-1" /> Importar CSV</span></Button>
              <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            </label>
          </>
        )}
      </div>

      {selectedEntidad && (
        <div className="space-y-3">
          {resultados.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-2">{r.codigo}</span>{r.nombre}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => { setDialogType("producto"); setParentId(r.id); setForm({}); }}>
                    <Plus className="h-3 w-3 mr-1" /> Producto
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {productos.filter(p => p.resultado_id === r.id).map((p) => (
                  <div key={p.id} className="ml-4 border-l-2 pl-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs"><span className="font-mono text-muted-foreground mr-1">{p.codigo}</span>{p.nombre}</p>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setDialogType("actividad"); setParentId(p.id); setForm({}); }}>
                        <Plus className="h-3 w-3 mr-0.5" /> Actividad
                      </Button>
                    </div>
                    {actividades.filter(a => a.producto_id === p.id).map((a) => (
                      <div key={a.id} className="ml-4 text-[11px] text-muted-foreground py-0.5 flex gap-2">
                        <span className="font-mono">{a.codigo}</span>
                        <span className="truncate">{a.nombre}</span>
                        {a.presupuesto_seco > 0 && <Badge variant="outline" className="text-[9px]">SECO: {a.presupuesto_seco}</Badge>}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "resultado" ? "Agregar Resultado" : dialogType === "producto" ? "Agregar Producto" : "Agregar Actividad"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Código *</Label><Input value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
            <div><Label>Nombre *</Label><Input value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            {dialogType === "resultado" && (
              <div><Label>Nivel</Label><Input value={form.nivel || ""} onChange={(e) => setForm({ ...form, nivel: e.target.value })} placeholder="RESULTADO FINAL, INTERMEDIO..." /></div>
            )}
            {dialogType === "actividad" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Meta</Label><Input type="number" value={form.meta_valor || ""} onChange={(e) => setForm({ ...form, meta_valor: e.target.value })} /></div>
                  <div><Label>Unidad</Label><Input value={form.meta_unidad_medida || ""} onChange={(e) => setForm({ ...form, meta_unidad_medida: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Presup. SECO</Label><Input type="number" value={form.presupuesto_seco || ""} onChange={(e) => setForm({ ...form, presupuesto_seco: e.target.value })} /></div>
                  <div><Label>Presup. CM</Label><Input type="number" value={form.presupuesto_cm || ""} onChange={(e) => setForm({ ...form, presupuesto_cm: e.target.value })} /></div>
                  <div><Label>Presup. CNM</Label><Input type="number" value={form.presupuesto_cnm || ""} onChange={(e) => setForm({ ...form, presupuesto_cnm: e.target.value })} /></div>
                </div>
                <div><Label>Tags (separados por coma)</Label><Input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button onClick={handleSave}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Tab 3: Indicadores ---
function TabIndicadores() {
  const { entidades } = useRole();
  const [selectedEntidad, setSelectedEntidad] = useState<string>("");
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!selectedEntidad) return;
    (supabase as any).from("indicadores_proyecto").select("*").eq("entidad_id", selectedEntidad).order("codigo")
      .then(({ data }: any) => setIndicadores(data || []));
  }, [selectedEntidad]);

  async function handleSave() {
    const { error } = await (supabase as any).from("indicadores_proyecto").insert({
      entidad_id: selectedEntidad, codigo: form.codigo, nombre: form.nombre,
      nivel: form.nivel, unidad_medida: form.unidad_medida || null,
      linea_base: form.linea_base ? Number(form.linea_base) : null,
      meta: form.meta ? Number(form.meta) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Indicador creado");
    setDialogOpen(false);
    (supabase as any).from("indicadores_proyecto").select("*").eq("entidad_id", selectedEntidad).order("codigo")
      .then(({ data }: any) => setIndicadores(data || []));
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedEntidad) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1).filter(l => l.trim());
    let count = 0;
    for (const line of lines) {
      const [codigo, nombre, nivel, unidad, lb, meta] = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      if (codigo && nombre) {
        await (supabase as any).from("indicadores_proyecto").insert({
          entidad_id: selectedEntidad, codigo, nombre, nivel: nivel || "RESULTADO INTERMEDIO",
          unidad_medida: unidad || null, linea_base: lb ? Number(lb) : null, meta: meta ? Number(meta) : null,
        });
        count++;
      }
    }
    toast.success(`${count} indicadores importados`);
    (supabase as any).from("indicadores_proyecto").select("*").eq("entidad_id", selectedEntidad).order("codigo")
      .then(({ data }: any) => setIndicadores(data || []));
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedEntidad} onValueChange={setSelectedEntidad}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
          <SelectContent>
            {entidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedEntidad && (
          <>
            <Button size="sm" onClick={() => { setForm({}); setDialogOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Agregar indicador</Button>
            <label>
              <Button size="sm" variant="outline" asChild><span><Upload className="h-3 w-3 mr-1" /> Importar CSV</span></Button>
              <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            </label>
          </>
        )}
      </div>

      {selectedEntidad && indicadores.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Línea base</TableHead>
                <TableHead className="text-right">Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicadores.map((ind) => (
                <TableRow key={ind.id}>
                  <TableCell className="font-mono text-xs">{ind.codigo}</TableCell>
                  <TableCell className="text-sm">{ind.nombre}</TableCell>
                  <TableCell className="text-xs">{ind.nivel}</TableCell>
                  <TableCell className="text-xs">{ind.unidad_medida || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{ind.linea_base ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{ind.meta ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Indicador</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código *</Label><Input value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
              <div><Label>Nivel *</Label><Input value={form.nivel || ""} onChange={(e) => setForm({ ...form, nivel: e.target.value })} placeholder="RESULTADO DE IMPACTO..." /></div>
            </div>
            <div><Label>Nombre *</Label><Input value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidad</Label><Input value={form.unidad_medida || ""} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} /></div>
              <div><Label>Línea base</Label><Input type="number" value={form.linea_base || ""} onChange={(e) => setForm({ ...form, linea_base: e.target.value })} /></div>
              <div><Label>Meta</Label><Input type="number" value={form.meta || ""} onChange={(e) => setForm({ ...form, meta: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Tab 4: Configuración Indicadores ---
function TabConfigIndicadores() {
  const { entidades } = useRole();
  const [selectedEntidad, setSelectedEntidad] = useState<string>("");
  const [configs, setConfigs] = useState<any[]>([]);

  const TRAMAS = [
    { codigo: "empleo", nombre: "Empleo", frecuencia: "semestral" },
    { codigo: "productividad", nombre: "Productividad", frecuencia: "anual" },
    { codigo: "comercializacion", nombre: "Comercialización", frecuencia: "anual" },
    { codigo: "gobernanza", nombre: "Gobernanza", frecuencia: "semestral" },
    { codigo: "turismo_atractivos", nombre: "Turismo - Atractivos", frecuencia: "semestral" },
    { codigo: "diversificacion", nombre: "Diversificación", frecuencia: "anual" },
    { codigo: "nuevos_mercados", nombre: "Nuevos Mercados", frecuencia: "semestral" },
  ];

  useEffect(() => {
    if (!selectedEntidad) return;
    (supabase as any).from("config_indicadores_entidad").select("*").eq("entidad_id", selectedEntidad)
      .then(({ data }: any) => setConfigs(data || []));
  }, [selectedEntidad]);

  async function toggleTrama(trama: typeof TRAMAS[number]) {
    const existing = configs.find(c => c.trama_codigo === trama.codigo);
    if (existing) {
      await (supabase as any).from("config_indicadores_entidad").update({ activo: !existing.activo }).eq("id", existing.id);
    } else {
      await (supabase as any).from("config_indicadores_entidad").insert({
        entidad_id: selectedEntidad, trama_codigo: trama.codigo, trama_nombre: trama.nombre, frecuencia: trama.frecuencia, activo: true,
      });
    }
    const { data } = await (supabase as any).from("config_indicadores_entidad").select("*").eq("entidad_id", selectedEntidad);
    setConfigs(data || []);
    toast.success("Configuración actualizada");
  }

  return (
    <div className="space-y-4">
      <Select value={selectedEntidad} onValueChange={setSelectedEntidad}>
        <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
        <SelectContent>
          {entidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
        </SelectContent>
      </Select>

      {selectedEntidad && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {TRAMAS.map((t) => {
              const cfg = configs.find(c => c.trama_codigo === t.codigo);
              return (
                <div key={t.codigo} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">Frecuencia: {t.frecuencia}</p>
                  </div>
                  <Switch checked={cfg?.activo ?? false} onCheckedChange={() => toggleTrama(t)} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Tab 5: Usuarios ---
function TabUsuarios() {
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const { entidades } = useRole();

  useEffect(() => {
    (supabase as any).from("perfiles").select("*").order("nombre_completo")
      .then(({ data }: any) => setPerfiles(data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Usuarios registrados</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perfiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{p.nombre_completo}</TableCell>
                <TableCell className="text-xs">{p.email}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{p.rol}</Badge></TableCell>
                <TableCell className="text-xs">{entidades.find(e => e.id === p.entidad_id)?.nombre_corto || "—"}</TableCell>
                <TableCell><Badge variant={p.activo ? "default" : "outline"} className="text-[10px]">{p.activo ? "Sí" : "No"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Tab 6: Registro Financiero Mec A ---
function TabRegistroFinancieroMecA() {
  const { entidades } = useRole();
  const mecAEntidades = entidades.filter(e => e.mecanismo === "A" || e.tipo_entidad === "mec_a");
  const [selectedEntidad, setSelectedEntidad] = useState<string>("");
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [actividades, setActividades] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [gastos, setGastos] = useState<Record<string, { monto: number; tipo_gasto: string; detalle: string }>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {
    if (!selectedEntidad) return;
    loadData();
  }, [selectedEntidad, mes, anio]);

  async function loadData() {
    setLoading(true);
    const [actsResult, regsResult] = await Promise.all([
      (supabase as any).from("actividades").select("id, codigo, nombre, presupuesto_seco, ejecutado_seco_acum").eq("entidad_id", selectedEntidad).order("codigo"),
      (supabase as any).from("registros_mensuales").select("id, actividad_id, estado_registro").eq("entidad_id", selectedEntidad).eq("mes", Number(mes)).eq("anio", Number(anio)),
    ]);
    setActividades(actsResult.data || []);
    setRegistros(regsResult.data || []);

    // Load existing SECO gastos for this month
    const regIds = (regsResult.data || []).map((r: any) => r.id);
    if (regIds.length > 0) {
      const { data: efData } = await (supabase as any)
        .from("ejecucion_financiera")
        .select("actividad_id, monto, tipo_gasto, detalle_gasto")
        .in("registro_mensual_id", regIds)
        .eq("fuente", "cofinanciamiento_seco");

      const g: Record<string, { monto: number; tipo_gasto: string; detalle: string }> = {};
      (efData || []).forEach((ef: any) => {
        g[ef.actividad_id] = { monto: ef.monto, tipo_gasto: ef.tipo_gasto || "", detalle: ef.detalle_gasto || "" };
      });
      setGastos(g);
    } else {
      setGastos({});
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    let saved = 0;
    for (const [actId, gasto] of Object.entries(gastos)) {
      if (!gasto.monto || gasto.monto <= 0) continue;
      const reg = registros.find((r: any) => r.actividad_id === actId);
      let registroId = reg?.id;

      // Create registro_mensual if not exists
      if (!registroId) {
        const { data: newReg } = await (supabase as any).from("registros_mensuales").insert({
          actividad_id: actId, entidad_id: selectedEntidad, mes: Number(mes), anio: Number(anio),
          estado_registro: "borrador",
        }).select("id").single();
        registroId = newReg?.id;
      }

      if (registroId) {
        // Upsert: delete existing SECO for this registro, then insert
        await (supabase as any).from("ejecucion_financiera")
          .delete()
          .eq("registro_mensual_id", registroId)
          .eq("actividad_id", actId)
          .eq("fuente", "cofinanciamiento_seco");

        await (supabase as any).from("ejecucion_financiera").insert({
          registro_mensual_id: registroId, actividad_id: actId, entidad_id: selectedEntidad,
          fuente: "cofinanciamiento_seco", monto: gasto.monto,
          tipo_gasto: gasto.tipo_gasto || null, detalle_gasto: gasto.detalle || null,
        });
        saved++;
      }
    }
    setSaving(false);
    toast.success(`${saved} gastos SECO registrados`);
    loadData();
  }

  const totalGastosMes = Object.values(gastos).reduce((s, g) => s + (g.monto || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Las entidades del Mecanismo A no gestionan directamente el cofinanciamiento SECO.
          Registre aquí la ejecución financiera SECO para cada actividad.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedEntidad} onValueChange={setSelectedEntidad}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleccionar entidad Mec A" /></SelectTrigger>
          <SelectContent>
            {mecAEntidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={anio} onValueChange={setAnio}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Cargando...</div>
      ) : selectedEntidad && actividades.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead className="text-right">Presup. SECO</TableHead>
                  <TableHead className="text-right">Ejecutado acum.</TableHead>
                  <TableHead className="text-right">Gasto este mes (USD)</TableHead>
                  <TableHead>Tipo gasto</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actividades.filter((a: any) => (a.presupuesto_seco || 0) > 0).map((act: any) => {
                  const g = gastos[act.id] || { monto: 0, tipo_gasto: "", detalle: "" };
                  return (
                    <TableRow key={act.id}>
                      <TableCell className="font-mono text-xs">{act.codigo}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{act.nombre}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{(act.presupuesto_seco || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{(act.ejecutado_seco_acum || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number" min={0} className="h-7 text-xs w-[100px] ml-auto"
                          value={g.monto || ""}
                          onChange={(e) => setGastos({ ...gastos, [act.id]: { ...g, monto: Number(e.target.value) } })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-7 text-xs w-[120px]" value={g.tipo_gasto}
                          onChange={(e) => setGastos({ ...gastos, [act.id]: { ...g, tipo_gasto: e.target.value } })}
                          placeholder="Consultoría..." />
                      </TableCell>
                      <TableCell>
                        <Input className="h-7 text-xs w-[150px]" value={g.detalle}
                          onChange={(e) => setGastos({ ...gastos, [act.id]: { ...g, detalle: e.target.value } })}
                          placeholder="Descripción breve" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total gastos SECO este mes: <span className="font-bold text-foreground">US$ {totalGastosMes.toLocaleString()}</span>
            </p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar gastos SECO"}
            </Button>
          </div>
        </>
      ) : selectedEntidad ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay actividades con presupuesto SECO para esta entidad.</p>
      ) : null}
    </div>
  );
}

// --- Main Page ---
export default function AdministracionPage() {
  return (
    <div>
      <Header title="Administración del Sistema" subtitle="Gestión de entidades, marco lógico, indicadores y usuarios" />
      <Tabs defaultValue="entidades" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="entidades">Gestión de Entidades</TabsTrigger>
          <TabsTrigger value="marco">Carga de Marco Lógico</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="financiero_meca">Financiero Mec A</TabsTrigger>
        </TabsList>
        <TabsContent value="entidades"><TabEntidades /></TabsContent>
        <TabsContent value="marco"><TabMarcoLogico /></TabsContent>
        <TabsContent value="indicadores"><TabIndicadores /></TabsContent>
        <TabsContent value="config"><TabConfigIndicadores /></TabsContent>
        <TabsContent value="usuarios"><TabUsuarios /></TabsContent>
        <TabsContent value="financiero_meca"><TabRegistroFinancieroMecA /></TabsContent>
      </Tabs>
    </div>
  );
}
