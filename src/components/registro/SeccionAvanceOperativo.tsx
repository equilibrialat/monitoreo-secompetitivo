import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { ESTADOS_AVANCE, MESES } from "@/types/registroMensual";

interface SeccionAvanceProps {
  mes: number;
  anio: number;
  valorAvance: number;
  estado: string;
  descripcion: string;
  fechaEjecucion: Date | undefined;
  unidadMedida: string;
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

export function SeccionAvanceOperativo({
  mes, anio, valorAvance, estado, descripcion, fechaEjecucion, unidadMedida,
  onMesChange, onAnioChange, onValorAvanceChange, onEstadoChange,
  onDescripcionChange, onFechaEjecucionChange, errors = {},
}: SeccionAvanceProps) {
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
        <Label className="text-xs">Valor de avance ({unidadMedida}) <span className="text-destructive">*</span></Label>
        <Input
          type="number"
          min={0}
          value={valorAvance || ""}
          onChange={(e) => onValorAvanceChange(Number(e.target.value))}
          className={cn("h-9 text-sm", errors.avance && "border-destructive")}
          placeholder={`Cantidad de ${unidadMedida}`}
        />
        {errors.avance && <p className="text-xs text-destructive">{errors.avance}</p>}
      </div>

      {/* Estado */}
      <div className="space-y-1.5">
        <Label className="text-xs">Estado</Label>
        <Select value={estado} onValueChange={onEstadoChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_AVANCE.map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label className="text-xs">Descripción / Observaciones</Label>
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
