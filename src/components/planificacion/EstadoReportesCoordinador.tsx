import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { ClipboardCheck, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentYearMonth, calcEstado, formatYM, ESTADO_CONFIG } from "./MiPlanificacion";

interface EntidadPlanStatus {
  entidadCodigo: string;
  entidadNombre: string;
  programadasEsteMes: number;
  reportadas: number;
  conRezago: number;
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
        .select("entidad_id, anio, mes, avance_valor, estado_registro, actividad_id, actividades!inner(codigo)")
        .eq("anio", anioActual)
        .eq("mes", mesActual),
    ]).then(([planRes, regRes]: any[]) => {
      setPlanData(planRes.data || []);
      setReportData(regRes.data || []);
      setLoading(false);
    });
  }, [anioActual, mesActual]);

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

      const conRezago = entPlan.filter((p: any) => {
        const meses: string[] = p.meses_programados || [];
        return meses.some((m: string) => m < currentYM && !reportedCodes.has(p.actividad_codigo));
      }).length;

      return { entidadCodigo: codigo, entidadNombre: ent.nombre_corto, programadasEsteMes: programadas.length, reportadas, conRezago };
    });
  }, [filteredEntidades, planData, reportData, currentYM, entidadCodeMap]);

  const hasPlanData = statuses.some((s) => planData.some((p: any) => p.entidad_codigo === s.entidadCodigo));
  if (!hasPlanData && !loading) return null;

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Seguimiento de compromisos — {monthNames[mesActual - 1]} {anioActual}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 font-medium text-muted-foreground">Entidad</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Activ. programadas</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Reportadas</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Rezago</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {statuses.filter(s => planData.some((p: any) => p.entidad_codigo === s.entidadCodigo)).map((s) => {
                  const dotColor = s.programadasEsteMes === 0
                    ? "bg-gray-400"
                    : s.conRezago > 0
                    ? "bg-red-500"
                    : s.reportadas >= s.programadasEsteMes
                    ? "bg-green-500"
                    : "bg-yellow-500";

                  const statusLabel = s.programadasEsteMes === 0
                    ? "Sin entregables este mes"
                    : s.conRezago > 0
                    ? `${s.conRezago} con rezago`
                    : s.reportadas >= s.programadasEsteMes
                    ? "Al día"
                    : "Pendiente";

                  const isExpanded = expandedEntity === s.entidadCodigo;

                  return (
                    <tr key={s.entidadCodigo} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedEntity(isExpanded ? null : s.entidadCodigo)}>
                      <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        {s.entidadNombre}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{s.programadasEsteMes}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{s.reportadas}/{s.programadasEsteMes}</td>
                      <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">{statusLabel}</td>
                      <td className="py-2.5 px-3 text-center"><span className={cn("inline-block h-3 w-3 rounded-full", dotColor)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {expandedEntity && (
              <div className="border-t mt-2 pt-2 space-y-1">
                {planData
                  .filter((p: any) => p.entidad_codigo === expandedEntity)
                  .map((p: any) => {
                    const meses: string[] = p.meses_programados || [];
                    const isThisMonth = meses.includes(currentYM);
                    const hasPast = meses.some((m: string) => m < currentYM);
                    const reported = reportData.some(
                      (r: any) => r.entidad_id === filteredEntidades.find(e => entidadCodeMap.get(e.nombre_corto) === expandedEntity)?.id
                        && r.actividades?.codigo === p.actividad_codigo
                    );
                    const dotColor = reported ? "bg-green-500" : isThisMonth ? "bg-yellow-500" : hasPast ? "bg-red-500" : "bg-blue-500";

                    return (
                      <div key={p.id} className="flex items-center gap-2 text-sm py-1 px-3">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
                        <span className="font-mono text-xs text-primary">{p.actividad_codigo}</span>
                        <span className="text-muted-foreground truncate flex-1">{p.actividad_descripcion}</span>
                        <Badge variant={reported ? "default" : "outline"} className="text-[9px] shrink-0">
                          {reported ? "Reportado" : isThisMonth ? "Pendiente" : hasPast ? "Rezago" : "Futuro"}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}