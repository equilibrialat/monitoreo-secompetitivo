import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MesReportarSelect, { parseMesReportar } from "./MesReportarSelect";
import { FileOrUrlInput, type FileOrUrlValue, validateUrl } from "@/components/ui/file-or-url-input";

const TIPOS_COMPROBANTE = [
  { value: "factura", label: "Factura" },
  { value: "boleta", label: "Boleta de venta" },
  { value: "recibo_honorarios", label: "Recibo por honorarios" },
  { value: "recibo_egreso", label: "Recibo de egreso" },
  { value: "planilla", label: "Planilla" },
  { value: "otro", label: "Otro" },
];

const FUENTES = [
  { value: "cofinanciamiento_seco", label: "SECO" },
  { value: "contrapartida_monetaria", label: "Contrapartida monetaria" },
  { value: "contrapartida_no_monetaria", label: "Contrapartida no monetaria" },
];

interface ModalAvancePresupuestarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividadCodigo: string;
  actividadDescripcion: string;
  actividadId?: string;
  entidadId: string;
  registroMensualId?: string;
  onSaved?: () => void;
  mesesProgramados?: string[];
  mesesReportados?: Set<string>;
}

export default function ModalAvancePresupuestario({
  open,
  onOpenChange,
  actividadCodigo,
  actividadDescripcion,
  actividadId,
  entidadId,
  registroMensualId,
  onSaved,
  mesesProgramados,
  mesesReportados,
}: ModalAvancePresupuestarioProps) {
  const [monto, setMonto] = useState<string>("");
  const [tipoComprobante, setTipoComprobante] = useState("factura");
  const [fuente, setFuente] = useState("cofinanciamiento_seco");
  const [fecha, setFecha] = useState<Date>(new Date());
  const [source, setSource] = useState<FileOrUrlValue>({ mode: "file", file: null });
  const [mesReportar, setMesReportar] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const hasMesesProps = mesesProgramados && mesesReportados;

  const handleSave = async () => {
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!actividadId) {
      toast.error("No se encontró el ID de la actividad");
      return;
    }
    if (hasMesesProps && !mesReportar) {
      toast.error("Selecciona el mes a reportar");
      return;
    }

    setSaving(true);
    try {
      let regId = registroMensualId;
      if (!regId) {
        let mes: number;
        let anio: number;

        if (hasMesesProps && mesReportar) {
          const parsed = parseMesReportar(mesReportar);
          mes = parsed.mes;
          anio = parsed.anio;
        } else {
          mes = fecha.getMonth() + 1;
          anio = fecha.getFullYear();
        }

        const { data: newReg, error: regErr } = await supabase
          .from("registros_mensuales")
          .insert({
            actividad_id: actividadId,
            entidad_id: entidadId,
            mes,
            anio,
            estado_registro: "borrador",
          })
          .select("id")
          .single();
        if (regErr) throw regErr;
        regId = newReg.id;
      }

      // Adjuntar archivo o URL si se proporcionó
      let docUrl: string | null = null;
      if (source.mode === "file" && source.file) {
        const file = source.file;
        const ext = file.name.split(".").pop();
        const path = `comprobantes/${entidadId}/${actividadCodigo}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("documentos").upload(path, file);
        if (uploadErr) {
          console.error("Upload error:", uploadErr);
        } else {
          const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
          docUrl = urlData.publicUrl;
        }
      } else if (source.mode === "url") {
        const trimmed = source.url.trim();
        const urlErr = validateUrl(trimmed);
        if (trimmed && urlErr) {
          toast.error(urlErr);
          setSaving(false);
          return;
        }
        if (trimmed) docUrl = trimmed;
      }

      const { error: efError } = await supabase.from("ejecucion_financiera").insert({
        actividad_id: actividadId,
        entidad_id: entidadId,
        registro_mensual_id: regId,
        monto: montoNum,
        fuente: fuente as any,
        tipo_gasto: tipoComprobante,
        fecha_gasto: format(fecha, "yyyy-MM-dd"),
        comprobante_ref: docUrl,
      });

      if (efError) throw efError;

      toast.success("Avance presupuestario registrado");
      setMonto("");
      setTipoComprobante("factura");
      setFuente("cofinanciamiento_seco");
      setFecha(new Date());
      setSource({ mode: "file", file: null });
      setMesReportar("");
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message || "Intenta de nuevo"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Avance Presupuestario</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono font-bold text-primary">{actividadCodigo}</span> — {actividadDescripcion}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mes a reportar selector */}
          {hasMesesProps && (
            <MesReportarSelect
              mesesProgramados={mesesProgramados}
              mesesReportados={mesesReportados}
              value={mesReportar}
              onValueChange={setMesReportar}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="monto">Monto ejecutado (USD)</Label>
              <Input
                id="monto"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fuente</Label>
              <Select value={fuente} onValueChange={setFuente}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUENTES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de comprobante</Label>
              <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_COMPROBANTE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha del comprobante</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(fecha, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(d) => d && setFecha(d)}
                    locale={es}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adjuntar comprobante (opcional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {archivo ? archivo.name : "Seleccionar archivo…"}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                />
              </label>
              {archivo && (
                <Button variant="ghost" size="sm" onClick={() => setArchivo(null)}>✕</Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
