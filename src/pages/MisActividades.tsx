import { useState, useEffect } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { fetchActividadesByEntidad, buildActivityTree, type ActividadDB } from "@/lib/supabaseQueries";
import { TreeBranch } from "@/components/TreeBranch";
import { RegistroMensualDialog } from "@/components/RegistroMensualDialog";

export default function MisActividades() {
  const { entidadId } = useRole();
  const [actividades, setActividades] = useState<ActividadDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActividad, setSelectedActividad] = useState<ActividadDB | null>(null);

  useEffect(() => {
    if (!entidadId) {
      setActividades([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchActividadesByEntidad(entidadId).then((data) => {
      setActividades(data);
      setLoading(false);
    });
  }, [entidadId]);

  const tree = buildActivityTree(actividades);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Actividades</h1>
          <p className="text-sm text-muted-foreground">
            Árbol de resultados
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Cargando actividades...</span>
        </div>
      ) : actividades.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No se encontraron actividades para esta entidad.</p>
          <p className="text-xs text-muted-foreground mt-1">Selecciona una entidad en el menú lateral.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map((node, i) => (
            <TreeBranch
              key={i}
              node={node}
              depth={0}
              defaultOpen
              onRegistrar={(act) => setSelectedActividad(act)}
            />
          ))}
        </div>
      )}

      <RegistroMensualDialog
        actividad={selectedActividad}
        open={!!selectedActividad}
        onClose={() => setSelectedActividad(null)}
      />
    </div>
  );
}
