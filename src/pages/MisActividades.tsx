import { useState, useEffect } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchActividadesByEntidad, buildActivityTree, type ActividadDB } from "@/lib/supabaseQueries";
import { fetchRegistrosEntidad, type RegistroPendiente } from "@/lib/registroAprobacion";
import { TreeBranch } from "@/components/TreeBranch";
import { RegistroMensualDialog } from "@/components/RegistroMensualDialog";
import MapaMarcoLogico from "@/components/reportes/MapaMarcoLogico";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface IndicadorMin {
  codigo: string;
  nombre: string;
  meta: number | null;
  linea_base: number | null;
}

export default function MisActividades() {
  const { entidadId } = useRole();
  const [actividades, setActividades] = useState<ActividadDB[]>([]);
  const [registros, setRegistros] = useState<RegistroPendiente[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActividad, setSelectedActividad] = useState<ActividadDB | null>(null);

  useEffect(() => {
    if (!entidadId) {
      setActividades([]);
      setRegistros([]);
      setIndicadores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchActividadesByEntidad(entidadId),
      fetchRegistrosEntidad(entidadId),
      (supabase as any).from("indicadores_proyecto").select("codigo, nombre, meta, linea_base").eq("entidad_id", entidadId),
    ]).then(([acts, regs, indResult]) => {
      setActividades(acts);
      setRegistros(regs);
      setIndicadores(indResult.data || []);
      setLoading(false);
    });
  }, [entidadId]);

  const tree = buildActivityTree(actividades);

  // Build a map: actividad_id -> latest registro
  const registroMap = new Map<string, RegistroPendiente>();
  for (const r of registros) {
    const existing = registroMap.get(r.actividad_id);
    if (!existing || r.anio > existing.anio || (r.anio === existing.anio && r.mes > existing.mes)) {
      registroMap.set(r.actividad_id, r);
    }
  }

  // Current month status map
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthStatusMap = new Map<string, string | null>();
  for (const act of actividades) {
    const reg = registros.find(
      (r) => r.actividad_id === act.id && r.anio === currentYear && r.mes === currentMonth
    );
    currentMonthStatusMap.set(act.id, reg?.estado_registro ?? null);
  }

  // Observados
  const observados = registros.filter((r) => r.estado_registro === "observado");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Actividades</h1>
          <p className="text-sm text-muted-foreground">Árbol de resultados</p>
        </div>
      </div>

      {/* Observados alerts */}
      {observados.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Registros Observados
          </h2>
          {observados.map((r) => (
            <div key={r.id} className="rounded-md border-2 border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-muted-foreground">{r.actividad_codigo}</span>
                <span className="font-medium">{r.actividad_nombre}</span>
                <Badge variant="destructive" className="text-[10px]">Observado</Badge>
              </div>
              {r.observaciones_revision && (
                <p className="text-xs text-destructive/80 italic">"{r.observaciones_revision}"</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Puedes corregir y volver a enviar desde "Registrar avance".
              </p>
            </div>
          ))}
        </div>
      )}

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
              registroMap={registroMap}
              currentMonthStatusMap={currentMonthStatusMap}
              indicadores={indicadores}
            />
          ))}
        </div>
      )}

      <RegistroMensualDialog
        actividad={selectedActividad}
        open={!!selectedActividad}
        onClose={() => {
          setSelectedActividad(null);
          if (entidadId) {
            fetchRegistrosEntidad(entidadId).then(setRegistros);
          }
        }}
      />
    </div>
  );
}
