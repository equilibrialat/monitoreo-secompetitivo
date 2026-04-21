import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
import { TrimestreSeleccionadoProvider } from "@/hooks/useTrimestreActivo";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import MisActividades from "./pages/MisActividades";
import NotFound from "./pages/NotFound";
import RegistroMensualPage from "./pages/RegistroMensualPage";
import AprobacionesPage from "./pages/AprobacionesPage";
import RevisionPendientePage from "./pages/RevisionPendientePage";
import IndicadoresImpactoPage from "./pages/IndicadoresImpactoPage";
import ReportesPage from "./pages/ReportesPage";
import ContratosPage from "./pages/ContratosPage";
import DesembolsosPage from "./pages/DesembolsosPage";
import ViaticosPage from "./pages/ViaticosPage";
import ReasignacionesPage from "./pages/ReasignacionesPage";
import NotificacionesPage from "./pages/NotificacionesPage";
import IndicadoresMonitoreoPage from "./pages/IndicadoresMonitoreoPage";
import VerificacionPage from "./pages/VerificacionPage";
import GenerarReportesPage from "./pages/GenerarReportesPage";
import ReportesFinancierosPage from "./pages/ReportesFinancierosPage";
import ReportesEjecutivosPage from "./pages/ReportesEjecutivosPage";
import ReportesMecBPage from "./pages/ReportesMecBPage";
import ReportesMecAPage from "./pages/ReportesMecAPage";
import ReportesRegionalesPage from "./pages/ReportesRegionalesPage";
import AdministracionPage from "./pages/AdministracionPage";
import MisIniciativasPage from "./pages/MisIniciativasPage";
import RegistroRapidoPage from "./pages/RegistroRapidoPage";
import GestionFinancieraPage from "./pages/GestionFinancieraPage";
import GestionContratosFinPage from "./pages/GestionContratosFinPage";
import PlanificacionTrimestralPage from "./pages/PlanificacionTrimestralPage";
import MiPlanificacionPage from "./pages/MiPlanificacionPage";
import EjecucionTecnicaPage from "./pages/EjecucionTecnicaPage";
import EjecucionPresupuestariaPage from "./pages/EjecucionPresupuestariaPage";
import RegistrarAvancePage from "./pages/RegistrarAvancePage";
import ReporteTrimestralPage from "./pages/ReporteTrimestralPage";
import BandejaReasignacionesPage from "./pages/BandejaReasignacionesPage";
import GestorDashboardPage from "./pages/mec-a/GestorDashboardPage";
import ClaudiaPanelPage from "./pages/mec-a/ClaudiaPanelPage";
import AvanceOperativoPage from "./pages/mec-a/AvanceOperativoPage";
import PresupuestoMecAPage from "./pages/mec-a/PresupuestoMecAPage";
import EntregablesGestorPage from "./pages/mec-a/EntregablesGestorPage";
import ComprobantesGestorPage from "./pages/mec-a/ComprobantesGestorPage";
import ContrapartidaMonetariaPage from "./pages/mec-a/ContrapartidaMonetariaPage";
import ContrapartidaNoMonetariaPage from "./pages/mec-a/ContrapartidaNoMonetariaPage";
import ConfiguracionAPEPage from "./pages/mec-a/ConfiguracionAPEPage";
import PagosPendientesMecAPage from "./pages/mec-a/PagosPendientesMecAPage";
import ReasignacionesMecAPage from "./pages/mec-a/ReasignacionesMecAPage";
import { useRole } from "@/contexts/RoleContext";
const queryClient = new QueryClient();

