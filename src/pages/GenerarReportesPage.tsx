import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import ReporteMensualPreview from "@/components/reportes/ReporteMensualPreview";
import ReporteTrimestralCompleto from "@/components/reportes/ReporteTrimestralCompleto";
import ReporteSemestral from "@/components/reportes/ReporteSemestral";
import ReporteAnual from "@/components/reportes/ReporteAnual";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ANIOS = [2024, 2025, 2026];

function getCurrentQuarterStart(): number {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 4;
  if (m <= 9) return 7;
  return 10;
}

function deriveTrimestre(mes: number): string {
  if (mes <= 3) return "T1";
  if (mes <= 6) return "T2";
  if (mes <= 9) return "T3";
  return "T4";
}

function deriveSemestre(mes: number): string {
  return mes <= 6 ? "S1" : "S2";
}

export default function GenerarReportesPage() {
  const { role, entidadId, entidades } = useRole();
  const isMonitoreo = role === "monitoreo" || role === "direccion" || role === "administracion";

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [tipoReporte, setTipoReporte] = useState<string>("trimestral");
  const [mesDesde, setMesDesde] = useState<string>(String(getCurrentQuarterStart()));
  const [anioDesde, setAnioDesde] = useState<string>(String(currentYear));
  const [mesHasta, setMesHasta] = useState<string>(String(Math.min(getCurrentQuarterStart() + 2, 12)));
  const [anioHasta, setAnioHasta] = useState<string>(String(currentYear));
  const [selectedEntidad, setSelectedEntidad] = useState<string>(entidadId || "consolidado");

  useEffect(() => {
    if (!isMonitoreo && entidadId) setSelectedEntidad(entidadId);
  }, [entidadId, isMonitoreo]);

  const handleTipoChange = (tipo: string) => {
    setTipoReporte(tipo);
    switch (tipo) {
      case "mensual":
        setMesDesde(String(currentMonth));
        setAnioDesde(String(currentYear));
        setMesHasta(String(currentMonth));
        setAnioHasta(String(currentYear));
        break;
      case "trimestral": {
        const qs = getCurrentQuarterStart();
        setMesDesde(String(qs));
        setAnioDesde(String(currentYear));
        setMesHasta(String(qs + 2));
        setAnioHasta(String(currentYear));
        break;
      }
      case "semestral": {
        const ss = currentMonth <= 6 ? 1 : 7;
        setMesDesde(String(ss));
        setAnioDesde(String(currentYear));
        setMesHasta(String(ss + 5));
        setAnioHasta(String(currentYear));
        break;
      }
      case "anual":
        setMesDesde("1");
        setAnioDesde(String(currentYear));
        setMesHasta("12");
        setAnioHasta(String(currentYear));
        break;
    }
  };

  const effectiveEntidadId = isMonitoreo ? selectedEntidad : entidadId;
  const mDesde = parseInt(mesDesde);
  const aDesde = parseInt(anioDesde);
  const mHasta = parseInt(mesHasta);
  const aHasta = parseInt(anioHasta);

  const rangeLabel = `${MESES[mDesde - 1]} ${aDesde}` + (mDesde === mHasta && aDesde === aHasta ? "" : ` – ${MESES[mHasta - 1]} ${aHasta}`);

  // Determine which report component to render
  const spanMonths = (aHasta - aDesde) * 12 + (mHasta - mDesde) + 1;

  const renderReport = () => {
    const key = `r-${effectiveEntidadId}-${mesDesde}-${anioDesde}-${mesHasta}-${anioHasta}`;

    if (spanMonths === 1) {
      return (
        <ReporteMensualPreview key={key} entidadId={effectiveEntidadId} mes={mDesde} anio={aDesde} entidades={entidades} onClose={() => {}} />
      );
    }
    if (spanMonths <= 3) {
      return (
        <ReporteTrimestralCompleto key={key} entidadId={effectiveEntidadId} trimestre={deriveTrimestre(mDesde)} anio={aDesde} entidades={entidades} onClose={() => {}} />
      );
    }
    if (spanMonths <= 6) {
      return (
        <ReporteSemestral key={key} entidadId={effectiveEntidadId} semestre={deriveSemestre(mDesde)} anio={aDesde} entidades={entidades} onClose={() => {}} />
      );
    }
    return (
      <ReporteAnual key={key} entidadId={effectiveEntidadId} anio={aDesde} entidades={entidades} onClose={() => {}} />
    );
  };

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

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Report type presets */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de reporte</label>
              <Tabs value={tipoReporte} onValueChange={handleTipoChange}>
                <TabsList className="h-9">
                  <TabsTrigger value="mensual" className="text-xs">Mensual</TabsTrigger>
                  <TabsTrigger value="trimestral" className="text-xs">Trimestral</TabsTrigger>
                  <TabsTrigger value="semestral" className="text-xs">Semestral</TabsTrigger>
                  <TabsTrigger value="anual" className="text-xs">Anual</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Desde */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <div className="flex gap-1">
                <Select value={mesDesde} onValueChange={setMesDesde}>
                  <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={anioDesde} onValueChange={setAnioDesde}>
                  <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Hasta */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <div className="flex gap-1">
                <Select value={mesHasta} onValueChange={setMesHasta}>
                  <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={anioHasta} onValueChange={setAnioHasta}>
                  <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Entity selector */}
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

          {/* Period label + semestral note */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Mostrando: <span className="font-medium text-foreground">{rangeLabel}</span></span>
            {tipoReporte === "semestral" && (
              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">Este período corresponde al informe semestral a SECO</span>
            )}
          </div>
        </CardContent>
      </Card>

      {renderReport()}
    </div>
  );
}
