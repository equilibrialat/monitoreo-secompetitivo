import MiEjecucionTecnica from "@/components/planificacion/MiEjecucionTecnica";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { useRole } from "@/contexts/RoleContext";

export default function EjecucionTecnicaPage() {
  const { entidades, entidadId } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);

  return (
    <div>
      <Header title="Mi Ejecución Técnica" subtitle={entidad?.nombre_corto} />
      <MiEjecucionTecnica />
    </div>
  );
}
