import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";

export default function AnalisisComparativo() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: d } = await (supabase as any).from("v_dashboard_entidad").select("*");
      setData(d ?? []);
      setLoading(false);
    })();
  }, []);

  const barData = useMemo(() => data.map(e => ({
    name: e.nombre_corto ?? e.codigo,
    avanceOp: e.total_actividades > 0 ? Math.round((e.actividades_completadas / e.total_actividades) * 100) : 0,
    ejecFin: e.pct_ejecucion_seco != null ? Math.round(e.pct_ejecucion_seco * 100) : 0,
  })), [data]);

  const scatterData = useMemo(() => data.map(e => ({
    name: e.nombre_corto ?? e.codigo,
    x: e.total_actividades > 0 ? Math.round((e.actividades_completadas / e.total_actividades) * 100) : 0,
    y: e.pct_ejecucion_seco != null ? Math.round(e.pct_ejecucion_seco * 100) : 0,
    z: e.presupuesto_seco_total ?? 1,
  })), [data]);

  if (loading) return <p className="text-muted-foreground py-8 text-center">Cargando…</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Avance Operativo vs Ejecución Financiera</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis unit="%" />
              <Tooltip formatter={(v: number) => v + "%"} />
              <Legend />
              <Bar dataKey="avanceOp" name="Avance Operativo (%)" fill="hsl(var(--primary))" />
              <Bar dataKey="ejecFin" name="Ejecución Financiera (%)" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispersión: Avance Técnico vs Ejecución Financiera</CardTitle>
          <p className="text-xs text-muted-foreground">Entidades cerca de la diagonal tienen coherencia técnico-financiera. Las alejadas tienen desfase.</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Avance Técnico" unit="%" domain={[0, 100]} />
              <YAxis type="number" dataKey="y" name="Ejec. Financiera" unit="%" domain={[0, 100]} />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border rounded p-2 text-xs shadow">
                      <p className="font-bold">{d.name}</p>
                      <p>Avance técnico: {d.x}%</p>
                      <p>Ejec. financiera: {d.y}%</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
