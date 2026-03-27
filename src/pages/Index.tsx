import { useRole } from "@/contexts/RoleContext";
import DashboardEntidad from "@/components/dashboard/DashboardEntidad";
import DashboardMonitoreo from "@/components/dashboard/DashboardMonitoreo";
import DashboardAdministracion from "@/components/dashboard/DashboardAdministracion";
import DashboardDireccion from "@/components/dashboard/DashboardDireccion";

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
        />
      );

    case "coordinador_mec_b":
      return (
        <DashboardMonitoreo
          title="Dashboard Mecanismo B — Cadenas de Valor"
          subtitle="Coordinador MEC-B"
          filterFn={(e) => e.mecanismo === "B"}
        />
      );

    case "gestor_mec_a":
      return (
        <DashboardMonitoreo
          title="Dashboard Mecanismo A — Políticas Públicas"
          subtitle="Gestor MEC-A"
          filterFn={(e) => e.mecanismo === "A"}
        />
      );

    case "entidad":
    default:
      return <DashboardEntidad />;
  }
}
