import MiEjecucionPresupuestaria from "@/components/planificacion/MiEjecucionPresupuestaria";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { useRole } from "@/contexts/RoleContext";

export default function EjecucionPresupuestariaPage() {
  const { entidades, entidadId } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);

  return (
    <div>
      <Header title="Mi Ejecución Presupuestaria" subtitle={entidad?.nombre_corto} />
      <MiEjecucionPresupuestaria />
    </div>
  );
}
