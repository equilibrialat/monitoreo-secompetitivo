import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchActividadesByEntidad, type ActividadDB } from "@/lib/supabaseQueries";
import { RegistroMensualDialog } from "@/components/RegistroMensualDialog";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-warning/15 text-warning" },
  enviado: { label: "Enviado", className: "bg-primary/10 text-primary" },
  en_revision_tecnica: { label: "Rev. Técnica", className: "bg-warning/15 text-warning" },
  en_revision_financiera: { label: "Rev. Financiera", className: "bg-accent/15 text-accent-foreground" },
  en_revision_coordinador: { label: "Rev. Coordinador", className: "bg-primary/15 text-primary" },
  aprobado: { label: "Aprobado", className: "bg-emerald-500/15 text-emerald-700" },
  observado: { label: "Observado", className: "bg-destructive/15 text-destructive" },
};

interface RegistroStatus {
  actividad_id: string;
  estado_registro: string | null;
  observaciones_revision: string | null;
  id: string;
}

export default function RegistroMensualPage() {
  const { entidadId } = useRole();
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [actividades, setActividades] = useState<ActividadDB[]>([]);
  const [registros, setRegistros] = useState<RegistroStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActividad, setSelectedActividad] = useState<ActividadDB | null>(null);

  useEffect(() => {
    if (!entidadId) return;
    loadData();
  }, [entidadId, mes, anio]);

  async function loadData() {
    setLoading(true);
    const [acts, regsResult] = await Promise.all([
      fetchActividadesByEntidad(entidadId!),
      (supabase as any)
        .from("registros_mensuales")
        .select("actividad_id, estado_registro, observaciones_revision, id")
        .eq("entidad_id", entidadId)
        .eq("mes", Number(mes))
        .eq("anio", Number(anio)),
    ]);
    setActividades(acts);
    setRegistros(regsResult.data || []);
    setLoading(false);
  }

  const registroMap = new Map<string, RegistroStatus>();
  for (const r of registros) {
    registroMap.set(r.actividad_id, r);
  }

  if (!entidadId) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Selecciona una entidad en el panel lateral.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro Mensual</h1>
          <p className="text-muted-foreground">Registra el avance mensual de cada actividad</p>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mes</label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Año</label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {registros.length} de {actividades.length} actividades con registro
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando actividades...
        </div>
      ) : (
        <div className="space-y-3">
          {actividades.map((act) => {
            const reg = registroMap.get(act.id);
            const estado = reg?.estado_registro;
            const badge = estado ? ESTADO_BADGE[estado] : null;
            const isObservado = estado === "observado";
            const isAprobado = estado === "aprobado";
            const isLocked = estado === "enviado" || estado === "en_revision_tecnica" || estado === "en_revision_financiera" || estado === "en_revision_coordinador";

            return (
              <Card
                key={act.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${isObservado ? "border-destructive/40" : ""} ${isAprobado ? "border-emerald-500/40" : ""}`}
                onClick={() => !isLocked && !isAprobado && setSelectedActividad(act)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{act.codigo}</span>
                        {badge ? (
                          <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-muted text-muted-foreground">Sin registro</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{act.nombre}</p>
                      {isObservado && reg?.observaciones_revision && (
                        <div className="mt-2 p-2 rounded bg-destructive/5 border border-destructive/20">
                          <p className="text-xs font-medium text-destructive mb-1">Observaciones de revisión:</p>
                          <p className="text-xs text-destructive">{reg.observaciones_revision}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{act.avance_operativo_pct}%</p>
                      <p className="text-[10px] text-muted-foreground">avance</p>
                      {isLocked && (
                        <p className="text-[10px] text-muted-foreground mt-1">🔒 En revisión</p>
                      )}
                      {isAprobado && (
                        <p className="text-[10px] text-emerald-600 mt-1">✅ Aprobado</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RegistroMensualDialog
        actividad={selectedActividad}
        open={!!selectedActividad}
        onClose={() => {
          setSelectedActividad(null);
          loadData();
        }}
      />
    </div>
  );
}
