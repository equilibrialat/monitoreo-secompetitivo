import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { MOCK_ACTIVIDADES, buildActivityTree } from "@/data/mockActividades";
import type { Actividad } from "@/data/mockActividades";
import { TreeBranch } from "@/components/TreeBranch";
import { RegistroMensualDialog } from "@/components/RegistroMensualDialog";

export default function MisActividades() {
  const tree = buildActivityTree(MOCK_ACTIVIDADES);
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Actividades</h1>
          <p className="text-sm text-muted-foreground">
            APPCACAO — Árbol de resultados
          </p>
        </div>
      </div>

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

      <RegistroMensualDialog
        actividad={selectedActividad}
        open={!!selectedActividad}
        onClose={() => setSelectedActividad(null)}
      />
    </div>
  );
}
