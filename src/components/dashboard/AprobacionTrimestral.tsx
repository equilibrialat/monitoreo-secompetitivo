import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Bot, Check, Download, ChevronRight, Lock, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { invokeAnalysis } from "@/lib/aiAnalysis";
import { generateResumenEjecutivoDocx } from "@/lib/generateDocx";
import ReactMarkdown from "react-markdown";

const TRIMESTRES = [
  { label: "T1", meses: [1, 2, 3] },
  { label: "T2", meses: [4, 5, 6] },
  { label: "T3", meses: [7, 8, 9] },
  { label: "T4", meses: [10, 11, 12] },
];

interface TrimestreData {
  trimestre: string;
  anio: number;
  entidadesTotal: number;
  entidadesAprobadas: number;
  entidadesPendientes: string[];
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
  kpis: {
    totalActividades: number;
    actConAvance: number;
    totalPresupuesto: number;
    totalEjecutado: number;
    pctEjecucion: number;
    avanceOperativo: number;
  };
  entidadesDetalle: {
    id: string;
    nombre: string;
    mecanismo: string;
    estado: "aprobado" | "en_revision" | "sin_reporte";
    avanceOp: number;
    pctEjec: number;
  }[];
}

export function AprobacionTrimestral() {
  const { entidades } = useRole();
  const [trimestres, setTrimestres] = useState<TrimestreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrimestre, setSelectedTrimestre] = useState<TrimestreData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadTrimestres = useCallback(async () => {
    setLoading(true);
    const anios = [2025, 2026];
    const results: TrimestreData[] = [];

    for (const anio of anios) {
      for (const trim of TRIMESTRES) {
        // Get all registros for this quarter
        const { data: registros } = await (supabase as any)
          .from("registros_mensuales")
          .select("entidad_id, estado_registro, avance_valor")
          .in("mes", trim.meses)
          .eq("anio", anio);

        if (!registros || registros.length === 0) continue;

        // Get unique entidades with registros
        const entidadIds = [...new Set((registros as any[]).map(r => r.entidad_id))] as string[];
        
        // Check which are fully approved (all registros for this quarter are 'aprobado')
        const aprobadas: string[] = [];
        const pendientes: string[] = [];
        
        const entidadesDetalle: TrimestreData["entidadesDetalle"] = [];

        for (const entId of entidadIds) {
          const entRegs = (registros as any[]).filter(r => r.entidad_id === entId);
          const allAprobados = entRegs.every(r => r.estado_registro === "aprobado");
          const ent = entidades.find(e => e.id === entId);
          if (!ent) continue;
          
          if (allAprobados) {
            aprobadas.push(entId);
          } else {
            pendientes.push(ent.nombre_corto);
          }

          // Get dashboard data for this entity
          const { data: dashData } = await (supabase as any)
            .from("v_dashboard_entidad")
            .select("*")
            .eq("entidad_id", entId)
            .single();

          entidadesDetalle.push({
            id: entId,
            nombre: ent.nombre_corto,
            mecanismo: ent.mecanismo || "",
            estado: allAprobados ? "aprobado" : entRegs.some(r => r.estado_registro && r.estado_registro !== "borrador") ? "en_revision" : "sin_reporte",
            avanceOp: dashData?.pct_ejecucion_seco ? Math.round(Number(dashData.pct_ejecucion_seco)) : 0,
            pctEjec: dashData?.pct_ejecucion_seco ? Math.round(Number(dashData.pct_ejecucion_seco)) : 0,
          });
        }

        // Check if trimestre was already approved by dirección
        const { data: historial } = await (supabase as any)
          .from("historial_cambios")
          .select("nombre_usuario, created_at")
          .eq("tabla", "trimestre_aprobacion")
          .eq("registro_id", `${trim.label}-${anio}`)
          .eq("accion", "aprobar")
          .order("created_at", { ascending: false })
          .limit(1);

        const totalActs = (registros as any[]).length;
        const actsConAvance = (registros as any[]).filter(r => r.avance_valor && r.avance_valor > 0).length;

        results.push({
          trimestre: trim.label,
          anio,
          entidadesTotal: entidadIds.length,
          entidadesAprobadas: aprobadas.length,
          entidadesPendientes: pendientes,
          aprobadoPor: historial?.[0]?.nombre_usuario || null,
          fechaAprobacion: historial?.[0]?.created_at || null,
          kpis: {
            totalActividades: totalActs,
            actConAvance: actsConAvance,
            totalPresupuesto: 0,
            totalEjecutado: 0,
            pctEjecucion: 0,
            avanceOperativo: totalActs > 0 ? Math.round((actsConAvance / totalActs) * 100) : 0,
          },
          entidadesDetalle,
        });
      }
    }

    setTrimestres(results.reverse());
    setLoading(false);
  }, [entidades]);

  useEffect(() => { loadTrimestres(); }, [loadTrimestres]);

  const handleAprobar = async (trim: TrimestreData) => {
    setApproving(true);
    
    // Record in historial
    await (supabase as any).from("historial_cambios").insert({
      tabla: "trimestre_aprobacion",
      registro_id: `${trim.trimestre}-${trim.anio}`,
      accion: "aprobar",
      campo: "estado",
      valor_anterior: "pendiente",
      valor_nuevo: "aprobado",
      nombre_usuario: "Dirección (Paula)",
      observaciones: `Aprobación final del trimestre ${trim.trimestre}-${trim.anio}`,
    });

    // Notify everyone
    await (supabase as any).from("notificaciones").insert({
      tipo: "aprobacion_trimestral",
      asunto: `Aprobación final: ${trim.trimestre}-${trim.anio}`,
      mensaje: `Paula ha dado aprobación final al ${trim.trimestre}-${trim.anio}. El trimestre queda cerrado.`,
      destinatarios: JSON.stringify({ roles: ["administracion", "monitoreo", "coordinador_regional", "coordinador_cadenas"] }),
    });

    // For Mec B: enable next desembolso
    const mecBEntidades = trim.entidadesDetalle.filter(e => e.mecanismo === "B");
    for (const ent of mecBEntidades) {
      await (supabase as any)
        .from("desembolsos")
        .update({ estado: "habilitado" })
        .eq("entidad_id", ent.id)
        .eq("estado", "pendiente")
        .order("numero_remesa", { ascending: true })
        .limit(1);
    }

    setApproving(false);
    toast.success(`Trimestre ${trim.trimestre}-${trim.anio} aprobado exitosamente`);
    setDetailOpen(false);
    loadTrimestres();
  };

  const handleAIAnalysis = async (trim: TrimestreData) => {
    setAiLoading(true);
    setAiResult(null);
    const { resultado, error } = await invokeAnalysis("ejecutivo", {
      entidad: { codigo: "PROGRAMA", nombre: "SeCompetitivo" },
      periodo: { tipo: "trimestral", trimestre: trim.trimestre, anio: trim.anio },
      actividades: trim.entidadesDetalle.map(e => ({
        codigo: e.nombre,
        mecanismo: e.mecanismo,
        avance_operativo: e.avanceOp,
        ejecucion_financiera: e.pctEjec,
        estado: e.estado,
      })),
      financiero: { total_entidades: trim.entidadesTotal, aprobadas: trim.entidadesAprobadas },
    });
    setAiLoading(false);
    if (error) toast.error(error);
    else setAiResult(resultado ?? null);
  };

  const handleExportDocx = async (trim: TrimestreData) => {
    setExporting(true);
    try {
      await generateResumenEjecutivoDocx({
        trimestre: trim.trimestre,
        anio: trim.anio,
        entidadesDetalle: trim.entidadesDetalle,
        kpis: trim.kpis,
        aiSummary: aiResult,
        aprobadoPor: trim.aprobadoPor,
        fechaAprobacion: trim.fechaAprobacion,
      });
      toast.success("Resumen ejecutivo descargado");
    } catch {
      toast.error("Error al generar el documento");
    }
    setExporting(false);
  };

  const openDetail = (trim: TrimestreData) => {
    setSelectedTrimestre(trim);
    setAiResult(null);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Cargando consolidados trimestrales...</p>
        </CardContent>
      </Card>
    );
  }

  if (trimestres.length === 0) return null;

  return (
    <>
      <Card className="mb-6 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            📋 Aprobación de Consolidados Trimestrales
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trimestre</TableHead>
                <TableHead className="text-center">Entidades total</TableHead>
                <TableHead className="text-center">Aprobadas</TableHead>
                <TableHead>Pendientes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trimestres.map((t) => {
                const isAprobado = !!t.aprobadoPor;
                const allReady = t.entidadesPendientes.length === 0;
                return (
                  <TableRow key={`${t.trimestre}-${t.anio}`}>
                    <TableCell className="font-semibold text-sm">{t.trimestre}-{t.anio}</TableCell>
                    <TableCell className="text-center">{t.entidadesTotal}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">{t.entidadesAprobadas}</TableCell>
                    <TableCell>
                      {t.entidadesPendientes.length > 0 ? (
                        <span className="text-xs text-destructive">{t.entidadesPendientes.length} ({t.entidadesPendientes.join(", ")})</span>
                      ) : (
                        <span className="text-xs text-emerald-600">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAprobado ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">
                          ✅ Aprobado por {t.aprobadoPor} {t.fechaAprobacion ? new Date(t.fechaAprobacion).toLocaleDateString("es-PE") : ""}
                        </Badge>
                      ) : allReady ? (
                        <Badge className="bg-primary/15 text-primary text-[10px]">⏳ Listo para aprobación</Badge>
                      ) : (
                        <Badge className="bg-warning/15 text-warning text-[10px]">⏳ Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openDetail(t)}>
                        {isAprobado ? "Ver" : "Ver detalle"} <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTrimestre && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  📋 Consolidado {selectedTrimestre.trimestre}-{selectedTrimestre.anio}
                  {selectedTrimestre.aprobadoPor && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">
                      <Lock className="h-3 w-3 mr-1" /> Cerrado
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Entidades</p>
                  <p className="text-lg font-bold">{selectedTrimestre.entidadesTotal}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Aprobadas</p>
                  <p className="text-lg font-bold text-emerald-600">{selectedTrimestre.entidadesAprobadas}</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Actividades</p>
                  <p className="text-lg font-bold">{selectedTrimestre.kpis.totalActividades}</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Con avance</p>
                  <p className="text-lg font-bold">{selectedTrimestre.kpis.actConAvance}</p>
                </div>
              </div>

              {/* Entity list */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Mec.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ejec. SECO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTrimestre.entidadesDetalle.map((e) => (
                      <TableRow key={e.id} className={e.estado !== "aprobado" ? "bg-destructive/5" : ""}>
                        <TableCell className="text-sm font-medium">{e.nombre}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">MEC-{e.mecanismo}</Badge></TableCell>
                        <TableCell>
                          {e.estado === "aprobado" ? (
                            <span className="text-xs text-emerald-600">✅ Aprobado por Carmen</span>
                          ) : e.estado === "en_revision" ? (
                            <span className="text-xs text-primary">⏳ En revisión</span>
                          ) : (
                            <span className="text-xs text-destructive">🔴 Sin reporte</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={e.pctEjec} className="h-1.5 w-16" />
                            <span className="text-xs font-mono">{e.pctEjec}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* AI Analysis */}
              <div className="flex gap-2 flex-wrap mt-4">
                <Button variant="outline" size="sm" onClick={() => handleAIAnalysis(selectedTrimestre)} disabled={aiLoading} className="text-xs">
                  {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
                  🤖 Generar análisis ejecutivo
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportDocx(selectedTrimestre)} disabled={exporting} className="text-xs">
                  {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                  📥 Descargar resumen ejecutivo
                </Button>
              </div>

              {aiResult && (
                <Card className="border-l-4 border-l-primary mt-3">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs font-semibold text-primary mb-2">📊 Análisis Ejecutivo — IA</p>
                    <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1.5">
                      <ReactMarkdown>{aiResult}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approval button */}
              <DialogFooter className="mt-4">
                {selectedTrimestre.aprobadoPor ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <Lock className="h-4 w-4" />
                    Trimestre cerrado — Aprobado por {selectedTrimestre.aprobadoPor}
                    {selectedTrimestre.fechaAprobacion && (
                      <span className="text-muted-foreground ml-1">
                        ({new Date(selectedTrimestre.fechaAprobacion).toLocaleDateString("es-PE")})
                      </span>
                    )}
                  </div>
                ) : selectedTrimestre.entidadesPendientes.length === 0 ? (
                  <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                    onClick={() => handleAprobar(selectedTrimestre)}
                    disabled={approving}
                  >
                    {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    ✅ Dar Aprobación Final del Trimestre
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Faltan {selectedTrimestre.entidadesPendientes.length} entidades por aprobar
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
