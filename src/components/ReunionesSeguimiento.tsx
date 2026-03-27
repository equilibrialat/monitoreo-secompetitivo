import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface Acuerdo {
  descripcion: string;
  responsable: string;
  fecha_compromiso: string;
  estado: "pendiente" | "cumplido";
}

interface Reunion {
  id: string;
  entidad_id: string;
  fecha: string;
  participantes: string | null;
  temas_tratados: string | null;
  acuerdos: Acuerdo[];
  proxima_reunion: string | null;
  created_at: string;
}

export function ReunionesSeguimiento() {
  const { entidades } = useRole();
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formEntidad, setFormEntidad] = useState("");
  const [formFecha, setFormFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formParticipantes, setFormParticipantes] = useState("");
  const [formTemas, setFormTemas] = useState("");
  const [formProxima, setFormProxima] = useState("");
  const [formAcuerdos, setFormAcuerdos] = useState<Acuerdo[]>([
    { descripcion: "", responsable: "", fecha_compromiso: "", estado: "pendiente" },
  ]);

  useEffect(() => {
    fetchReuniones();
  }, [entidades]);

  async function fetchReuniones() {
    setLoading(true);
    const entidadIds = entidades.map((e) => e.id);
    if (entidadIds.length === 0) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("reuniones_seguimiento")
      .select("*")
      .in("entidad_id", entidadIds)
      .order("fecha", { ascending: false })
      .limit(50);
    setReuniones((data || []).map((r: any) => ({ ...r, acuerdos: r.acuerdos || [] })));
    setLoading(false);
  }

  async function handleSave() {
    if (!formEntidad || !formFecha) {
      toast.error("Selecciona entidad y fecha");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("reuniones_seguimiento").insert({
      entidad_id: formEntidad,
      fecha: formFecha,
      participantes: formParticipantes || null,
      temas_tratados: formTemas || null,
      acuerdos: formAcuerdos.filter((a) => a.descripcion.trim()),
      proxima_reunion: formProxima || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Error al guardar", { description: error.message });
    } else {
      toast.success("Reunión registrada");
      setShowForm(false);
      resetForm();
      fetchReuniones();
    }
  }

  function resetForm() {
    setFormEntidad("");
    setFormFecha(format(new Date(), "yyyy-MM-dd"));
    setFormParticipantes("");
    setFormTemas("");
    setFormProxima("");
    setFormAcuerdos([{ descripcion: "", responsable: "", fecha_compromiso: "", estado: "pendiente" }]);
  }

  async function toggleAcuerdo(reunionId: string, acuerdoIndex: number) {
    const reunion = reuniones.find((r) => r.id === reunionId);
    if (!reunion) return;
    const updated = [...reunion.acuerdos];
    updated[acuerdoIndex] = {
      ...updated[acuerdoIndex],
      estado: updated[acuerdoIndex].estado === "cumplido" ? "pendiente" : "cumplido",
    };
    await (supabase as any).from("reuniones_seguimiento").update({ acuerdos: updated }).eq("id", reunionId);
    setReuniones((prev) =>
      prev.map((r) => (r.id === reunionId ? { ...r, acuerdos: updated } : r))
    );
  }

  // Collect all pending acuerdos across reuniones
  const pendientes: { reunion: Reunion; acuerdo: Acuerdo; index: number }[] = [];
  for (const r of reuniones) {
    r.acuerdos.forEach((a, i) => {
      if (a.estado === "pendiente") pendientes.push({ reunion: r, acuerdo: a, index: i });
    });
  }

  const entidadName = (id: string) => entidades.find((e) => e.id === id)?.nombre_corto || "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            📋 Reuniones de Seguimiento
            {pendientes.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{pendientes.length} pendientes</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowForm(true)}>
            <Plus className="h-3 w-3 mr-1" /> Registrar reunión
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending agreements checklist */}
        {pendientes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Acuerdos pendientes:</p>
            {pendientes.map(({ reunion, acuerdo, index }) => (
              <div
                key={`${reunion.id}-${index}`}
                className="flex items-start gap-2 text-xs border rounded-md px-3 py-2 bg-muted/30"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleAcuerdo(reunion.id, index)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{acuerdo.descripcion}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {entidadName(reunion.entidad_id)} · {acuerdo.responsable || "Sin responsable"} · {acuerdo.fecha_compromiso || "Sin fecha"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent reuniones */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Cargando...
          </div>
        ) : reuniones.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No hay reuniones registradas aún.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Últimas reuniones:</p>
            {reuniones.slice(0, 5).map((r) => (
              <div key={r.id} className="border rounded-md px-3 py-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{entidadName(r.entidad_id)}</span>
                  <span className="text-muted-foreground">{r.fecha}</span>
                </div>
                {r.temas_tratados && <p className="text-muted-foreground line-clamp-2">{r.temas_tratados}</p>}
                {r.acuerdos.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {r.acuerdos.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox
                          checked={a.estado === "cumplido"}
                          onCheckedChange={() => toggleAcuerdo(r.id, i)}
                        />
                        <span className={a.estado === "cumplido" ? "line-through text-muted-foreground" : ""}>{a.descripcion}</span>
                      </div>
                    ))}
                  </div>
                )}
                {r.proxima_reunion && (
                  <p className="text-[10px] text-primary">Próxima reunión: {r.proxima_reunion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog for new reunion */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Reunión de Seguimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Entidad</label>
              <Select value={formEntidad} onValueChange={setFormEntidad}>
                <SelectTrigger><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
                <SelectContent>
                  {entidades.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Fecha de reunión</label>
                <Input type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Próxima reunión</label>
                <Input type="date" value={formProxima} onChange={(e) => setFormProxima(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Participantes</label>
              <Input placeholder="Nombres de los participantes..." value={formParticipantes} onChange={(e) => setFormParticipantes(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Temas tratados</label>
              <Textarea placeholder="Resumen de los temas discutidos..." value={formTemas} onChange={(e) => setFormTemas(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Acuerdos</label>
              {formAcuerdos.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                  <Input
                    placeholder="Descripción del acuerdo..."
                    value={a.descripcion}
                    onChange={(e) => {
                      const u = [...formAcuerdos];
                      u[i] = { ...u[i], descripcion: e.target.value };
                      setFormAcuerdos(u);
                    }}
                  />
                  <Input
                    placeholder="Responsable"
                    className="w-[120px]"
                    value={a.responsable}
                    onChange={(e) => {
                      const u = [...formAcuerdos];
                      u[i] = { ...u[i], responsable: e.target.value };
                      setFormAcuerdos(u);
                    }}
                  />
                  <Input
                    type="date"
                    className="w-[130px]"
                    value={a.fecha_compromiso}
                    onChange={(e) => {
                      const u = [...formAcuerdos];
                      u[i] = { ...u[i], fecha_compromiso: e.target.value };
                      setFormAcuerdos(u);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground"
                    onClick={() => setFormAcuerdos(formAcuerdos.filter((_, j) => j !== i))}
                    disabled={formAcuerdos.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setFormAcuerdos([...formAcuerdos, { descripcion: "", responsable: "", fecha_compromiso: "", estado: "pendiente" }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Agregar acuerdo
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
