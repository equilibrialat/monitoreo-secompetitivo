import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Index />} />

              {/* Entidad routes */}
              <Route path="/actividades" element={<MisActividades />} />
              <Route path="/registro-mensual" element={<RegistroMensualPage />} />
              <Route path="/registro-rapido" element={<RegistroRapidoPage />} />
              <Route path="/indicadores-impacto" element={<IndicadoresImpactoPage />} />

              {/* Gestor routes */}
              <Route path="/mis-iniciativas" element={<MisIniciativasPage />} />

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
              <Route path="/desembolsos" element={<DesembolsosPage />} />
              <Route path="/viaticos" element={<ViaticosPage />} />
              <Route path="/reasignaciones" element={<ReasignacionesPage />} />
              <Route path="/reportes-financieros" element={<ReportesFinancierosPage />} />

              {/* Direccion routes */}
              <Route path="/aprobaciones" element={<AprobacionesPage />} />
              <Route path="/reportes-ejecutivos" element={<ReportesEjecutivosPage />} />

              {/* Role-specific report routes */}
              <Route path="/reportes-mec-b" element={<ReportesMecBPage />} />
              <Route path="/reportes-mec-a" element={<ReportesMecAPage />} />
              <Route path="/reportes-regionales" element={<ReportesRegionalesPage />} />
              <Route path="/administracion" element={<AdministracionPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
