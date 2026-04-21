import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import { useRole } from "@/contexts/RoleContext";
import { BarChart3, ClipboardCheck, Banknote, Users, ArrowRight, Calendar, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect } from "react";
import { fetchMecAEntregables, fetchMecAAvanceOperativo, MESES_LABELS } from "@/lib/mecA";

const ESTADO_COLORS: Record<string, string> = {
  activa: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cerrada: "bg-slate-100 text-slate-600 border-slate-200",
  suspendida: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function GestorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId, setIniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";
  useEffect(() => { if (id && id !== iniciativaId) setIniciativaId(id); }, [id]);

  const { iniciativa, actividades, arbol, loading } = useMecAIniciativa(resolvedId);
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();
  const [avanceMes, setAvanceMes] = useState<any[]>([]);
  const [entregables, setEntregables] = useState<any[]>([]);

  useEffect(() => {
    if (!resolvedId) return;
    Promise.all([
      fetchMecAAvanceOperativo(resolvedId, anioActual, mesActual),
      fetchMecAEntregables(resolvedId),
    ]).then(([av, ent]) => { setAvanceMes(av); setEntregables(ent); });
  }, [resolvedId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Cargando iniciativa…</p>
      </div>
    </div>
  );

  if (!iniciativa) return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          No se encontró la iniciativa. Verifica con tu asesora de políticas.
        </CardContent>
      </Card>
    </div>
  );

  const totalActs = actividades.length;
  const actsConAvanceMes = avanceMes.length;
  const actsPendientesMes = totalActs - actsConAvanceMes;
  const entsPendConformidad = entregables.filter(e => e.estado_producto === "pendiente" && e.plazo_entrega && new Date(e.plazo_entrega) < now);
  const entsConformesSinPago = entregables.filter(e => e.estado_producto === "conforme" && !e.fecha_pago);
  const secoTotal = actividades.reduce((s, a) => s + a.seco_honorarios_usd + a.seco_viaticos_usd + a.seco_servicios_usd + a.seco_materiales_usd, 0);
  const secoEjec = entregables.reduce((s, e) => s + (e.pago_usd ?? 0), 0);
  const BASE = `/mec-a/iniciativa/${resolvedId}`;

  const quickActions = [
    { title: "Avance Operativo", desc: `Registrar avance de ${MESES_LABELS[mesActual]} ${anioActual}`, icon: BarChart3, to: `${BASE}/avance-operativo`, color: "from-blue-500 to-blue-600", badge: actsPendientesMes > 0 ? `${actsPendientesMes} pendientes` : "Al día", ok: actsPendientesMes === 0 },
    { title: "Entregables de Consultores", desc: "Registrar conformidad de productos", icon: ClipboardCheck, to: `${BASE}/entregables`, color: "from-violet-500 to-violet-600", badge: entregables.filter(e => e.estado_producto === "pendiente").length > 0 ? `${entregables.filter(e => e.estado_producto === "pendiente").length} por revisar` : "Sin pendientes", ok: entregables.filter(e => e.estado_producto === "pendiente").length === 0 },
    { title: "Contrapartida Monetaria", desc: "Registrar pagos de la EPB", icon: Banknote, to: `${BASE}/contrapartida-monetaria`, color: "from-emerald-500 to-emerald-600", badge: "Registrar", ok: true },
    { title: "Contrapartida No Monetaria", desc: "Registrar horas de funcionarios", icon: Users, to: `${BASE}/contrapartida-no-monetaria`, color: "from-orange-500 to-orange-600", badge: "Registrar", ok: true },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">Mecanismo A — Política Pública</span>
              <Badge variant="outline" className={`text-[10px] capitalize ${ESTADO_COLORS[iniciativa.estado]}`}>{iniciativa.estado}</Badge>
            </div>
            <h1 className="text-xl font-bold">{iniciativa.nombre}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{iniciativa.epb_nombre}{iniciativa.epb_siglas && ` (${iniciativa.epb_siglas})`}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 rounded-lg px-3 py-2 border">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(iniciativa.fecha_inicio), "dd MMM yyyy", { locale: es })} → {format(new Date(iniciativa.fecha_fin), "dd MMM yyyy", { locale: es })}
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground"><span className="font-medium">Avance registrado — {MESES_LABELS[mesActual]} {anioActual}</span><span>{actsConAvanceMes}/{totalActs} actividades</span></div>
          <Progress value={totalActs > 0 ? (actsConAvanceMes / totalActs) * 100 : 0} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground"><span className="font-medium">Ejecución SECO</span><span>US$ {secoEjec.toLocaleString()} / US$ {secoTotal.toLocaleString()}</span></div>
          <Progress value={secoTotal > 0 ? (secoEjec / secoTotal) * 100 : 0} className="h-2" />
        </div>
      </div>

      {(entsPendConformidad.length > 0 || entsConformesSinPago.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {entsPendConformidad.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div><p className="text-sm font-medium text-amber-800">{entsPendConformidad.length} entregable(s) vencido(s)</p><p className="text-xs text-amber-600">Plazo cumplido sin conformidad</p></div>
            </div>
          )}
          {entsConformesSinPago.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-3">
              <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div><p className="text-sm font-medium text-blue-800">{entsConformesSinPago.length} entregable(s) en proceso de pago</p><p className="text-xs text-blue-600">Pendientes de pago SECO por Carmen</p></div>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ingreso de Datos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(qa => (
            <Link key={qa.to} to={qa.to} className="group block">
              <Card className="h-full hover:shadow-md transition-all duration-200 hover:border-primary/30 overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-1.5 bg-gradient-to-r ${qa.color}`} />
                  <div className="p-4 flex items-center gap-4">
                    <div className={`rounded-lg p-2.5 bg-gradient-to-br ${qa.color} text-white shrink-0`}><qa.icon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{qa.title}</p><p className="text-xs text-muted-foreground truncate">{qa.desc}</p></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${qa.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{qa.badge}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {arbol.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actividades del APE</h2>
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  {["Código","Descripción","Resultado","Meta","SECO USD",`Avance ${MESES_LABELS[mesActual]}`].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y">
                  {arbol.map(act => {
                    const avance = avanceMes.find(av => av.actividad_id === act.id);
                    const secoAct = act.seco_honorarios_usd + act.seco_viaticos_usd + act.seco_servicios_usd + act.seco_materiales_usd;
                    return (
                      <tr key={act.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-mono text-xs">{act.codigo}</td>
                        <td className="px-4 py-2.5 text-xs max-w-[200px]"><p className="line-clamp-2">{act.descripcion}</p></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{act.resultado?.numero}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono">{act.meta_total ?? "—"} {act.unidad_medida}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono">{secoAct > 0 ? `$${secoAct.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          {avance
                            ? <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">{avance.unidades_ejecut} {act.unidad_medida}</Badge>
                            : <Badge variant="outline" className="text-[10px]">Pendiente</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
