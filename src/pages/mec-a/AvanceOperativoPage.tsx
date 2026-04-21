import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ChevronDown, ChevronUp } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useMecAIniciativa } from "@/hooks/useMecAIniciativa";
import { fetchMecAAvanceOperativo, upsertMecAAvanceOperativo, MESES_LABELS, isMesCierreTrimestral } from "@/lib/mecA";

export default function AvanceOperativoPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "";
  const { arbol, loading: loadingAPE } = useMecAIniciativa(resolvedId);

  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [avances, setAvances] = useState<Record<string, any>>({});
  const [loadingAvances, setLoadingAvances] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isCierreTrimestral = isMesCierreTrimestral(Number(mes));

  useEffect(() => {
    if (!resolvedId) return;
    setLoadingAvances(true);
    fetchMecAAvanceOperativo(resolvedId, Number(anio), Number(mes)).then(data => {
      const map: Record<string, any> = {};
      data.forEach(av => { map[av.actividad_id] = av; });
      setAvances(map);
      setLoadingAvances(false);
    });
  }, [resolvedId, mes, anio]);

  function updateAvance(actId: string, field: string, value: any) {
    setAvances(prev => ({
      ...prev,
      [actId]: { ...(prev[actId] ?? {}), [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    let ok = 0, err = 0;
    for (const act of arbol) {
      const av = avances[act.id];
      if (!av || av.unidades_ejecut === undefined) continue;
      const payload = {
        actividad_id: act.id,
        iniciativa_id: resolvedId,
        anio: Number(anio),
        mes: Number(mes),
        unidades_planif: av.unidades_planif ?? null,
        unidades_ejecut: Number(av.unidades_ejecut ?? 0),
        logros: av.logros ?? null,
        comentarios: av.comentarios ?? null,
        registrado_por: null,
      };
      const result = await upsertMecAAvanceOperativo(payload);
      if (result.success) ok++; else err++;
    }
    setSaving(false);
    if (err === 0) toast.success(`Avance guardado para ${ok} actividad(es)`);
    else toast.error(`${err} error(es) al guardar`);
  }

  if (loadingAPE) return <div className="p-6 text-sm text-muted-foreground">Cargando estructura APE…</div>;

  const resultados = [...new Set(arbol.map(a => a.resultado?.id))].map(rid => arbol.find(a => a.resultado?.id === rid)?.resultado).filter(Boolean);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Avance Operativo</h1>
          <p className="text-sm text-muted-foreground">Registro mensual de ejecución por actividad</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES_LABELS.slice(1).map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio} onValueChange={setAnio}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar avance"}
          </Button>
        </div>
      </div>

      {isCierreTrimestral && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary">
          📋 Mes de cierre trimestral — el campo "Logros del trimestre" está habilitado.
        </div>
      )}

      {loadingAvances ? (
        <div className="text-sm text-muted-foreground">Cargando avances…</div>
      ) : (() => {
        const targetYM = `${anio}-${mes.padStart(2, "0")}`;
        const hasAnyScheduled = arbol.some(act => (act.meses_programados?.filter(m => m === targetYM).length ?? 0) > 0);

        if (!hasAnyScheduled) {
          return (
            <div className="p-8 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
              No hay actividades programadas para este mes. Selecciona otro mes para registrar avance.
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {resultados.map(res => {
              if (!res) return null;
              
              const actsRes = arbol.filter(a => a.resultado?.id === res.id && (a.meses_programados?.filter(m => m === targetYM).length ?? 0) > 0).sort((a,b) => a.orden - b.orden);
              if (actsRes.length === 0) return null;

              const productosUnique = [...new Map(actsRes.map(a => [a.producto.id, a.producto])).values()].sort((a,b) => a.orden - b.orden);
              const isCollapsed = collapsed[res.id];
            
            return (
              <Card key={res.id} className="overflow-hidden border-slate-300 dark:border-slate-700 shadow-sm">
                <CardHeader 
                  className="py-3 px-4 cursor-pointer bg-slate-800 text-slate-50 dark:bg-slate-900 transition-colors hover:bg-slate-700 dark:hover:bg-slate-800" 
                  onClick={() => setCollapsed(c => ({ ...c, [res.id]: !c[res.id] }))}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-start gap-2">
                      <span className="font-mono text-slate-400 mt-0.5">{res.numero}</span>
                      <span>{res.nombre}</span>
                    </CardTitle>
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />}
                  </div>
                </CardHeader>
                
                {!isCollapsed && (
                  <div className="flex flex-col">
                    {productosUnique.map((prod, prodIdx) => {
                      const actsProd = actsRes.filter(a => a.producto.id === prod.id);
                      return (
                        <div key={prod.id} className={prodIdx > 0 ? "border-t border-slate-200 dark:border-slate-700" : ""}>
                          {/* Cabecera del Producto */}
                          <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-2.5 flex items-center shadow-inner">
                            <span className="font-mono text-[11px] font-bold text-slate-500 mr-2">{prod.numero}</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{prod.nombre}</span>
                          </div>
                          
                          {/* Lista de Actividades del Producto */}
                          <div className="p-4 pl-6 sm:pl-8 space-y-4 bg-white dark:bg-background">
                            {actsProd.map(act => {
                              const av = avances[act.id] ?? {};
                              return (
                                <div key={act.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" className="font-mono text-[10px] rounded-sm px-1.5 py-0">{act.codigo}</Badge>
                                        <Badge variant="default" className="text-[10px] shrink-0 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                                          Meta total: {act.meta_total ?? "—"} {act.unidad_medida}
                                        </Badge>
                                      </div>
                                      <p className="text-sm font-medium leading-snug">{act.descripcion}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Planificado este mes</Label>
                                      <div className="h-8 text-sm mt-1.5 font-mono text-muted-foreground flex items-center bg-muted/30 px-3 rounded-md border border-transparent">
                                        {(() => {
                                          const targetYM = `${anio}-${mes.padStart(2, "0")}`;
                                          const count = act.meses_programados?.filter(m => m === targetYM).length ?? 0;
                                          return count;
                                        })()}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-primary">Ejecutado este mes *</Label>
                                      <Input
                                        type="number" min={0} step="0.01" className="h-8 text-sm mt-1.5 font-mono border-primary/40 bg-primary/5 focus-visible:ring-primary/30"
                                        value={av.unidades_ejecut ?? ""}
                                        onChange={e => updateAvance(act.id, "unidades_ejecut", e.target.value)}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="col-span-2 sm:col-span-2">
                                      <Label className="text-xs text-muted-foreground">Comentarios / Limitaciones</Label>
                                      <Input
                                        className="h-8 text-sm mt-1.5"
                                        value={av.comentarios ?? ""}
                                        onChange={e => updateAvance(act.id, "comentarios", e.target.value)}
                                        placeholder="Opcional: Dificultades encontradas…"
                                      />
                                    </div>
                                  </div>
                                  
                                  {isCierreTrimestral && (
                                    <div className="pt-2">
                                      <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Logros del trimestre
                                      </Label>
                                      <Textarea
                                        className="text-sm mt-2 min-h-[72px] border-primary/20 focus-visible:ring-primary/20"
                                        value={av.logros ?? ""}
                                        onChange={e => updateAvance(act.id, "logros", e.target.value)}
                                        placeholder="Describe los principales logros alcanzados en el trimestre para esta actividad…"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
}
