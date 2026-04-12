import { useRole } from "@/contexts/RoleContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TramaFisicoFinanciera from "@/components/reportes/TramaFisicoFinanciera";
import IndicadoresImpactoReporte from "@/components/reportes/IndicadoresImpactoReporte";
import EstadoReportes from "@/components/reportes/EstadoReportes";
import AnalisisComparativo from "@/components/reportes/AnalisisComparativo";
import MisReportes from "@/components/reportes/MisReportes";

export default function ReportesPage() {
  const { role } = useRole();

  if (role === "entidad_mec_a" || role === "entidad_mec_b") {
    return <MisReportes />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground">Panel de análisis y seguimiento</p>
      </div>

      <Tabs defaultValue="trama" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="trama">Trama Físico-Financiera</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores de Impacto</TabsTrigger>
          <TabsTrigger value="estado">Estado de Reportes</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="trama"><TramaFisicoFinanciera /></TabsContent>
        <TabsContent value="indicadores"><IndicadoresImpactoReporte /></TabsContent>
        <TabsContent value="estado"><EstadoReportes /></TabsContent>
        <TabsContent value="analisis"><AnalisisComparativo /></TabsContent>
      </Tabs>
    </div>
  );
}
