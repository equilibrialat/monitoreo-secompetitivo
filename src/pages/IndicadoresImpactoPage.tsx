import { useState, useMemo, useCallback, useRef } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { getSemestre, updateEstadoRegistro } from "@/lib/indicadoresImpacto";
import { SeccionEmpleo } from "@/components/indicadores/SeccionEmpleo";
import { SeccionProductividad } from "@/components/indicadores/SeccionProductividad";
import { SeccionComercializacion } from "@/components/indicadores/SeccionComercializacion";
import { SeccionGobernanza } from "@/components/indicadores/SeccionGobernanza";
import { SeccionVentasTurismo } from "@/components/indicadores/SeccionVentasTurismo";
import { SeccionAtractivos } from "@/components/indicadores/SeccionAtractivos";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAutoSave } from "@/hooks/useAutoSave";

const currentYear = new Date().getFullYear();
const ANIOS = [currentYear - 1, currentYear, currentYear + 1];

interface SectionDef {
  key: string;
  label: string;
  component: React.ReactNode;
  saveRef?: React.RefObject<(() => Promise<void>) | null>;
}

export default function IndicadoresImpactoPage() {
  const { entidadId, entidades } = useRole();
  const [anio, setAnio] = useState(currentYear);
  const [semestre, setSemestre] = useState(() => new Date().getMonth() < 6 ? "S1" : "S2");
  const [currentSection, setCurrentSection] = useState(0);
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const entidad = entidades.find((e) => e.id === entidadId);
  const tipoEntidad = entidad?.tipo_entidad ?? "";
  const cadenaValor = entidad?.cadena_valor ?? "";
  const periodo = semestre;

  // Auto-save tracking
  const sectionSaveRef = useRef<(() => Promise<void>) | null>(null);

  const doAutoSave = useCallback(async () => {
    if (sectionSaveRef.current) {
      await sectionSaveRef.current();
    }
  }, []);

  const { isDirty, isSaving: autoSaving, lastSaved, markDirty, markClean } = useAutoSave({
    onSave: doAutoSave,
    enabled: !!entidadId && tipoEntidad !== "mec_a",
    interval: 30000,
  });

  const markSaved = (key: string) => {
    setSavedSections((prev) => new Set(prev).add(key));
    markClean();
  };

  const sections: SectionDef[] = useMemo(() => {
    if (tipoEntidad === "mec_a") return [];

    const common = {
      entidadId: entidadId!,
      anio,
      periodo,
      cadenaValor,
    };

    if (tipoEntidad === "mec_b_turismo") {
      return [
        { key: "empleo", label: "Empleo", component: <SeccionEmpleo {...common} onSaved={() => markSaved("empleo")} onDirty={markDirty} /> },
        { key: "ventas_turismo", label: "Ventas Turismo", component: <SeccionVentasTurismo entidadId={entidadId!} anio={anio} periodo={periodo} onSaved={() => markSaved("ventas_turismo")} /> },
        { key: "atractivos", label: "Atractivos", component: <SeccionAtractivos entidadId={entidadId!} anio={anio} periodo={periodo} onSaved={() => markSaved("atractivos")} /> },
        { key: "gobernanza", label: "Gobernanza", component: <SeccionGobernanza {...common} sectionNumber={4} onSaved={() => markSaved("gobernanza")} /> },
      ];
    }

    // mec_b_agro (default for B entities)
    return [
      { key: "empleo", label: "Empleo", component: <SeccionEmpleo {...common} onSaved={() => markSaved("empleo")} onDirty={markDirty} /> },
      { key: "productividad", label: "Productividad", component: <SeccionProductividad entidadId={entidadId!} anio={anio} cadenaValor={cadenaValor} onSaved={() => markSaved("productividad")} /> },
      { key: "comercializacion", label: "Comercialización", component: <SeccionComercializacion entidadId={entidadId!} anio={anio} cadenaValor={cadenaValor} onSaved={() => markSaved("comercializacion")} /> },
      { key: "gobernanza", label: "Gobernanza", component: <SeccionGobernanza {...common} sectionNumber={4} onSaved={() => markSaved("gobernanza")} /> },
    ];
  }, [tipoEntidad, entidadId, anio, periodo, cadenaValor]);

  if (!entidadId) {
    return <p className="p-6 text-muted-foreground">Selecciona una entidad primero.</p>;
  }

  if (tipoEntidad === "mec_a") {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-4">Indicadores de Impacto</h1>
        <div className="rounded-lg border bg-card p-6 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Mecanismo A</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los indicadores del Mecanismo A se registran directamente en el avance de cada actividad.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (sections.length === 0) return null;

  const totalSections = sections.length;
  const progressPct = ((currentSection + 1) / totalSections) * 100;
  const isLast = currentSection === totalSections - 1;

  const handleSectionChange = (newSection: number) => {
    // Auto-save current section before switching (fire and forget)
    if (isDirty && sectionSaveRef.current) {
      sectionSaveRef.current();
    }
    setCurrentSection(newSection);
  };

  const handleEnviar = async () => {
    const tables = tipoEntidad === "mec_b_turismo"
      ? ["reporte_empleo", "reporte_turismo_ventas", "reporte_turismo_atractivos", "reporte_gobernanza"]
      : ["reporte_empleo", "reporte_productividad", "reporte_comercial", "reporte_gobernanza"];

    for (const table of tables) {
      await updateEstadoRegistro(table, entidadId!, anio, periodo, "enviado");
    }
    toast.success("✅ Reporte completo enviado para revisión");
  };

  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-base md:text-lg font-semibold">
          Reporte de Indicadores de Impacto — {getSemestre(semestre)} {anio}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entidad?.nombre_corto} · {cadenaValor}
        </p>
      </div>

      {/* Auto-save indicator */}
      <AutoSaveIndicator isSaving={autoSaving} lastSaved={lastSaved} isDirty={isDirty} />

      {/* Period selectors */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Año:</span>
          <Select value={String(anio)} onValueChange={(v) => { setAnio(Number(v)); setCurrentSection(0); setSavedSections(new Set()); }}>
            <SelectTrigger className="h-10 w-24 text-xs min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Semestre:</span>
          <Select value={semestre} onValueChange={(v) => { setSemestre(v); setCurrentSection(0); setSavedSections(new Set()); }}>
            <SelectTrigger className="h-10 w-44 text-xs min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="S1">S1: Enero – Junio</SelectItem>
              <SelectItem value="S2">S2: Julio – Diciembre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Progress bar / stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Sección {currentSection + 1} de {totalSections}: <span className="font-medium text-foreground">{sections[currentSection].label}</span></span>
          {!isMobile && (
            <div className="flex gap-1">
              {sections.map((s, i) => (
                <Badge
                  key={s.key}
                  variant={i === currentSection ? "default" : savedSections.has(s.key) ? "secondary" : "outline"}
                  className="text-[9px] cursor-pointer"
                  onClick={() => handleSectionChange(i)}
                >
                  {s.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Progress value={progressPct} className="h-2" />
        {isMobile && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {sections.map((s, i) => (
              <Badge
                key={s.key}
                variant={i === currentSection ? "default" : savedSections.has(s.key) ? "secondary" : "outline"}
                className="text-[10px] cursor-pointer shrink-0 min-h-[32px] px-2.5"
                onClick={() => handleSectionChange(i)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Current section */}
      {sections[currentSection].component}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs min-h-[44px] w-full sm:w-auto"
          disabled={currentSection === 0}
          onClick={() => handleSectionChange(currentSection - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
        </Button>

        <div className="flex gap-2">
          {!isLast && (
            <Button size="sm" className="text-xs min-h-[44px] w-full sm:w-auto" onClick={() => handleSectionChange(currentSection + 1)}>
              Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
          {isLast && (
            <Button size="sm" className="text-xs bg-success text-success-foreground hover:bg-success/90 min-h-[44px] w-full sm:w-auto" onClick={() => setShowSendConfirm(true)}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar reporte completo
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showSendConfirm}
        onCancel={() => setShowSendConfirm(false)}
        onConfirm={() => { setShowSendConfirm(false); handleEnviar(); }}
        title="Confirmar envío de reporte"
        description="Una vez enviado no podrás editar este reporte hasta que sea devuelto. ¿Confirmas el envío?"
        confirmLabel="Sí, enviar reporte"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
