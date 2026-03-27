import { useRole } from "@/contexts/RoleContext";
import { SeccionRevision } from "@/components/dashboard/SeccionRevision";
import type { RegistroPendiente } from "@/lib/registroAprobacion";

const ROLE_CONFIG: Record<string, {
  title: string;
  estadoFiltro: string;
  estadoAprobar: string;
  labelAprobar: string;
  filterFn?: (r: RegistroPendiente) => boolean;
}> = {
  coordinador_regional: {
    title: "Revisión Pendiente — Coordinador Regional",
    estadoFiltro: "enviado",
    estadoAprobar: "en_revision_tecnica",
    labelAprobar: "Aprobar (→ Rev. Técnica)",
    // Coordinadores regionales ven AMBOS mecanismos de su región (no solo Mec B)
    filterFn: (r) => r.region !== "Nacional",
  },
  coordinador_cadenas: {
    title: "Revisión Pendiente — Cadenas de Valor (Mec B)",
    estadoFiltro: "enviado",
    estadoAprobar: "en_revision_tecnica",
    labelAprobar: "Aprobar (→ Rev. Técnica)",
    filterFn: (r) => r.mecanismo === "B",
  },
  asesora_politicas: {
    title: "Revisión Pendiente — Políticas Públicas (Mec A)",
    estadoFiltro: "enviado",
    estadoAprobar: "en_revision_tecnica",
    labelAprobar: "Aprobar (→ Rev. Técnica)",
    // Claudia ve solo Mec A (tanto nacionales directos como los que pasaron por coordinador regional)
    filterFn: (r) => r.mecanismo === "A",
  },
  monitoreo: {
    title: "Revisión Técnica Pendiente",
    estadoFiltro: "en_revision_tecnica",
    estadoAprobar: "en_revision_financiera",
    labelAprobar: "Aprobar (→ Rev. Financiera)",
  },
  administracion: {
    title: "Revisión Financiera Pendiente",
    estadoFiltro: "en_revision_financiera",
    estadoAprobar: "aprobado",
    labelAprobar: "Aprobar (Final)",
  },
};

export default function RevisionPendientePage() {
  const { role } = useRole();
  const config = ROLE_CONFIG[role];

  if (!config) {
    return <p className="p-6 text-muted-foreground">No tiene registros de revisión asignados para este rol.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{config.title}</h1>
      <SeccionRevision
        title={config.title}
        estadoFiltro={config.estadoFiltro}
        estadoAprobar={config.estadoAprobar}
        labelAprobar={config.labelAprobar}
        filterFn={config.filterFn}
      />
    </div>
  );
}
