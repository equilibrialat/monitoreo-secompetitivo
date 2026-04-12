import { useRole } from "@/contexts/RoleContext";
import DashboardEntidad from "@/components/dashboard/DashboardEntidad";
import DashboardMonitoreoOld from "@/components/dashboard/DashboardMonitoreo";
import DashboardAdministracion from "@/components/dashboard/DashboardAdministracion";
import DashboardCadenasValor from "@/components/dashboard/DashboardCadenasValor";
import DashboardMonitoreoNew from "@/components/dashboard/DashboardMonitoreoNew";
import DashboardDireccionNew from "@/components/dashboard/DashboardDireccionNew";

export default function Index() {
  const { role } = useRole();

  switch (role) {
    case "monitoreo":
      return <DashboardMonitoreoNew />;

    case "administracion":
      return <DashboardAdministracion />;

    case "direccion":
      return <DashboardDireccionNew />;

    case "coordinador_regional":
      return (
        <DashboardMonitoreoOld
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
        <DashboardMonitoreoOld
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
      return <DashboardEntidad />;

    case "entidad_mec_a":
    case "entidad_mec_b":
    default:
      return <DashboardEntidad />;
  }
}
