import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { FuenteFinanciera, GastoItem } from "@/types/registroMensual";
import { TIPOS_GASTO, createEmptyGasto } from "@/types/registroMensual";

interface SeccionFinancieraProps {
  fuentes: FuenteFinanciera[];
  onFuentesChange: (fuentes: FuenteFinanciera[]) => void;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function FuenteBlock({
  fuente,
  onChange,
}: {
  fuente: FuenteFinanciera;
  onChange: (f: FuenteFinanciera) => void;
}) {
  const [open, setOpen] = useState(true);

  const totalGastosMes = fuente.gastos.reduce((s, g) => s + g.monto, 0);
  const nuevoAcumulado = fuente.ejecutado_acum + totalGastosMes;
  const disponible = fuente.presupuesto - nuevoAcumulado;
  const overBudget = nuevoAcumulado > fuente.presupuesto;

  const addGasto = () => {
    onChange({ ...fuente, gastos: [...fuente.gastos, createEmptyGasto()] });
  };

  const removeGasto = (id: string) => {
    onChange({ ...fuente, gastos: fuente.gastos.filter((g) => g.id !== id) });
  };

  const updateGasto = (id: string, updates: Partial<GastoItem>) => {
    onChange({
      ...fuente,
      gastos: fuente.gastos.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    });
  };

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
          />
          <span className="text-sm font-semibold text-card-foreground">
            {fuente.label}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(fuente.presupuesto)}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Presupuesto</p>
              <p className="text-xs font-semibold">{formatCurrency(fuente.presupuesto)}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Ejecutado acum.</p>
              <p className="text-xs font-semibold">{formatCurrency(nuevoAcumulado)}</p>
            </div>
            <div className={cn(
              "rounded-md p-2",
              overBudget ? "bg-warning/15" : "bg-muted/50"
            )}>
              <p className="text-[10px] text-muted-foreground uppercase">Disponible</p>
              <p className={cn(
                "text-xs font-semibold",
                overBudget && "text-destructive"
              )}>
                {formatCurrency(disponible)}
              </p>
            </div>
          </div>

          {/* Over-budget warning */}
          {overBudget && (
            <div className="flex items-center gap-2 rounded-md bg-warning/15 border border-warning/30 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
              <p className="text-xs text-warning-foreground">
                El gasto acumulado excede el presupuesto asignado
              </p>
            </div>
          )}

          {/* Gastos list */}
          {fuente.gastos.map((gasto, idx) => (
            <GastoRow
              key={gasto.id}
              gasto={gasto}
              index={idx}
              onChange={(updates) => updateGasto(gasto.id, updates)}
              onRemove={() => removeGasto(gasto.id)}
            />
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addGasto}
            className="w-full text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agregar gasto
          </Button>
        </div>
      )}
    </div>
  );
}

function GastoRow({
  gasto,
  index,
  onChange,
  onRemove,
}: {
  gasto: GastoItem;
  index: number;
  onChange: (updates: Partial<GastoItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Gasto #{index + 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-[11px]">Tipo de gasto</Label>
          <Select value={gasto.tipo_gasto} onValueChange={(v) => onChange({ tipo_gasto: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_GASTO.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Monto (USD)</Label>
          <Input
            type="number"
            min={0}
            value={gasto.monto || ""}
            onChange={(e) => onChange({ monto: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-8 justify-start text-left text-xs font-normal",
                  !gasto.fecha && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {gasto.fecha
                  ? format(gasto.fecha, "dd/MM/yy")
                  : "Fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={gasto.fecha}
                onSelect={(d) => onChange({ fecha: d })}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Detalle</Label>
          <Input
            value={gasto.detalle}
            onChange={(e) => onChange({ detalle: e.target.value })}
            className="h-8 text-xs"
            placeholder="Descripción breve"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Ref. comprobante</Label>
          <Input
            value={gasto.referencia_comprobante}
            onChange={(e) => onChange({ referencia_comprobante: e.target.value })}
            className="h-8 text-xs"
            placeholder="Nro. factura, etc."
          />
        </div>
      </div>
    </div>
  );
}

export function SeccionEjecucionFinanciera({ fuentes, onFuentesChange }: SeccionFinancieraProps) {
  const visibleFuentes = fuentes.filter((f) => f.presupuesto > 0);

  if (visibleFuentes.length === 0) return null;

  const handleFuenteChange = (key: string, updated: FuenteFinanciera) => {
    onFuentesChange(fuentes.map((f) => (f.key === key ? updated : f)));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
        B — Ejecución Financiera
      </h3>
      <div className="space-y-3">
        {visibleFuentes.map((f) => (
          <FuenteBlock
            key={f.key}
            fuente={f}
            onChange={(updated) => handleFuenteChange(f.key, updated)}
          />
        ))}
      </div>
    </div>
  );
}
