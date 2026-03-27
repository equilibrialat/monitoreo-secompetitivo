import { useRole } from "@/contexts/RoleContext";
import DashboardEntidad from "@/components/dashboard/DashboardEntidad";
import DashboardMonitoreo from "@/components/dashboard/DashboardMonitoreo";
import DashboardAdministracion from "@/components/dashboard/DashboardAdministracion";
import DashboardDireccion from "@/components/dashboard/DashboardDireccion";
import DashboardCadenasValor from "@/components/dashboard/DashboardCadenasValor";

export default function Index() {
  const { role } = useRole();

  switch (role) {
    case "monitoreo":
      return <DashboardMonitoreo />;

    case "administracion":
      return <DashboardAdministracion />;

    case "direccion":
      return <DashboardDireccion />;

    case "coordinador_regional":
      return (
        <DashboardMonitoreo
          title="Dashboard Regional"
          subtitle="Coordinador Regional"
          filterFn={(e) => e.region !== "Nacional"}
          reviewEstado="enviado"
          reviewNextEstado="en_revision_tecnica"
          reviewTitle="Revisión Pendiente"
          reviewLabel="Aprobar (→ Rev. Técnica)"
          reviewFilterFn={(r) => r.region !== "Nacional"}
        />
      );

    case "coordinador_cadenas":
      return <DashboardCadenasValor />;

    case "asesora_politicas":
      return (
        <DashboardMonitoreo
          title="Dashboard Políticas Públicas (Mec A)"
          subtitle="Asesora Políticas Públicas"
          filterFn={(e) => e.mecanismo === "A"}
          reviewEstado="enviado"
          reviewNextEstado="en_revision_tecnica"
          reviewTitle="Revisión Pendiente"
          reviewLabel="Aprobar (→ Rev. Técnica)"
          reviewFilterFn={(r) => r.mecanismo === "A"}
        />
      );

    case "gestor":
      // Gestor sees entity dashboard for their assigned entities
      return <DashboardEntidad />;

    case "entidad":
    default:
      return <DashboardEntidad />;
  }
}
