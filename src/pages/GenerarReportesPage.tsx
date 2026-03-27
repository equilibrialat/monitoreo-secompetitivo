import { useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Download, Eye } from "lucide-react";
import ReporteMensualPreview from "@/components/reportes/ReporteMensualPreview";
import ReporteTrimestralCompleto from "@/components/reportes/ReporteTrimestralCompleto";
import ReporteSemestral from "@/components/reportes/ReporteSemestral";
import ReporteAnual from "@/components/reportes/ReporteAnual";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ANIOS = [2024, 2025, 2026];
const TRIMESTRES = [
  { value: "T1", label: "T1 (Ene-Mar)", meses: [1, 2, 3] },
  { value: "T2", label: "T2 (Abr-Jun)", meses: [4, 5, 6] },
  { value: "T3", label: "T3 (Jul-Sep)", meses: [7, 8, 9] },
  { value: "T4", label: "T4 (Oct-Dic)", meses: [10, 11, 12] },
];
const SEMESTRES = [
  { value: "S1", label: "S1 (Ene-Jun)", meses: [1, 2, 3, 4, 5, 6] },
  { value: "S2", label: "S2 (Jul-Dic)", meses: [7, 8, 9, 10, 11, 12] },
];

export default function GenerarReportesPage() {
  const { role, entidadId, entidades } = useRole();
  const isMonitoreo = role === "monitoreo" || role === "direccion" || role === "administracion";

  const [selectedEntidadForReport, setSelectedEntidadForReport] = useState<string>(entidadId || "consolidado");
  const [activeReport, setActiveReport] = useState<string | null>(null);

  // Monthly
  const [mesMensual, setMesMensual] = useState<string>("1");
  const [anioMensual, setAnioMensual] = useState<string>("2025");

  // Quarterly
  const [trimestre, setTrimestre] = useState<string>("T1");
  const [anioTrimestral, setAnioTrimestral] = useState<string>("2025");

  // Semester
  const [semestre, setSemestre] = useState<string>("S1");
  const [anioSemestral, setAnioSemestral] = useState<string>("2025");

  // Annual
  const [anioAnual, setAnioAnual] = useState<string>("2025");

  const effectiveEntidadId = isMonitoreo ? selectedEntidadForReport : entidadId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generar Reportes</h1>
          <p className="text-muted-foreground">Genera y descarga reportes del programa</p>
        </div>
      </div>

      {isMonitoreo && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Entidad</label>
              <Select value={selectedEntidadForReport} onValueChange={setSelectedEntidadForReport}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidado">📊 Consolidado todas las entidades</SelectItem>
                  {entidades.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Monthly Report Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline">Anexo 2/7</Badge>
              Reporte Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={mesMensual} onValueChange={setMesMensual}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anioMensual} onValueChange={setAnioMensual}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setActiveReport("mensual")}>
              <Eye className="h-4 w-4 mr-2" /> Vista previa
            </Button>
          </CardContent>
        </Card>

        {/* Quarterly Complete Report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline">Anexo 8/9</Badge>
              Reporte Trimestral Completo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIMESTRES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anioTrimestral} onValueChange={setAnioTrimestral}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setActiveReport("trimestral")}>
              <Eye className="h-4 w-4 mr-2" /> Vista previa
            </Button>
          </CardContent>
        </Card>

        {/* Semester */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reporte Semestral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={semestre} onValueChange={setSemestre}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTRES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anioSemestral} onValueChange={setAnioSemestral}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setActiveReport("semestral")}>
              <Eye className="h-4 w-4 mr-2" /> Vista previa
            </Button>
          </CardContent>
        </Card>

        {/* Annual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline">Anexo 4/10</Badge>
              Reporte Anual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={anioAnual} onValueChange={setAnioAnual}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIOS.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => setActiveReport("anual")}>
              <Eye className="h-4 w-4 mr-2" /> Vista previa
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview Area */}
      {activeReport === "mensual" && (
        <ReporteMensualPreview
          entidadId={effectiveEntidadId}
          mes={parseInt(mesMensual)}
          anio={parseInt(anioMensual)}
          entidades={entidades}
          onClose={() => setActiveReport(null)}
        />
      )}
      {activeReport === "trimestral-operativo" && (
        <ReporteTrimestralOperativo
          entidadId={effectiveEntidadId}
          trimestre={trimestre}
          anio={parseInt(anioTrimestral)}
          entidades={entidades}
          onClose={() => setActiveReport(null)}
        />
      )}
      {activeReport === "trimestral-financiero" && (
        <ReporteTrimestralFinanciero
          entidadId={effectiveEntidadId}
          trimestre={trimestre}
          anio={parseInt(anioTrimestral)}
          entidades={entidades}
          onClose={() => setActiveReport(null)}
        />
      )}
      {activeReport === "semestral" && (
        <ReporteSemestral
          entidadId={effectiveEntidadId}
          semestre={semestre}
          anio={parseInt(anioSemestral)}
          entidades={entidades}
          onClose={() => setActiveReport(null)}
        />
      )}
      {activeReport === "anual" && (
        <ReporteAnual
          entidadId={effectiveEntidadId}
          anio={parseInt(anioAnual)}
          entidades={entidades}
          onClose={() => setActiveReport(null)}
        />
      )}
    </div>
  );
}
