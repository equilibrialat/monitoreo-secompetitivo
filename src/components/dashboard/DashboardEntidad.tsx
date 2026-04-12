import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRole } from "@/contexts/RoleContext";
import { useDashboardData, type DashboardEntidad as DashboardEntidadType } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Trophy, Zap, AlertTriangle as AlertIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardEntidad() {
  const { entidadId, entidades: entidadOptions } = useRole();
  const { data: entidades, isLoading } = useDashboardData();
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!entidadId) return;
    (supabase as any)
      .from("indicadores_proyecto")
      .select("*")
      .eq("entidad_id", entidadId)
      .order("codigo")
      .then(({ data }: any) => setIndicadores(data || []));
  }, [entidadId]);

  const ent = entidades?.find((e) => e.entidad_id === entidadId);

  if (isLoading) return <DashboardSkeleton />;

  if (!ent) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Selecciona una entidad en el panel lateral.
      </div>
    );
  }

  const avOp = ent.avance_operativo_promedio ?? 0;
  const avFin = ent.pct_ejecucion_seco;

  // Ranking: same mechanism entities
  const currentMecanismo = ent.mecanismo;
  const sameMecEntidades = (entidades || [])
    .filter(e => e.mecanismo === currentMecanismo)
    .sort((a, b) => (b.avance_operativo_promedio || 0) - (a.avance_operativo_promedio || 0));

  const myPosition = sameMecEntidades.findIndex(e => e.entidad_id === entidadId) + 1;
  const totalInMec = sameMecEntidades.length;
  const positionEmoji = myPosition <= 3 ? "🏆" : myPosition <= Math.ceil(totalInMec / 2) ? "💪" : "⚠️";

  return (
    <div>
      <Header title="Mi Dashboard" subtitle={ent.nombre_corto} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <ClickableKpiCard label="Actividades" value={`${ent.actividades_completadas}/${ent.total_actividades}`} sub="completadas" onClick={() => navigate("/mis-actividades")} />
        <KpiCard label="Avance Operativo" value={`${avOp}%`} sub="promedio" />
        <KpiCard label="Ejecución SECO" value={`${avFin}%`} sub={`USD ${fmt(ent.ejecutado_seco_total)} / ${fmt(ent.presupuesto_seco_total)}`} />
        <ClickableKpiCard label="Indicadores" value={String(indicadores.length)} sub="del Marco Lógico" onClick={() => navigate("/indicadores-impacto")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avance Operativo</CardTitle></CardHeader>
          <CardContent><Progress value={avOp} className="h-3" /><p className="text-xs text-muted-foreground mt-1">{avOp}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ejecución Financiera SECO</CardTitle></CardHeader>
          <CardContent><Progress value={avFin} className="h-3" /><p className="text-xs text-muted-foreground mt-1">{avFin}%</p></CardContent>
        </Card>
      </div>

      {/* Indicadores del Marco Lógico */}
      {indicadores.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Indicadores del Marco Lógico ({indicadores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Código</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Línea Base</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicadores.map((ind: any) => (
                    <TableRow key={ind.id}>
                      <TableCell className="font-mono text-xs">{ind.codigo}</TableCell>
                      <TableCell className="text-sm">{ind.nombre}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{ind.nivel}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ind.unidad_medida || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{ind.linea_base ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{ind.meta ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Section */}
      {sameMecEntidades.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📊 ¿Cómo vas respecto a las demás entidades de tu mecanismo?
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {positionEmoji} Estás en la posición <strong>{myPosition}</strong> de <strong>{totalInMec}</strong> entidades del Mecanismo {currentMecanismo}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Pos.</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead className="text-right">Avance Operativo</TableHead>
                    <TableHead className="text-right">Ejecución SECO</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sameMecEntidades.map((e, i) => {
                    const isMe = e.entidad_id === entidadId;
                    const desfase = Math.abs((e.avance_operativo_promedio || 0) - e.pct_ejecucion_seco);
                    const statusColor = desfase < 15 ? "bg-emerald-500" : desfase < 30 ? "bg-amber-500" : "bg-destructive";
                    return (
                      <TableRow key={e.entidad_id} className={isMe ? "bg-primary/10 font-semibold" : ""}>
                        <TableCell className="font-mono text-center">
                          {i + 1 <= 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {e.nombre_corto}
                            {isMe && <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary">Tú</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{e.avance_operativo_promedio ?? 0}%</TableCell>
                        <TableCell className="text-right font-mono">{e.pct_ejecucion_seco}%</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${statusColor}`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Shared sub-components used across dashboards ---

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 md:mb-6">
      <div className="flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 shrink-0">
        <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ClickableKpiCard({ label, value, sub, onClick, className }: { label: string; value: string; sub?: string; onClick: () => void; className?: string }) {
  return (
    <Card className={`cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group ${className || ""}`} onClick={onClick}>
      <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        <p className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1">Ver detalle →</p>
      </CardContent>
    </Card>
  );
}

export function Semaforo({ desfase }: { desfase: number }) {
  const abs = Math.abs(desfase);
  const color = abs < 15 ? "bg-green-500" : abs < 30 ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} title={`Desfase: ${desfase}%`} />;
}

export function MecanismoBadge({ mec }: { mec: string }) {
  const isA = mec === "A" || mec === "mec_a";
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold border ${
      isA
        ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
        : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
    }`}>
      Mec. {isA ? "A" : "B"}
    </span>
  );
}

export function fmt(n: number) {
  return n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}><CardContent className="pt-5 pb-4"><div className="h-2 w-20 rounded bg-muted mb-3" /><div className="h-8 w-16 rounded bg-muted" /></CardContent></Card>
      ))}
    </div>
  );
}
