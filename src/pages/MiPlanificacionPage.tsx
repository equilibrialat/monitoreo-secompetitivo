import MiPlanificacion from "@/components/planificacion/MiPlanificacion";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { useRole } from "@/contexts/RoleContext";

export default function MiPlanificacionPage() {
  const { entidades, entidadId } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);

  return (
    <div>
      <Header title="Mi Planificación" subtitle={entidad?.nombre_corto} />
      <MiPlanificacion />
    </div>
  );
}
