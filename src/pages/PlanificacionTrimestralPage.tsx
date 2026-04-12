import { useState, useEffect, useMemo, useCallback } from "react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlanTrimestral, guardarBorradorPlan, enviarPropuestaPlan, resolverDisputa, getTrimesterMonths, getTrimesterFromMonth, getTrimesterMonthNumbers, type PlanTrimestral, type PlanEstado } from "@/lib/planTrimestral";
import { useTrimestreActivo } from "@/hooks/useTrimestreActivo";
import type { ActividadDB } from "@/lib/supabaseQueries";
import { fetchActividadesByEntidad } from "@/lib/supabaseQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Loader2, Save, Send, Calendar, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlanRow {
  actividad: ActividadDB;
  plan: PlanTrimestral | null;
  meta_mes_1: number;
  meta_mes_2: number;
  meta_mes_3: number;
}

export default function PlanificacionTrimestralPage() {
  const { entidadId, filteredEntidades } = useRole();
  const { activo: trimestreActivo } = useTrimestreActivo();
  const now = new Date();
  const [selectedEntidad, setSelectedEntidad] = useState<string | null>(null);
  const [trimestre, setTrimestre] = useState(trimestreActivo?.trimestre ?? getTrimesterFromMonth(now.getMonth() + 1));
  const [anio, setAnio] = useState(trimestreActivo?.anio ?? now.getFullYear());
  const [actividades, setActividades] = useState<ActividadDB[]>([]);
  const [plans, setPlans] = useState<PlanTrimestral[]>([]);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [disputeComment, setDisputeComment] = useState("");
  const [showDisputeResolve, setShowDisputeResolve] = useState(false);

  const mecBEntidades = useMemo(() =>
    filteredEntidades.filter(e => e.mecanismo === "B" || e.mecanismo === "mec_b"),
    [filteredEntidades]
  );

  useEffect(() => {
    if (mecBEntidades.length > 0 && !selectedEntidad) {
      setSelectedEntidad(mecBEntidades[0].id);
    }
  }, [mecBEntidades]);

  const selectedEntidadData = mecBEntidades.find(e => e.id === selectedEntidad);
  const monthNames = getTrimesterMonths(trimestre);
  const monthNumbers = getTrimesterMonthNumbers(trimestre);

  const loadData = useCallback(async () => {
    if (!selectedEntidad) return;
    setLoading(true);
    const [acts, planData] = await Promise.all([
      fetchActividadesByEntidad(selectedEntidad),
      fetchPlanTrimestral(selectedEntidad, trimestre, anio),
    ]);
    setActividades(acts);
    setPlans(planData);

    const planMap = new Map(planData.map(p => [p.actividad_id, p]));
    setRows(acts.map(act => {
      const plan = planMap.get(act.id) || null;
      return {
        actividad: act,
        plan,
        meta_mes_1: plan?.meta_mes_1 || 0,
        meta_mes_2: plan?.meta_mes_2 || 0,
        meta_mes_3: plan?.meta_mes_3 || 0,
      };
    }));
    setLoading(false);
  }, [selectedEntidad, trimestre, anio]);

  useEffect(() => { loadData(); }, [loadData]);

  const planStatus: PlanEstado | null = plans.length > 0 ? plans[0].estado as PlanEstado : null;
  const hasDispute = planStatus === "en_disputa";
  const isApproved = planStatus === "aprobada";
  const entityComment = plans[0]?.comentario_entidad;

  const updateRow = (index: number, field: "meta_mes_1" | "meta_mes_2" | "meta_mes_3", value: number) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSaveDraft = async () => {
    if (!selectedEntidad) return;
    setSaving(true);
    const result = await guardarBorradorPlan(
      rows.map(r => ({
        entidad_id: selectedEntidad,
        actividad_id: r.actividad.id,
        trimestre,
        anio,
        meta_mes_1: r.meta_mes_1,
        meta_mes_2: r.meta_mes_2,
        meta_mes_3: r.meta_mes_3,
        meta_trimestral: r.actividad.meta_valor || 0,
      }))
    );
    setSaving(false);
    if (result.success) {
      toast.success("Borrador guardado");
      loadData();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  const handleSendProposal = async () => {
    if (!selectedEntidad || !selectedEntidadData) return;
    // Save first, then send
    setSending(true);
    const saveResult = await guardarBorradorPlan(
      rows.map(r => ({
        entidad_id: selectedEntidad,
        actividad_id: r.actividad.id,
        trimestre,
        anio,
        meta_mes_1: r.meta_mes_1,
        meta_mes_2: r.meta_mes_2,
        meta_mes_3: r.meta_mes_3,
        meta_trimestral: r.actividad.meta_valor || 0,
      }))
    );
    if (!saveResult.success) {
      setSending(false);
      toast.error("Error al guardar", { description: saveResult.error });
      return;
    }
    const result = await enviarPropuestaPlan(selectedEntidad, trimestre, anio, selectedEntidadData.nombre_corto);
    setSending(false);
    if (result.success) {
      toast.success("Propuesta enviada a la entidad");
      loadData();
    } else {
      toast.error("Error al enviar", { description: result.error });
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedEntidad) return;
    setSending(true);
    // Save updated values first
    await guardarBorradorPlan(
      rows.map(r => ({
        entidad_id: selectedEntidad,
        actividad_id: r.actividad.id,
        trimestre,
        anio,
        meta_mes_1: r.meta_mes_1,
        meta_mes_2: r.meta_mes_2,
        meta_mes_3: r.meta_mes_3,
        meta_trimestral: r.actividad.meta_valor || 0,
      }))
    );
    const result = await resolverDisputa(selectedEntidad, trimestre, anio, disputeComment);
    setSending(false);
    if (result.success) {
      toast.success("Disputa resuelta — plan aprobado");
      setDisputeComment("");
      setShowDisputeResolve(false);
      loadData();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planificación Trimestral</h1>
          <p className="text-sm text-muted-foreground">Distribuye las metas trimestrales por mes para cada actividad</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={selectedEntidad || ""} onValueChange={setSelectedEntidad}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Seleccionar entidad" />
          </SelectTrigger>
          <SelectContent>
            {mecBEntidades.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nombre_corto}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(trimestre)} onValueChange={(v) => setTrimestre(Number(v))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map(t => (
              <SelectItem key={t} value={String(t)}>
                Trimestre {t} — {getTrimesterMonths(t).join(" / ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {planStatus && (
          <Badge className={cn(
            "self-center text-xs",
            planStatus === "borrador" ? "bg-muted text-muted-foreground" :
            planStatus === "propuesta_coordinador" ? "bg-warning/15 text-warning" :
            planStatus === "en_disputa" ? "bg-destructive/15 text-destructive" :
            "bg-success/15 text-success"
          )}>
            {planStatus === "borrador" ? "Borrador" :
             planStatus === "propuesta_coordinador" ? "Propuesta enviada" :
             planStatus === "en_disputa" ? "En disputa" :
             "Aprobada"}
          </Badge>
        )}
      </div>

      {/* Dispute banner */}
      {hasDispute && entityComment && (
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">Comentario de la entidad:</p>
                <p className="text-sm text-destructive/80 italic">"{entityComment}"</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => setShowDisputeResolve(true)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Resolver disputa
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showDisputeResolve && (
        <Card className="mb-4 border-primary/40">
          <CardContent className="pt-4 pb-3 space-y-3">
            <p className="text-sm font-medium text-foreground">Puedes ajustar los valores mensuales arriba y luego confirmar:</p>
            <Textarea
              placeholder="Comentario de respuesta (opcional)"
              value={disputeComment}
              onChange={(e) => setDisputeComment(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleResolveDispute} disabled={sending}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Confirmar y aprobar plan
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDisputeResolve(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No hay actividades para esta entidad.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {selectedEntidadData?.nombre_corto} — T{trimestre} {anio} ({monthNames.join(" / ")})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[200px]">Actividad</TableHead>
                    <TableHead className="text-xs text-center w-[80px]">Unidad</TableHead>
                    <TableHead className="text-xs text-center w-[100px]">Meta Trim.</TableHead>
                    <TableHead className="text-xs text-center w-[100px]">{monthNames[0]}</TableHead>
                    <TableHead className="text-xs text-center w-[100px]">{monthNames[1]}</TableHead>
                    <TableHead className="text-xs text-center w-[100px]">{monthNames[2]}</TableHead>
                    <TableHead className="text-xs text-center w-[80px]">Total</TableHead>
                    <TableHead className="text-xs text-center w-[60px]">∆</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const total = row.meta_mes_1 + row.meta_mes_2 + row.meta_mes_3;
                    const metaTrim = row.actividad.meta_valor || 0;
                    const delta = total - metaTrim;
                    const isEditable = !isApproved;

                    return (
                      <TableRow key={row.actividad.id}>
                        <TableCell>
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">{row.actividad.codigo}</p>
                            <p className="text-xs font-medium text-foreground leading-snug">{row.actividad.nombre}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs text-muted-foreground">{row.actividad.meta_unidad_medida || "—"}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-mono font-semibold">{metaTrim}</span>
                        </TableCell>
                        {(["meta_mes_1", "meta_mes_2", "meta_mes_3"] as const).map((field) => (
                          <TableCell key={field} className="text-center">
                            {isEditable ? (
                              <Input
                                type="number"
                                className="h-8 text-xs text-center w-20 mx-auto"
                                value={row[field] || ""}
                                onChange={(e) => updateRow(i, field, Number(e.target.value) || 0)}
                                min={0}
                              />
                            ) : (
                              <span className="text-xs font-mono">{row[field]}</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <span className="text-xs font-mono font-semibold">{total}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            delta === 0 ? "text-success" : "text-warning"
                          )}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
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

      {/* Action buttons */}
      {rows.length > 0 && !isApproved && (
        <div className="flex gap-3 mt-4 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar borrador
          </Button>
          {!hasDispute && (
            <Button onClick={handleSendProposal} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar propuesta
            </Button>
          )}
        </div>
      )}

      {isApproved && (
        <div className="flex items-center justify-center gap-2 mt-4 py-3 text-success font-medium text-sm">
          <CheckCircle2 className="h-5 w-5" /> Plan aprobado — la entidad puede registrar avances
        </div>
      )}
    </div>
  );
}
