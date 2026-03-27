import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import ReporteMensualPreview from "@/components/reportes/ReporteMensualPreview";
import ReporteTrimestralCompleto from "@/components/reportes/ReporteTrimestralCompleto";
import ReporteSemestral from "@/components/reportes/ReporteSemestral";
import ReporteAnual from "@/components/reportes/ReporteAnual";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ANIOS = [2024, 2025, 2026];
const TRIMESTRES = [
  { value: "T1", label: "T1 (Ene-Mar)" },
  { value: "T2", label: "T2 (Abr-Jun)" },
  { value: "T3", label: "T3 (Jul-Sep)" },
  { value: "T4", label: "T4 (Oct-Dic)" },
];
const SEMESTRES = [
  { value: "S1", label: "S1 (Ene-Jun)" },
  { value: "S2", label: "S2 (Jul-Dic)" },
];

export default function GenerarReportesPage() {
  const { role, entidadId, entidades } = useRole();
  const isMonitoreo = role === "monitoreo" || role === "direccion" || role === "administracion";

  const [selectedEntidad, setSelectedEntidad] = useState<string>(entidadId || "consolidado");
  const [tipoReporte, setTipoReporte] = useState<string>("trimestral");

  // Period selectors
  const [mesMensual, setMesMensual] = useState<string>(String(new Date().getMonth() + 1));
  const [anioMensual, setAnioMensual] = useState<string>("2025");
  const [trimestre, setTrimestre] = useState<string>("T4");
  const [anioTrimestral, setAnioTrimestral] = useState<string>("2025");
  const [semestre, setSemestre] = useState<string>("S2");
  const [anioSemestral, setAnioSemestral] = useState<string>("2025");
  const [anioAnual, setAnioAnual] = useState<string>("2025");

  const effectiveEntidadId = isMonitoreo ? selectedEntidad : entidadId;

  // Auto-select first entity if none selected
  useEffect(() => {
    if (!isMonitoreo && entidadId) setSelectedEntidad(entidadId);
  }, [entidadId, isMonitoreo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generar Reportes</h1>
          <p className="text-muted-foreground">Selecciona tipo, período y entidad — el reporte se carga automáticamente</p>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Report type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de reporte</label>
              <Tabs value={tipoReporte} onValueChange={setTipoReporte}>
                <TabsList className="h-9">
                  <TabsTrigger value="mensual" className="text-xs">Mensual</TabsTrigger>
                  <TabsTrigger value="trimestral" className="text-xs">Trimestral</TabsTrigger>
                  <TabsTrigger value="semestral" className="text-xs">Semestral</TabsTrigger>
                  <TabsTrigger value="anual" className="text-xs">Anual</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Period selectors */}
            {tipoReporte === "mensual" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Mes</label>
                  <Select value={mesMensual} onValueChange={setMesMensual}>
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Año</label>
                  <Select value={anioMensual} onValueChange={setAnioMensual}>
                    <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {tipoReporte === "trimestral" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Trimestre</label>
                  <Select value={trimestre} onValueChange={setTrimestre}>
                    <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{TRIMESTRES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Año</label>
                  <Select value={anioTrimestral} onValueChange={setAnioTrimestral}>
                    <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {tipoReporte === "semestral" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Semestre</label>
                  <Select value={semestre} onValueChange={setSemestre}>
                    <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{SEMESTRES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Año</label>
                  <Select value={anioSemestral} onValueChange={setAnioSemestral}>
                    <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {tipoReporte === "anual" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Año</label>
                <Select value={anioAnual} onValueChange={setAnioAnual}>
                  <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* Entity selector (supervisors only) */}
            {isMonitoreo && (
              <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Entidad</label>
                <Select value={selectedEntidad} onValueChange={setSelectedEntidad}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consolidado">📊 Consolidado</SelectItem>
                    {entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report renders immediately */}
      {tipoReporte === "mensual" && (
        <ReporteMensualPreview
          key={`m-${effectiveEntidadId}-${mesMensual}-${anioMensual}`}
          entidadId={effectiveEntidadId}
          mes={parseInt(mesMensual)}
          anio={parseInt(anioMensual)}
          entidades={entidades}
          onClose={() => {}}
        />
      )}
      {tipoReporte === "trimestral" && (
        <ReporteTrimestralCompleto
          key={`t-${effectiveEntidadId}-${trimestre}-${anioTrimestral}`}
          entidadId={effectiveEntidadId}
          trimestre={trimestre}
          anio={parseInt(anioTrimestral)}
          entidades={entidades}
          onClose={() => {}}
        />
      )}
      {tipoReporte === "semestral" && (
        <ReporteSemestral
          key={`s-${effectiveEntidadId}-${semestre}-${anioSemestral}`}
          entidadId={effectiveEntidadId}
          semestre={semestre}
          anio={parseInt(anioSemestral)}
          entidades={entidades}
          onClose={() => {}}
        />
      )}
      {tipoReporte === "anual" && (
        <ReporteAnual
          key={`a-${effectiveEntidadId}-${anioAnual}`}
          entidadId={effectiveEntidadId}
          anio={parseInt(anioAnual)}
          entidades={entidades}
          onClose={() => {}}
        />
      )}
    </div>
  );
}
