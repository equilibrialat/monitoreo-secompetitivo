import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ESTADOS_AVANCE, MESES } from "@/types/registroMensual";

interface SeccionAvanceProps {
  mes: number;
  anio: number;
  valorAvance: number;
  estado: string;
  descripcion: string;
  fechaEjecucion: Date | undefined;
  unidadMedida: string;
  metaValor: number;
  acumuladoAnterior: number;
  actividadNombre?: string;
  actividadCodigo?: string;
  onMesChange: (v: number) => void;
  onAnioChange: (v: number) => void;
  onValorAvanceChange: (v: number) => void;
  onEstadoChange: (v: string) => void;
  onDescripcionChange: (v: string) => void;
  onFechaEjecucionChange: (v: Date | undefined) => void;
  errors?: Record<string, string>;
}

const currentYear = new Date().getFullYear();
const ANIOS = [currentYear - 1, currentYear, currentYear + 1];

function getTooltipText(unidad: string): string {
  const u = (unidad || "").toLowerCase();

  const countable = ["parcelas", "centros", "kits", "talleres", "eventos", "documentos", "intercambios", "alianzas", "mesas", "servicios", "organizaciones"];
  if (countable.some((c) => u.includes(c))) {
    return `Ingrese la cantidad de ${unidad} completadas en este mes. Ejemplo: si implementó 5 ${unidad.toLowerCase()} este mes, ingrese 5.`;
  }

  if (u.includes("programa") || u.includes("global")) {
    return "Esta actividad se mide como entrega única. Ingrese un valor entre 0 y 1 representando el porcentaje de avance (0.3 = 30% avanzado, 1 = completado).";
  }

  if (u.includes("productores") || u.includes("profesionales")) {
    return "Ingrese la cantidad de personas atendidas o capacitadas en este mes.";
  }

  if (u.includes("tn ofertadas") || u.includes("toneladas")) {
    return "Ingrese las toneladas ofertadas de manera conjunta en este mes.";
  }

  return `Ingrese la cantidad de ${unidad} lograda en este mes.`;
}

export function SeccionAvanceOperativo({
  mes, anio, valorAvance, estado, descripcion, fechaEjecucion, unidadMedida,
  metaValor, acumuladoAnterior, actividadNombre, actividadCodigo,
  onMesChange, onAnioChange, onValorAvanceChange, onEstadoChange,
  onDescripcionChange, onFechaEjecucionChange, errors = {},
}: SeccionAvanceProps) {
  const [suggestLoading, setSuggestLoading] = useState(false);
  const totalProyectado = acumuladoAnterior + valorAvance;
  const progressPct = metaValor > 0 ? Math.min((totalProyectado / metaValor) * 100, 100) : 0;
  const superaMeta = metaValor > 0 && totalProyectado > metaValor;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
        A — Avance Operativo
      </h3>

      {/* Mes / Año */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Mes</Label>
          <Select value={String(mes)} onValueChange={(v) => onMesChange(Number(v))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Año</Label>
          <Select value={String(anio)} onValueChange={(v) => onAnioChange(Number(v))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIOS.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Valor de avance */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs">
            Avance este mes ({unidadMedida}) <span className="text-destructive">*</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-xs">
              {getTooltipText(unidadMedida)}
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          type="number"
          min={0}
          step="any"
          value={valorAvance || ""}
          onChange={(e) => onValorAvanceChange(Number(e.target.value))}
          className={cn("h-9 text-sm", errors.avance && "border-destructive")}
          placeholder={`Cantidad de ${unidadMedida}`}
        />
        {errors.avance && <p className="text-xs text-destructive">{errors.avance}</p>}

        <p className="text-[11px] text-muted-foreground">
          Meta total: <span className="font-medium text-foreground">{metaValor}</span> {unidadMedida}.
          {" "}Acumulado anterior: <span className="font-medium text-foreground">{acumuladoAnterior}</span>.
          {" "}Registre cuánto avanzó este mes.
        </p>

        {/* Progress bar */}
        {metaValor > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{totalProyectado} / {metaValor} {unidadMedida}</span>
              <span className="font-medium">{Math.round((totalProyectado / metaValor) * 100)}%</span>
            </div>
            <Progress
              value={progressPct}
              className={cn("h-2", superaMeta && "[&>div]:bg-warning")}
            />
          </div>
        )}

        {superaMeta && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            ⚠ El avance supera la meta planificada.
          </div>
        )}
      </div>

      {/* Estado */}
      <div className="space-y-1.5">
        <Label className="text-xs">Estado <span className="text-destructive">*</span></Label>
        <Select value={estado} onValueChange={onEstadoChange}>
          <SelectTrigger className={cn("h-9 text-sm", errors.estado && "border-destructive")}>
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_AVANCE.map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.estado && <p className="text-xs text-destructive">{errors.estado}</p>}
      </div>

      {/* Fecha de ejecución */}
      <div className="space-y-1.5">
        <Label className="text-xs">Fecha de ejecución</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-9 justify-start text-left text-sm font-normal",
                !fechaEjecucion && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {fechaEjecucion
                ? format(fechaEjecucion, "PPP", { locale: es })
                : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaEjecucion}
              onSelect={onFechaEjecucionChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Descripción / Observaciones</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] px-2"
            disabled={suggestLoading}
            onClick={async () => {
              setSuggestLoading(true);
              const { resultado, error } = await invokeAnalysis("narrativa", {
                actividad: actividadNombre || "Actividad",
                codigo: actividadCodigo || "",
                avance: valorAvance,
                unidad_medida: unidadMedida,
                meta: metaValor,
                acumulado: acumuladoAnterior,
                estado,
              });
              setSuggestLoading(false);
              if (resultado) onDescripcionChange(resultado);
            }}
          >
            {suggestLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            ✨ Sugerir descripción
          </Button>
        </div>
        <Textarea
          value={descripcion}
          onChange={(e) => onDescripcionChange(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
          placeholder="Describa el avance realizado este mes..."
        />
      </div>
    </div>
  );
}
