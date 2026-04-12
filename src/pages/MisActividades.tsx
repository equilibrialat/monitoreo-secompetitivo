import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, Loader2, ChevronRight, ChevronDown, DollarSign, TrendingUp, Wallet, Trophy, AlertTriangle, CalendarClock, FileCheck, Receipt } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchActividadesByEntidad, type ActividadDB } from "@/lib/supabaseQueries";
import { fetchRegistrosEntidad, type RegistroPendiente } from "@/lib/registroAprobacion";
import { RegistroMensualDialog } from "@/components/RegistroMensualDialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ResultadoDB {
  id: string;
  codigo: string;
  nombre: string;
  summary_presupuesto_usd: number;
  summary_ejecutado_usd: number;
  summary_saldo_usd: number;
}

function getSemaforoAvance(pct: number) {
  if (pct >= 66) return { color: "bg-success", text: "text-success", label: "En curso" };
  if (pct >= 35) return { color: "bg-warning", text: "text-warning", label: "Atención" };
  return { color: "bg-destructive", text: "text-destructive", label: "Crítico" };
}

function formatUSD(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

export default function MisActividades() {
  const { entidadId } = useRole();
  const [actividades, setActividades] = useState<ActividadDB[]>([]);
  const [registros, setRegistros] = useState<RegistroPendiente[]>([]);
  const [resultados, setResultados] = useState<ResultadoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActividad, setSelectedActividad] = useState<ActividadDB | null>(null);

  // Accordion state: only one open at each level
  const [openResultado, setOpenResultado] = useState<string | null>(null);
  const [openActividad, setOpenActividad] = useState<string | null>(null);

  useEffect(() => {
    if (!entidadId) {
      setActividades([]);
      setRegistros([]);
      setResultados([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchActividadesByEntidad(entidadId),
      fetchRegistrosEntidad(entidadId),
      (supabase as any).from("resultados").select("id, codigo, nombre, summary_presupuesto_usd, summary_ejecutado_usd, summary_saldo_usd").eq("entidad_id", entidadId).order("codigo"),
    ]).then(([acts, regs, resResult]) => {
      setActividades(acts);
      setRegistros(regs);
      setResultados((resResult.data || []).map((r: any) => ({
        ...r,
        summary_presupuesto_usd: r.summary_presupuesto_usd ?? 0,
        summary_ejecutado_usd: r.summary_ejecutado_usd ?? 0,
        summary_saldo_usd: r.summary_saldo_usd ?? 0,
      })));
      setLoading(false);
    });
  }, [entidadId]);

  // Group activities by resultado
  const actsByResultado = useMemo(() => {
    const map = new Map<string, ActividadDB[]>();
    actividades.forEach(a => {
      const key = a.resultado_codigo;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [actividades]);

  // Registros map for detail
  const registroMap = useMemo(() => {
    const m = new Map<string, RegistroPendiente>();
    for (const r of registros) {
      const existing = m.get(r.actividad_id);
      if (!existing || r.anio > existing.anio || (r.anio === existing.anio && r.mes > existing.mes)) {
        m.set(r.actividad_id, r);
      }
    }
    return m;
  }, [registros]);

  // Compute avg avance per resultado
  function getResultadoAvance(resCodigo: string): number {
    const acts = actsByResultado.get(resCodigo) || [];
    if (acts.length === 0) return 0;
    return Math.round(acts.reduce((s, a) => s + a.avance_operativo_pct, 0) / acts.length);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Actividades</h1>
          <p className="text-sm text-muted-foreground">Vista jerárquica: Resultado → Actividades → Detalle</p>
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
        </div>
      ) : (
        <div className="space-y-3">
          {resultados.map((res) => {
            const isOpen = openResultado === res.id;
            const avgAvance = getResultadoAvance(res.codigo);
            const semaforo = getSemaforoAvance(avgAvance);
            const acts = actsByResultado.get(res.codigo) || [];
            const financePct = res.summary_presupuesto_usd > 0
              ? Math.round((res.summary_ejecutado_usd / res.summary_presupuesto_usd) * 100)
              : 0;

            return (
              <div key={res.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {/* NIVEL 1 - BOSQUE: Resultado colapsado */}
                <button
                  onClick={() => {
                    setOpenResultado(isOpen ? null : res.id);
                    setOpenActividad(null);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <ChevronRight className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-90")} />
                  <div className={cn("h-3 w-3 rounded-full shrink-0", semaforo.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{res.codigo}</p>
                    <p className="text-sm font-semibold text-card-foreground leading-snug truncate">{res.nombre}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", semaforo.text)}>{avgAvance}%</p>
                      <p className="text-[10px] text-muted-foreground">Avance prom.</p>
                    </div>
                    <Badge className="text-xs" variant="secondary">{acts.length} act.</Badge>
                  </div>
                </button>

                {/* NIVEL 2 - PARCELA: Actividades + Panel financiero */}
                {isOpen && (
                  <div className="border-t">
                    {/* Panel financiero */}
                    <div className="bg-muted/20 px-4 py-3 border-b">
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Presupuesto</p>
                            <p className="text-sm font-bold text-foreground">{formatUSD(res.summary_presupuesto_usd)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ejecutado</p>
                            <p className="text-sm font-bold text-success">{formatUSD(res.summary_ejecutado_usd)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
                            <p className="text-sm font-bold text-warning">{formatUSD(res.summary_saldo_usd)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={financePct} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground">{financePct}%</span>
                      </div>
                    </div>

                    {/* Lista de actividades */}
                    <div className="divide-y">
                      {acts.map((act) => {
                        const isActOpen = openActividad === act.id;
                        const actSemaforo = getSemaforoAvance(act.avance_operativo_pct);
                        const reg = registroMap.get(act.id);

                        return (
                          <div key={act.id}>
                            <button
                              onClick={() => setOpenActividad(isActOpen ? null : act.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                            >
                              <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isActOpen && "rotate-90")} />
                              <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", actSemaforo.color)} />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-mono text-muted-foreground mr-2">{act.codigo}</span>
                                <span className="text-sm text-card-foreground">{act.nombre}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  Meta: {act.meta_valor} {act.meta_unidad_medida}
                                </span>
                                <span className={cn("text-sm font-bold", actSemaforo.text)}>{act.avance_operativo_pct}%</span>
                              </div>
                            </button>

                            {/* NIVEL 3 - ÁRBOL: Detalle completo */}
                            {isActOpen && (
                              <div className="px-6 pb-4 bg-muted/10 border-t">
                                <div className="py-3 space-y-4">
                                  {/* Avance operativo */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avance Operativo</h5>
                                    <div className="flex items-center gap-3">
                                      <Progress value={act.avance_operativo_pct} className="h-2.5 flex-1" />
                                      <span className={cn("text-sm font-bold", actSemaforo.text)}>{act.avance_operativo_pct}%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Meta: {act.meta_valor} {act.meta_unidad_medida} · Estado: {act.estado_actual?.replace(/_/g, ' ')}
                                    </p>
                                  </div>

                                  {/* Secciones narrativas colapsables */}
                                  {reg?.descripcion_avance && (
                                    <CollapsibleNarrative
                                      icon={<Trophy className="h-4 w-4 text-success" />}
                                      title="Logros del trimestre"
                                      content={reg.descripcion_avance}
                                    />
                                  )}
                                  {reg?.limitaciones && (
                                    <CollapsibleNarrative
                                      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
                                      title="Dificultades y limitaciones"
                                      content={reg.limitaciones}
                                    />
                                  )}
                                  {reg?.prioridades_proximo_mes && (
                                    <CollapsibleNarrative
                                      icon={<CalendarClock className="h-4 w-4 text-primary" />}
                                      title="Programado para el siguiente trimestre"
                                      content={reg.prioridades_proximo_mes}
                                    />
                                  )}

                                  {/* Ejecución financiera de la actividad */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ejecución Financiera</h5>
                                    <div className="grid grid-cols-3 gap-2">
                                      <FinanceCard label="SECO" executed={act.ejecutado_seco_acum} budget={act.presupuesto_seco} />
                                      <FinanceCard label="Contrap. Monet." executed={act.ejecutado_cm_acum} budget={act.presupuesto_contrapartida_monetaria} />
                                      <FinanceCard label="Contrap. No Monet." executed={act.ejecutado_cnm_acum} budget={act.presupuesto_contrapartida_no_monetaria} />
                                    </div>
                                  </div>

                                  {/* Pestañas Contratos y Gastos */}
                                  <ActividadContratosGastos actCodigo={act.codigo} entidadId={act.entidad_id} />

                                  {/* Último registro */}
                                  {reg && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Último Registro ({reg.mes}/{reg.anio})</h5>
                                      {reg.observaciones_revision?.startsWith("Sin reporte") ? (
                                        <Badge className="bg-destructive text-destructive-foreground text-xs">Sin reporte</Badge>
                                      ) : (
                                        <Card>
                                          <CardContent className="p-3 space-y-2 text-sm">
                                            {reg.descripcion_avance && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground">Logros:</p>
                                                <p className="text-card-foreground">{reg.descripcion_avance}</p>
                                              </div>
                                            )}
                                            {reg.observaciones_revision && (
                                              <div>
                                                <p className="text-xs font-medium text-destructive">Observaciones:</p>
                                                <p className="text-destructive/80">{reg.observaciones_revision}</p>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  )}

                                  {/* Botón registrar */}
                                  <button
                                    onClick={() => setSelectedActividad(act)}
                                    className="w-full py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                  >
                                    Registrar avance mensual
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

function CollapsibleNarrative({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
      >
        {icon}
        <span className="text-xs font-semibold text-card-foreground flex-1">{title}</span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
        </div>
      )}
    </div>
  );
}

function FinanceCard({ label, executed, budget }: { label: string; executed: number; budget: number }) {
  const pct = budget > 0 ? Math.round((executed / budget) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card p-2">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-xs font-bold text-foreground">{formatUSD(executed)} <span className="font-normal text-muted-foreground">/ {formatUSD(budget)}</span></p>
      <Progress value={pct} className="h-1.5 mt-1" />
    </div>
  );
}

function ActividadContratosGastos({ actCodigo, entidadId }: { actCodigo: string; entidadId: string }) {
  const [contratos, setContratos] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      (supabase as any).from("contratos").select("*").eq("entidad_id", entidadId).order("nombre_contratado"),
      (supabase as any).from("vouchers_gasto").select("*").eq("entidad_id", entidadId).eq("codigo_actividad", actCodigo).order("fecha"),
    ]).then(([cRes, vRes]) => {
      // Filter contratos: match by actividad_id or by objeto keyword if no actividad_id
      setContratos(cRes.data || []);
      setVouchers(vRes.data || []);
      setLoading(false);
    });
  }, [actCodigo, entidadId]);

  if (loading) return <p className="text-xs text-muted-foreground py-2">Cargando...</p>;

  const totalVouchersUSD = vouchers.reduce((s: number, v: any) => s + (v.monto_usd || 0), 0);
  const totalVouchersPEN = vouchers.reduce((s: number, v: any) => s + (v.monto_pen || 0), 0);

  return (
    <Tabs defaultValue="contratos" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-8">
        <TabsTrigger value="contratos" className="text-xs gap-1">
          <FileCheck className="h-3 w-3" /> Contratos
        </TabsTrigger>
        <TabsTrigger value="gastos" className="text-xs gap-1">
          <Receipt className="h-3 w-3" /> Gastos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contratos" className="mt-2">
        {contratos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sin contratos vinculados</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Consultor</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-right">Monto USD</TableHead>
                  <TableHead className="text-xs">Vencimiento</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c: any) => {
                  const vencido = c.estado === "en_proceso" && c.fecha_vencimiento_producto && new Date(c.fecha_vencimiento_producto) < new Date();
                  return (
                    <TableRow key={c.id} className={vencido ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs font-medium max-w-[140px] truncate">{c.nombre_contratado}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{c.producto_entregable ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{c.monto != null ? formatUSD(c.monto) : "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.fecha_vencimiento_producto ? (
                          <span className={vencido ? "text-destructive font-medium" : ""}>
                            {c.fecha_vencimiento_producto}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className={cn("h-2.5 w-2.5 rounded-full", vencido ? "bg-destructive" : c.estado === "finalizado" ? "bg-success" : "bg-warning")} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="gastos" className="mt-2">
        {vouchers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sin gastos registrados para {actCodigo}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Proveedor</TableHead>
                  <TableHead className="text-xs">Concepto</TableHead>
                  <TableHead className="text-xs text-right">USD</TableHead>
                  <TableHead className="text-xs text-right">PEN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs font-mono">{v.fecha ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{v.proveedor ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">{v.concepto ?? "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{v.monto_usd != null ? formatUSD(v.monto_usd) : "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">S/{(v.monto_pen ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={3} className="text-xs">Total</TableCell>
                  <TableCell className="text-xs text-right font-mono">{formatUSD(totalVouchersUSD)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">S/{totalVouchersPEN.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
