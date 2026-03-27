import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type {
  ContextualData, RegistroCapacitacion, RegistroInnovacion,
  RegistroGei, RegistroNuevoProducto,
} from "@/types/registroMensual";
import { createEmptyParticipante } from "@/types/registroMensual";

// ─── Capacitación ───────────────────────────────────────

const TIPOS_ACCION = ["Taller", "Asistencia técnica", "Curso", "Pasantía", "Diplomado"];
const MODALIDADES = ["Presencial", "Virtual", "Mixta"];
const DEPARTAMENTOS = [
  "San Martín", "Piura", "La Libertad", "Lima", "Cajamarca",
  "Amazonas", "Junín", "Cusco", "Huánuco", "Ucayali", "Otro",
];

function DateField({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full h-9 justify-start text-left text-sm font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, "PPP", { locale: es }) : "Seleccionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FormCapacitacion({ data, onChange }: { data: RegistroCapacitacion; onChange: (d: RegistroCapacitacion) => void }) {
  const totalH = data.participantes.filter((p) => p.genero === "M").length;
  const totalM = data.participantes.filter((p) => p.genero === "F").length;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <p className="text-sm font-semibold">📋 Registro de Capacitación</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Nombre de la acción formativa</Label>
        <Input value={data.nombre_accion_formativa} onChange={(e) => onChange({ ...data, nombre_accion_formativa: e.target.value })} className="h-9 text-sm" placeholder="Nombre de la capacitación" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={data.tipo_accion_formativa} onValueChange={(v) => onChange({ ...data, tipo_accion_formativa: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{TIPOS_ACCION.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tema</Label>
          <Input value={data.tema} onChange={(e) => onChange({ ...data, tema: e.target.value })} className="h-9 text-sm" placeholder="Tema principal" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DateField label="Fecha inicio" value={data.fecha_inicio} onChange={(d) => onChange({ ...data, fecha_inicio: d })} />
        <DateField label="Fecha fin" value={data.fecha_fin} onChange={(d) => onChange({ ...data, fecha_fin: d })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Departamento</Label>
          <Select value={data.departamento} onValueChange={(v) => onChange({ ...data, departamento: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{DEPARTAMENTOS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Modalidad</Label>
          <Select value={data.modalidad} onValueChange={(v) => onChange({ ...data, modalidad: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{MODALIDADES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Participantes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">{data.participantes.length} participantes ({totalH} hombres, {totalM} mujeres)</span>
          </div>
          <div className="flex items-center gap-2">
            <BulkUploadParticipantes onImport={(imported) => onChange({ ...data, participantes: [...data.participantes, ...imported] })} />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onChange({ ...data, participantes: [...data.participantes, createEmptyParticipante()] })}>
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {data.participantes.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_1fr_50px_1fr_50px_32px] gap-1 px-2 py-1.5 bg-muted text-[10px] font-medium text-muted-foreground uppercase">
              <span>DNI</span><span>Apellidos</span><span>Nombres</span><span>Gén.</span><span>Organización</span><span>Apl.</span><span></span>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {data.participantes.map((p, i) => (
                <div key={p.id} className="grid grid-cols-[80px_1fr_1fr_50px_1fr_50px_32px] gap-1 px-2 py-1 border-t items-center">
                  <Input value={p.num_documento} onChange={(e) => { const ps = [...data.participantes]; ps[i] = { ...p, num_documento: e.target.value }; onChange({ ...data, participantes: ps }); }} className="h-7 text-xs px-1" />
                  <Input value={p.apellidos} onChange={(e) => { const ps = [...data.participantes]; ps[i] = { ...p, apellidos: e.target.value }; onChange({ ...data, participantes: ps }); }} className="h-7 text-xs px-1" />
                  <Input value={p.nombres} onChange={(e) => { const ps = [...data.participantes]; ps[i] = { ...p, nombres: e.target.value }; onChange({ ...data, participantes: ps }); }} className="h-7 text-xs px-1" />
                  <Select value={p.genero} onValueChange={(v) => { const ps = [...data.participantes]; ps[i] = { ...p, genero: v as "M" | "F" }; onChange({ ...data, participantes: ps }); }}>
                    <SelectTrigger className="h-7 text-xs px-1"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent><SelectItem value="M">M</SelectItem><SelectItem value="F">F</SelectItem></SelectContent>
                  </Select>
                  <Input value={p.nombre_organizacion} onChange={(e) => { const ps = [...data.participantes]; ps[i] = { ...p, nombre_organizacion: e.target.value }; onChange({ ...data, participantes: ps }); }} className="h-7 text-xs px-1" />
                  <Select value={p.aplico_aprendizaje === null ? "" : p.aplico_aprendizaje ? "si" : "no"} onValueChange={(v) => { const ps = [...data.participantes]; ps[i] = { ...p, aplico_aprendizaje: v === "si" }; onChange({ ...data, participantes: ps }); }}>
                    <SelectTrigger className="h-7 text-xs px-1"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent><SelectItem value="si">Sí</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { const ps = data.participantes.filter((_, j) => j !== i); onChange({ ...data, participantes: ps }); }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Innovación ─────────────────────────────────────────

function FormInnovacion({ data, onChange }: { data: RegistroInnovacion; onChange: (d: RegistroInnovacion) => void }) {
  const checks: { key: keyof RegistroInnovacion; label: string }[] = [
    { key: "optimizacion_recursos", label: "Optimización de recursos" },
    { key: "optimizacion_procesos", label: "Optimización de procesos" },
    { key: "tecnificacion_mecanizacion", label: "Tecnificación / Mecanización" },
    { key: "digitalizacion_trazabilidad", label: "Digitalización / Trazabilidad" },
    { key: "sostenibilidad_certificaciones", label: "Sostenibilidad / Certificaciones" },
    { key: "valor_agregado_calidad", label: "Valor agregado / Calidad" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">💡 ¿Se implementó alguna innovación?</p>
        <Switch checked={data.activo} onCheckedChange={(v) => onChange({ ...data, activo: v })} />
      </div>
      {data.activo && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre de la innovación</Label>
            <Input value={data.nombre_innovacion} onChange={(e) => onChange({ ...data, nombre_innovacion: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Tipo de innovación</Label>
            {checks.map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <Checkbox checked={data[c.key] as boolean} onCheckedChange={(v) => onChange({ ...data, [c.key]: !!v })} />
                <span className="text-xs">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">RUC organización</Label>
              <Input value={data.ruc_organizacion} onChange={(e) => onChange({ ...data, ruc_organizacion: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre organización</Label>
              <Input value={data.nombre_organizacion} onChange={(e) => onChange({ ...data, nombre_organizacion: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── GEI ────────────────────────────────────────────────

const ETAPAS_GEI = ["Diseño", "Piloto", "Implementación", "Escalamiento"];
const TIPOS_ACCION_GEI = ["Mitigación", "Adaptación"];

function FormGei({ data, onChange }: { data: RegistroGei; onChange: (d: RegistroGei) => void }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">🌱 ¿Se implementó alguna práctica de reducción ambiental?</p>
        <Switch checked={data.activo} onCheckedChange={(v) => onChange({ ...data, activo: v })} />
      </div>
      {data.activo && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={data.tipo_accion} onValueChange={(v) => onChange({ ...data, tipo_accion: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{TIPOS_ACCION_GEI.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Etapa</Label>
              <Select value={data.etapa_implementacion} onValueChange={(v) => onChange({ ...data, etapa_implementacion: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ETAPAS_GEI.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre de la práctica</Label>
            <Input value={data.nombre_practica} onChange={(e) => onChange({ ...data, nombre_practica: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoría</Label>
            <Input value={data.categoria} onChange={(e) => onChange({ ...data, categoria: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">RUC organización</Label>
              <Input value={data.ruc_organizacion} onChange={(e) => onChange({ ...data, ruc_organizacion: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre organización</Label>
              <Input value={data.nombre_organizacion} onChange={(e) => onChange({ ...data, nombre_organizacion: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Nuevo Producto ─────────────────────────────────────

function FormNuevoProducto({ data, onChange }: { data: RegistroNuevoProducto; onChange: (d: RegistroNuevoProducto) => void }) {
  const checks: { key: keyof RegistroNuevoProducto; label: string }[] = [
    { key: "transformacion_primario", label: "Transformación primario" },
    { key: "mejora_empaque", label: "Mejora de empaque" },
    { key: "diferenciacion_origen", label: "Diferenciación de origen" },
    { key: "incorpora_innovacion", label: "Incorpora tecnología / innovación" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">📦 ¿Se desarrolló un nuevo producto?</p>
        <Switch checked={data.activo} onCheckedChange={(v) => onChange({ ...data, activo: v })} />
      </div>
      {data.activo && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del producto</Label>
              <Input value={data.nombre_producto} onChange={(e) => onChange({ ...data, nombre_producto: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cadena de valor</Label>
              <Input value={data.cadena_valor} onChange={(e) => onChange({ ...data, cadena_valor: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Tipo</Label>
            {checks.map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <Checkbox checked={data[c.key] as boolean} onCheckedChange={(v) => onChange({ ...data, [c.key]: !!v })} />
                <span className="text-xs">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">RUC organización</Label>
              <Input value={data.ruc_organizacion} onChange={(e) => onChange({ ...data, ruc_organizacion: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre organización</Label>
              <Input value={data.nombre_organizacion} onChange={(e) => onChange({ ...data, nombre_organizacion: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────

interface Props {
  tags: string[];
  contextual: ContextualData;
  onContextualChange: (d: ContextualData) => void;
}

export function SeccionIndicadoresContextuales({ tags, contextual, onContextualChange }: Props) {
  const show = tags.some((t) => ["capacitacion", "innovacion", "gei", "nuevo_producto"].includes(t));
  if (!show) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
        C — Indicadores Contextuales
      </h3>

      {tags.includes("capacitacion") && contextual.capacitacion && (
        <FormCapacitacion data={contextual.capacitacion} onChange={(d) => onContextualChange({ ...contextual, capacitacion: d })} />
      )}
      {tags.includes("innovacion") && contextual.innovacion && (
        <FormInnovacion data={contextual.innovacion} onChange={(d) => onContextualChange({ ...contextual, innovacion: d })} />
      )}
      {tags.includes("gei") && contextual.gei && (
        <FormGei data={contextual.gei} onChange={(d) => onContextualChange({ ...contextual, gei: d })} />
      )}
      {tags.includes("nuevo_producto") && contextual.nuevo_producto && (
        <FormNuevoProducto data={contextual.nuevo_producto} onChange={(d) => onContextualChange({ ...contextual, nuevo_producto: d })} />
      )}
    </div>
  );
}