const AppRoutes = () => {
  const { role } = useRole();
  const isMecA = role === "gestor_iniciativa" || role === "gestor" || role === "asesora_politicas" || role === "administracion" || role === "entidad_mec_a";
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Index />} />

      {/* Entidad routes */}
      <Route path="/actividades" element={<Navigate to="/mi-planificacion" replace />} />
      <Route path="/mi-planificacion" element={<MiPlanificacionPage />} />
      <Route path="/ejecucion-tecnica" element={<EjecucionTecnicaPage />} />
      <Route path="/ejecucion-presupuestaria" element={<EjecucionPresupuestariaPage />} />
      <Route path="/registro-mensual" element={<RegistroMensualPage />} />
      <Route path="/registro-rapido" element={<RegistroRapidoPage />} />
      <Route path="/indicadores-impacto" element={<IndicadoresImpactoPage />} />
      <Route path="/avance-proyecto" element={<Navigate to="/mi-planificacion" replace />} />

      {/* Gestor routes */}
      <Route path="/mis-iniciativas" element={<MisIniciativasPage />} />
      <Route path="/planificacion-trimestral" element={<PlanificacionTrimestralPage />} />

      {/* Shared routes */}
      <Route path="/reportes" element={<ReportesPage />} />
      <Route path="/revision-pendiente" element={<RevisionPendientePage />} />
      <Route path="/notificaciones" element={<NotificacionesPage />} />

      {/* Monitoreo routes */}
      <Route path="/indicadores" element={<IndicadoresMonitoreoPage />} />
      <Route path="/verificacion" element={<VerificacionPage />} />
      <Route path="/generar-reportes" element={<GenerarReportesPage />} />

      {/* Administracion routes */}
      <Route path="/contratos" element={<ContratosPage />} />
      <Route path="/gestion-financiera" element={<GestionFinancieraPage />} />
      <Route path="/gestion-contratos" element={<GestionContratosFinPage />} />
      <Route path="/desembolsos" element={<DesembolsosPage />} />
      <Route path="/viaticos" element={<ViaticosPage />} />
      <Route path="/reasignaciones" element={<ReasignacionesPage />} />
      <Route path="/bandeja-reasignaciones" element={<BandejaReasignacionesPage />} />
      <Route path="/reportes-financieros" element={<ReportesFinancierosPage />} />

      {/* Direccion routes */}
      <Route path="/aprobaciones" element={<AprobacionesPage />} />
      <Route path="/reportes-ejecutivos" element={<ReportesEjecutivosPage />} />

      {/* Role-specific report routes */}
      <Route path="/reportes-mec-b" element={<ReportesMecBPage />} />
      <Route path="/reportes-mec-a" element={<ReportesMecAPage />} />
      <Route path="/reportes-regionales" element={<ReportesRegionalesPage />} />
      <Route path="/administracion" element={<AdministracionPage />} />

      {/* Rutas exclusivas Mecanismo A (aisladas) */}
      {isMecA && (
        <>
          <Route path="/mec-a/iniciativa/:id" element={<GestorDashboardPage />} />
          <Route path="/mec-a/iniciativa/:id/avance-operativo" element={<AvanceOperativoPage />} />
          <Route path="/mec-a/iniciativa/:id/presupuesto" element={<PresupuestoMecAPage />} />
          <Route path="/mec-a/iniciativa/:id/entregables" element={<EntregablesGestorPage />} />
          <Route path="/mec-a/iniciativa/:id/comprobantes" element={<ComprobantesGestorPage />} />
          <Route path="/mec-a/iniciativa/:id/contrapartida-monetaria" element={<ContrapartidaMonetariaPage />} />
          <Route path="/mec-a/iniciativa/:id/contrapartida-no-monetaria" element={<ContrapartidaNoMonetariaPage />} />
          <Route path="/mec-a/iniciativa/:id/configuracion" element={<ConfiguracionAPEPage />} />
          <Route path="/mec-a/iniciativa/:id/reasignaciones" element={<ReasignacionesMecAPage />} />
          
          <Route path="/mec-a/panel" element={<ClaudiaPanelPage />} />
          <Route path="/mec-a/pagos-pendientes" element={<PagosPendientesMecAPage />} />
          <Route path="/mec-a/reasignaciones" element={<ReasignacionesMecAPage />} />
        </>
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <TrimestreSeleccionadoProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
          </TrimestreSeleccionadoProvider>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
