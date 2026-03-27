import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, X } from "lucide-react";
import { downloadCSV, formatCurrency, TRIMESTRES_MESES } from "@/lib/reportUtils";
import type { EntidadOption } from "@/contexts/RoleContext";
import AIAnalysisCard from "./AIAnalysisCard";

interface Props {
  entidadId: string | null;
  trimestre: string;
  anio: number;
  entidades: EntidadOption[];
  onClose: () => void;
}

export default function ReporteTrimestralOperativo({ entidadId, trimestre, anio, entidades, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const entidadNombre = entidades.find((e) => e.id === entidadId)?.nombre_corto || "Consolidado";
  const meses = TRIMESTRES_MESES[trimestre] || [1, 2, 3];

  useEffect(() => {
    fetchData();
  }, [entidadId, trimestre, anio]);

  async function fetchData() {
    setLoading(true);
    let query = (supabase as any)
      .from("registros_mensuales")
      .select("*, actividades!inner(codigo, nombre, meta_valor, meta_unidad_medida, producto_id, productos!inner(codigo, nombre, resultado_id, resultados!inner(codigo, nombre)))")
      .eq("anio", anio)
      .in("mes", meses);

    if (entidadId && entidadId !== "consolidado") {
      query = query.eq("entidad_id", entidadId);
    }

    const { data } = await query;

    // Group by activity
    const actMap = new Map<string, any>();
    (data || []).forEach((r: any) => {
      const act = r.actividades;
      const key = act.codigo;
      if (!actMap.has(key)) {
        actMap.set(key, {
          resultado: `${act.productos?.resultados?.codigo} - ${act.productos?.resultados?.nombre}`,
          producto: `${act.productos?.codigo} - ${act.productos?.nombre}`,
          codigo: act.codigo,
          nombre: act.nombre,
          meta: act.meta_valor,
          unidad: act.meta_unidad_medida,
          avance_trimestre: 0,
          descripciones: [] as string[],
        });
      }
      const entry = actMap.get(key)!;
      entry.avance_trimestre += r.avance_valor || 0;
      if (r.descripcion_avance) entry.descripciones.push(r.descripcion_avance);
    });

    setRows(Array.from(actMap.values()));
    setLoading(false);
  }

  const noData = rows.length === 0 && !loading;

  function handleDownload() {
    downloadCSV(rows.map((r) => ({
      Resultado: r.resultado,
      Producto: r.producto,
      Codigo: r.codigo,
      Actividad: r.nombre,
      Meta: r.meta ?? "",
      Unidad: r.unidad || "",
      Avance_Trimestre: r.avance_trimestre,
      Logros: r.descripciones.join("; "),
    })), `reporte_trimestral_operativo_${entidadNombre}_${trimestre}_${anio}.csv`);
  }

  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">ANEXO 8: AVANCE OPERATIVO TRIMESTRAL</h2>
          <p className="text-muted-foreground">{entidadNombre} — {trimestre} {anio}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={noData}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Cargando datos...</p>
        ) : noData ? (
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No hay registros para este período. Las entidades deben completar sus registros mensuales para que este reporte se genere automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AIAnalysisCard tipo="narrativa" datos={{ tipo_reporte: "trimestral_operativo", entidad: entidadNombre, periodo: `${trimestre} ${anio}`, total_actividades: rows.length }} label="Generar análisis IA" />
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resultado / Producto</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Avance Trimestre</TableHead>
                  <TableHead className="text-right">% Avance</TableHead>
                  <TableHead>Logros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const pct = r.meta ? ((r.avance_trimestre / r.meta) * 100).toFixed(0) : "—";
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs max-w-[200px]">
                        <div className="text-muted-foreground">{r.resultado}</div>
                        <div>{r.producto}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs mr-1">{r.codigo}</span>
                        {r.nombre}
                      </TableCell>
                      <TableCell className="text-right font-mono">{r.meta ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{r.avance_trimestre}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{pct}%</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{r.descripciones.join("; ") || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
