import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { invokeAnalysis } from "@/lib/aiAnalysis";

interface TrimestreData {
  label: string;
  meses: number[];
  anio: number;
  total_registros: number;
  aprobados: number;
  pendientes: number;
  estado: "completo" | "parcial" | "sin_datos";
  aprobado_final: boolean;
}

const TRIMESTRES = [
  { label: "T4-2025", meses: [10, 11, 12], anio: 2025 },
  { label: "T3-2025", meses: [7, 8, 9], anio: 2025 },
  { label: "T2-2025", meses: [4, 5, 6], anio: 2025 },
  { label: "T1-2025", meses: [1, 2, 3], anio: 2025 },
];

export default function AprobacionesPage() {
  const { entidades } = useRole();
  const [trimestres, setTrimestres] = useState<TrimestreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [detalle, setDetalle] = useState<{ trimestre: string; entidades: any[] } | null>(null);

  useEffect(() => { loadData(); }, [entidades]);

  async function loadData() {
    setLoading(true);

    const { data: registros } = await (supabase as any)
      .from("registros_mensuales")
      .select("entidad_id, anio, mes, estado_registro")
      .eq("anio", 2025);

    const { data: allActividades } = await (supabase as any)
      .from("actividades")
      .select("id, entidad_id");

    const actCountByEntidad = new Map<string, number>();
    for (const a of allActividades || []) {
      actCountByEntidad.set(a.entidad_id, (actCountByEntidad.get(a.entidad_id) || 0) + 1);
    }

    const result: TrimestreData[] = TRIMESTRES.map(t => {
      const regsInTrimestre = (registros || []).filter(
        (r: any) => r.anio === t.anio && t.meses.includes(r.mes)
      );
      const aprobados = regsInTrimestre.filter((r: any) => r.estado_registro === "aprobado").length;
      const totalExpected = entidades.reduce((s, e) => {
        const actsPerEntity = actCountByEntidad.get(e.id) || 0;
        return s + actsPerEntity * t.meses.length;
      }, 0);

      let estado: "completo" | "parcial" | "sin_datos" = "sin_datos";
      if (regsInTrimestre.length > 0 && aprobados === regsInTrimestre.length && regsInTrimestre.length >= totalExpected * 0.8) {
        estado = "completo";
      } else if (regsInTrimestre.length > 0) {
        estado = "parcial";
      }

      return {
        ...t,
        total_registros: regsInTrimestre.length,
        aprobados,
        pendientes: regsInTrimestre.length - aprobados,
        estado,
        aprobado_final: false,
      };
    });

    setTrimestres(result);
    setLoading(false);
  }

  async function handleVerDetalle(t: TrimestreData) {
    const { data: registros } = await (supabase as any)
      .from("registros_mensuales")
      .select("entidad_id, mes, estado_registro")
      .eq("anio", t.anio)
      .in("mes", t.meses);

    const byEntidad = new Map<string, any[]>();
    for (const r of registros || []) {
      const arr = byEntidad.get(r.entidad_id) || [];
      arr.push(r);
      byEntidad.set(r.entidad_id, arr);
    }

    const entidadesDetalle = entidades.map(e => {
      const regs = byEntidad.get(e.id) || [];
      const aprobados = regs.filter((r: any) => r.estado_registro === "aprobado").length;
      const observados = regs.filter((r: any) => r.estado_registro === "observado").length;
      const pendientes = regs.filter((r: any) => !["aprobado"].includes(r.estado_registro)).length;
      const mesesRegistrados = new Set(regs.map((r: any) => r.mes));
      const mesesFaltantes = t.meses.filter(m => !mesesRegistrados.has(m));

      return {
        nombre: e.nombre_corto,
        total: regs.length,
        aprobados,
        observados,
        pendientes,
        mesesFaltantes,
        completo: aprobados === regs.length && regs.length > 0 && mesesFaltantes.length === 0,
      };
    });

    setDetalle({ trimestre: t.label, entidades: entidadesDetalle });
  }

  async function handleAprobacionFinal(t: TrimestreData) {
    toast.success(`Aprobación final del ${t.label} registrada`);
    setTrimestres(prev => prev.map(tr => tr.label === t.label ? { ...tr, aprobado_final: true } : tr));
  }

  async function handleAI(t: TrimestreData) {
    setAiLoading(true);
    const { data: dashboard } = await (supabase as any).from("v_dashboard_entidad").select("*");
    const res = await invokeAnalysis("ejecutivo", {
      periodo: t.label,
      kpis: { registros: t.total_registros, aprobados: t.aprobados, pendientes: t.pendientes },
      entidades: (dashboard || []).map((d: any) => ({
        nombre: d.nombre_corto, avance: d.pct_ejecucion_seco, sobregiros: d.sobregiros_seco,
      })),
    });
    setAiResult(res.resultado || res.error);
    setAiLoading(false);
  }

  const MESES_NOMBRE: Record<number, string> = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aprobaciones</h1>
          <p className="text-muted-foreground">Aprobación final de consolidados trimestrales</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="space-y-4">
          {trimestres.map((t) => (
            <Card key={t.label} className={t.aprobado_final ? "border-emerald-500/40" : t.estado === "completo" ? "border-primary/30" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t.label}
                    {t.aprobado_final && <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">✅ Aprobación Final</Badge>}
                    {!t.aprobado_final && t.estado === "completo" && <Badge className="bg-primary/10 text-primary text-[10px]">Listo para aprobar</Badge>}
                    {t.estado === "parcial" && <Badge className="bg-warning/15 text-warning text-[10px]">Parcial</Badge>}
                    {t.estado === "sin_datos" && <Badge className="bg-muted text-muted-foreground text-[10px]">Sin datos</Badge>}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleVerDetalle(t)}>
                      Ver detalle
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAI(t)} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      Análisis IA
                    </Button>
                    {t.estado === "completo" && !t.aprobado_final && (
                      <Button size="sm" onClick={() => handleAprobacionFinal(t)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobación Final
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xl font-bold">{t.total_registros}</p>
                    <p className="text-xs text-muted-foreground">Registros totales</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3">
                    <p className="text-xl font-bold text-emerald-700">{t.aprobados}</p>
                    <p className="text-xs text-muted-foreground">Aprobados</p>
                  </div>
                  <div className={`rounded-lg p-3 ${t.pendientes > 0 ? "bg-warning/10" : "bg-muted/30"}`}>
                    <p className={`text-xl font-bold ${t.pendientes > 0 ? "text-warning" : ""}`}>{t.pendientes}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail view */}
      {detalle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle: {detalle.trimestre}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidad</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Aprobados</TableHead>
                    <TableHead className="text-center">Observados</TableHead>
                    <TableHead className="text-center">Pendientes</TableHead>
                    <TableHead>Meses faltantes</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalle.entidades.map((e: any) => (
                    <TableRow key={e.nombre}>
                      <TableCell className="font-medium">{e.nombre}</TableCell>
                      <TableCell className="text-center">{e.total}</TableCell>
                      <TableCell className="text-center text-emerald-700">{e.aprobados}</TableCell>
                      <TableCell className="text-center text-destructive">{e.observados}</TableCell>
                      <TableCell className="text-center text-warning">{e.pendientes}</TableCell>
                      <TableCell>
                        {e.mesesFaltantes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Completo ✓</span>
                        ) : (
                          <div className="flex gap-1">
                            {e.mesesFaltantes.map((m: number) => (
                              <Badge key={m} variant="destructive" className="text-[10px]">{MESES_NOMBRE[m]}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {e.completo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">✅ Completo</Badge>
                        ) : (
                          <Badge className="bg-warning/15 text-warning text-[10px]">Pendiente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Result */}
      {aiResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Análisis Ejecutivo IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">{aiResult}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
