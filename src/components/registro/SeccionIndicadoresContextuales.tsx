import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistroCapacitacion } from "@/types/registroMensual";

interface SeccionCapacitacionProps {
  data: RegistroCapacitacion;
  onChange: (d: RegistroCapacitacion) => void;
}

const METODOLOGIAS = [
  "Presencial",
  "Virtual sincrónica",
  "Virtual asincrónica",
  "Mixta",
  "Taller práctico en campo",
];

export function SeccionIndicadoresContextuales({
  tags,
  capacitacion,
  onCapacitacionChange,
}: {
  tags: string[];
  capacitacion?: RegistroCapacitacion;
  onCapacitacionChange?: (d: RegistroCapacitacion) => void;
}) {
  const showCapacitacion = tags.includes("capacitacion");

  if (!showCapacitacion) return null;

  if (!capacitacion || !onCapacitacionChange) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
        C — Indicadores Contextuales
      </h3>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Registro de Capacitación
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Tema de la capacitación</Label>
          <Input
            value={capacitacion.tema}
            onChange={(e) => onCapacitacionChange({ ...capacitacion, tema: e.target.value })}
            className="h-9 text-sm"
            placeholder="Tema principal"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Participantes hombres</Label>
            <Input
              type="number"
              min={0}
              value={capacitacion.num_participantes_hombres || ""}
              onChange={(e) =>
                onCapacitacionChange({
                  ...capacitacion,
                  num_participantes_hombres: Number(e.target.value),
                })
              }
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Participantes mujeres</Label>
            <Input
              type="number"
              min={0}
              value={capacitacion.num_participantes_mujeres || ""}
              onChange={(e) =>
                onCapacitacionChange({
                  ...capacitacion,
                  num_participantes_mujeres: Number(e.target.value),
                })
              }
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Horas de capacitación</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={capacitacion.horas_capacitacion || ""}
              onChange={(e) =>
                onCapacitacionChange({
                  ...capacitacion,
                  horas_capacitacion: Number(e.target.value),
                })
              }
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lugar</Label>
            <Input
              value={capacitacion.lugar}
              onChange={(e) =>
                onCapacitacionChange({ ...capacitacion, lugar: e.target.value })
              }
              className="h-9 text-sm"
              placeholder="Ubicación"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Metodología</Label>
          <Select
            value={capacitacion.metodologia}
            onValueChange={(v) =>
              onCapacitacionChange({ ...capacitacion, metodologia: v })
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar metodología" />
            </SelectTrigger>
            <SelectContent>
              {METODOLOGIAS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
