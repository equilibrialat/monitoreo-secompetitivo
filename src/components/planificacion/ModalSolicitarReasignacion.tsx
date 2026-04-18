import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calcularAlerta, type TipoReasignacion } from "@/lib/reasignacionesPresupuestales";

export interface ActividadParaReasignar {
  actividad_codigo: string;
  actividad_descripcion: string;
  presupuesto_vigente: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadCodigo: string;
  mecanismo: string;
  actividades: ActividadParaReasignar[];
  onSaved?: () => void;
}

export default function ModalSolicitarReasignacion({
  open, onOpenChange, entidadCodigo, mecanismo, actividades, onSaved,
}: Props) {
  const [origen, setOrigen] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [tipo, setTipo] = useState<TipoReasignacion>("productos_mismo_resultado");
  const [justificacion, setJustificacion] = useState("");
  const [saving, setSaving] = useState(false);

  const fechaSolicitud = useMemo(() => new Date().toLocaleDateString("es-PE", {
    day: "2-digit", month: "long", year: "numeric",
  }), [open]);

  const actOrigen = actividades.find(a => a.actividad_codigo === origen);
  const montoNum = Number(monto);
  const pctVariacion = actOrigen && actOrigen.presupuesto_vigente > 0 && montoNum > 0
    ? (montoNum / actOrigen.presupuesto_vigente) * 100
    : 0;

  const alerta = useMemo(() => {
    if (!actOrigen || montoNum <= 0) return null;
    return calcularAlerta(mecanismo, tipo, pctVariacion);
  }, [mecanismo, tipo, pctVariacion, actOrigen, montoNum]);

  function reset() {
    setOrigen(""); setDestino(""); setMonto("");
    setTipo("productos_mismo_resultado"); setJustificacion("");
  }

  async function handleSubmit() {
    if (!origen || !destino) { toast.error("Selecciona actividad origen y destino"); return; }
    if (origen === destino) { toast.error("Origen y destino no pueden ser iguales"); return; }
    if (montoNum <= 0) { toast.error("Monto debe ser mayor a 0"); return; }
    if (actOrigen && montoNum > actOrigen.presupuesto_vigente) {
      toast.error("El monto excede el presupuesto vigente de la actividad origen"); return;
    }
    if (!justificacion.trim()) { toast.error("La justificación es obligatoria"); return; }

    setSaving(true);
    const { error } = await (supabase as any)
      .from("reasignaciones_presupuestales")
      .insert({
        entidad_codigo: entidadCodigo,
        mecanismo,
        actividad_origen_codigo: origen,
        actividad_destino_codigo: destino,
        monto_usd: montoNum,
        tipo_reasignacion: tipo,
        pct_variacion: Number(pctVariacion.toFixed(2)),
        alerta_nivel: alerta?.nivel ?? null,
        alerta_mensaje: alerta?.mensaje ?? null,
        justificacion: justificacion.trim(),
        solicitado_por: "Entidad",
        estado: "pendiente_coordinador",
      });
    setSaving(false);
    if (error) {
      toast.error("No se pudo enviar la solicitud: " + error.message);
      return;
    }
    toast.success("Solicitud enviada al Coordinador Regional");
    reset();
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar reasignación presupuestal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Actividad origen</Label>
              <Select value={origen} onValueChange={setOrigen}>
                <SelectTrigger><SelectValue placeholder="Selecciona origen..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {actividades.map(a => (
                    <SelectItem key={a.actividad_codigo} value={a.actividad_codigo}>
                      {a.actividad_codigo} — {a.actividad_descripcion.slice(0, 60)}
                      {a.actividad_descripcion.length > 60 ? "…" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {actOrigen && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vigente: USD {actOrigen.presupuesto_vigente.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Actividad destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecciona destino..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {actividades
                    .filter(a => a.actividad_codigo !== origen)
                    .map(a => (
                      <SelectItem key={a.actividad_codigo} value={a.actividad_codigo}>
                        {a.actividad_codigo} — {a.actividad_descripcion.slice(0, 60)}
                        {a.actividad_descripcion.length > 60 ? "…" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Monto a reasignar (USD)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Tipo de reasignación</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoReasignacion)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="productos_mismo_resultado" id="tipo-prod" />
                <Label htmlFor="tipo-prod" className="text-xs font-normal cursor-pointer">
                  Entre productos del mismo resultado
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="entre_resultados" id="tipo-res" />
                <Label htmlFor="tipo-res" className="text-xs font-normal cursor-pointer">
                  Entre resultados distintos
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs">Justificación <span className="text-destructive">*</span></Label>
            <Textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Explica el motivo del ajuste presupuestal…"
              className="min-h-[80px] text-xs"
            />
          </div>

          <div className="text-[11px] text-muted-foreground">
            Fecha de solicitud: <span className="font-medium text-foreground">{fechaSolicitud}</span>
          </div>

          {alerta && (
            <Alert className={alerta.nivel === "warning" ? "border-amber-500" : "border-blue-300"}>
              {alerta.nivel === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription className="text-xs">
                <div className="font-medium mb-0.5">
                  Variación: {pctVariacion.toFixed(1)}% del presupuesto vigente
                </div>
                {alerta.mensaje}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
