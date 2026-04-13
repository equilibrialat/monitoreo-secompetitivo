import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntidadPlanStatus {
  entidadCodigo: string;
  entidadNombre: string;
  programadasEsteMes: number;
  reportadas: number;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function EstadoReportesCoordinador() {
  const { filteredEntidades } = useRole();
  const [planData, setPlanData] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  const currentYM = getCurrentYearMonth();
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      (supabase as any).from("planificacion_actividades").select("*").order("actividad_codigo"),
      (supabase as any)
        .from("registros_mensuales")
        .select("entidad_id, anio, mes, actividad_id, actividades!inner(codigo)")
        .eq("anio", anioActual)
        .eq("mes", mesActual),
    ]).then(([planRes, regRes]: any[]) => {
      setPlanData(planRes.data || []);
      setReportData(regRes.data || []);
      setLoading(false);
    });
  }, [anioActual, mesActual]);

  // Map entidad nombre_corto to entidad_codigo
  const entidadCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set("App Cacao", "APPCACAO");
    return map;
  }, []);

  const statuses: EntidadPlanStatus[] = useMemo(() => {
    return filteredEntidades.map((ent) => {
      const codigo = entidadCodeMap.get(ent.nombre_corto) || ent.nombre_corto;
      const entPlan = planData.filter((p: any) => p.entidad_codigo === codigo);

      const programadas = entPlan.filter((p: any) => {
        const meses: string[] = p.meses_programados || [];
        return meses.includes(currentYM);
      });

      const reportedCodes = new Set(
        reportData
          .filter((r: any) => r.entidad_id === ent.id)
          .map((r: any) => r.actividades?.codigo)
          .filter(Boolean)
      );

      const reportadas = programadas.filter((p: any) => reportedCodes.has(p.actividad_codigo)).length;

      return {
        entidadCodigo: codigo,
        entidadNombre: ent.nombre_corto,
        programadasEsteMes: programadas.length,
        reportadas,
      };
    });
  }, [filteredEntidades, planData, reportData, currentYM, entidadCodeMap]);

  // Only show if there are entities with planificacion data
  const hasPlanData = statuses.some((s) => planData.some((p: any) => p.entidad_codigo === s.entidadCodigo));
  if (!hasPlanData && !loading) return null;

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Estado de reportes — {monthNames[mesActual - 1]} {anioActual}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-2">
            {statuses.map((s) => {
              const hasPlan = planData.some((p: any) => p.entidad_codigo === s.entidadCodigo);
              if (!hasPlan) return null;

              const statusDot = s.programadasEsteMes === 0
                ? "bg-gray-400"
                : s.reportadas >= s.programadasEsteMes
                ? "bg-green-500"
                : "bg-red-500";

              const statusLabel = s.programadasEsteMes === 0
                ? "Sin entregables"
                : `${s.reportadas}/${s.programadasEsteMes}`;

              const isExpanded = expandedEntity === s.entidadCodigo;

              return (
                <div key={s.entidadCodigo} className="border rounded-lg">
                  <button
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedEntity(isExpanded ? null : s.entidadCodigo)}
                  >
                    <span className={cn("h-3 w-3 rounded-full shrink-0", statusDot)} />
                    <span className="text-sm font-medium flex-1">{s.entidadNombre}</span>
                    <span className="text-xs text-muted-foreground">
                      Programadas: {s.programadasEsteMes} | Reportadas: {statusLabel}
                    </span>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t">
                      <div className="space-y-1 mt-2">
                        {planData
                          .filter((p: any) => p.entidad_codigo === s.entidadCodigo)
                          .filter((p: any) => (p.meses_programados || []).includes(currentYM))
                          .map((p: any) => {
                            const reported = reportData.some(
                              (r: any) => r.entidad_id === filteredEntidades.find(e => entidadCodeMap.get(e.nombre_corto) === s.entidadCodigo)?.id
                                && r.actividades?.codigo === p.actividad_codigo
                            );
                            return (
                              <div key={p.id} className="flex items-center gap-2 text-sm py-1">
                                <span className={cn("h-2 w-2 rounded-full shrink-0", reported ? "bg-green-500" : "bg-yellow-500")} />
                                <span className="font-mono text-xs text-primary">{p.actividad_codigo}</span>
                                <span className="text-muted-foreground truncate">{p.actividad_descripcion}</span>
                                <Badge variant={reported ? "default" : "outline"} className="text-[9px] ml-auto shrink-0">
                                  {reported ? "Reportado" : "Pendiente"}
                                </Badge>
                              </div>
                            );
                          })}
                        {planData.filter((p: any) => p.entidad_codigo === s.entidadCodigo && (p.meses_programados || []).includes(currentYM)).length === 0 && (
                          <p className="text-xs text-muted-foreground py-2">No hay entregables programados para este mes.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
