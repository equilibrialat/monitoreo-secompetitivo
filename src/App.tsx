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
import PlaceholderPage from "./pages/PlaceholderPage";
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
              <Route path="/registro-mensual" element={<PlaceholderPage title="Registro Mensual" />} />
              <Route path="/indicadores-impacto" element={<IndicadoresImpactoPage />} />

              {/* Shared routes */}
              <Route path="/reportes" element={<ReportesPage />} />
              <Route path="/revision-pendiente" element={<RevisionPendientePage />} />
              <Route path="/notificaciones" element={<NotificacionesPage />} />

              {/* Monitoreo routes */}
              <Route path="/indicadores" element={<PlaceholderPage title="Indicadores" />} />
              <Route path="/verificacion" element={<PlaceholderPage title="Verificación" />} />

              {/* Administracion routes */}
              <Route path="/contratos" element={<ContratosPage />} />
              <Route path="/desembolsos" element={<DesembolsosPage />} />
              <Route path="/viaticos" element={<ViaticosPage />} />
              <Route path="/reasignaciones" element={<ReasignacionesPage />} />

              {/* Direccion routes */}
              <Route path="/aprobaciones" element={<PlaceholderPage title="Aprobaciones" />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
