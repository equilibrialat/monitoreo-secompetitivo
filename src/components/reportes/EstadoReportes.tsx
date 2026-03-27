import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador", enviado: "Enviado", en_revision_tecnica: "Rev. Técnica",
  en_revision_financiera: "Rev. Financiera", aprobado: "Aprobado", observado: "Observado",
};

function estadoBadge(estado: string | null) {
  if (!estado) return <Badge variant="outline">Sin reporte</Badge>;
  if (estado === "aprobado") return <Badge className="bg-green-600 text-white">{ESTADO_LABELS[estado]}</Badge>;
  if (estado === "observado") return <Badge variant="destructive">{ESTADO_LABELS[estado]}</Badge>;
  return <Badge className="bg-yellow-500 text-black">{ESTADO_LABELS[estado] ?? estado}</Badge>;
}

function diasSinReportar(registros: any[]) {
  if (registros.length === 0) return 999;
  const last = registros.sort((a: any, b: any) => new Date(b.fecha_registro ?? b.updated_at ?? 0).getTime() - new Date(a.fecha_registro ?? a.updated_at ?? 0).getTime())[0];
  const d = last.fecha_registro ?? last.updated_at;
  if (!d) return 999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function alertaSemaforo(dias: number) {
  if (dias <= 30) return <Badge className="bg-green-600 text-white">Al día</Badge>;
  if (dias <= 45) return <Badge className="bg-yellow-500 text-black">Pendiente ({dias}d)</Badge>;
  return <Badge variant="destructive">Sin reporte ({dias}d)</Badge>;
}

export default function EstadoReportes() {
  const [entidades, setEntidades] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [empleo, setEmpleo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [e, r, emp] = await Promise.all([
        (supabase as any).from("entidades").select("id, nombre_corto, tipo_entidad").eq("activo", true).order("nombre_corto"),
        (supabase as any).from("registros_mensuales").select("entidad_id, mes, anio, estado_registro, fecha_registro, updated_at"),
        (supabase as any).from("reporte_empleo").select("entidad_id, anio, periodo, estado_registro"),
      ]);
      setEntidades(e.data ?? []);
      setRegistros(r.data ?? []);
      setEmpleo(emp.data ?? []);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => entidades.map(ent => {
    const regs = registros.filter(r => r.entidad_id === ent.id);
    const lastReg = regs.length > 0 ? regs.sort((a, b) => (b.anio * 100 + b.mes) - (a.anio * 100 + a.mes))[0] : null;
    const empRegs = empleo.filter(r => r.entidad_id === ent.id);
    const lastEmp = empRegs.length > 0 ? empRegs.sort((a, b) => b.anio - a.anio)[0] : null;
    const dias = diasSinReportar(regs);
    return { ent, lastReg, lastEmp, dias };
  }), [entidades, registros, empleo]);

  if (loading) return <p className="text-muted-foreground py-8 text-center">Cargando…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Estado de Reportes por Entidad</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Entidad</TableHead>
            <TableHead>Último Reg. Mensual</TableHead>
            <TableHead>Estado Mensual</TableHead>
            <TableHead>Indicadores Impacto</TableHead>
            <TableHead>Alerta</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.ent.id}>
                <TableCell className="font-medium">{r.ent.nombre_corto}</TableCell>
                <TableCell>{r.lastReg ? `${r.lastReg.mes}/${r.lastReg.anio}` : "—"}</TableCell>
                <TableCell>{estadoBadge(r.lastReg?.estado_registro)}</TableCell>
                <TableCell>{estadoBadge(r.lastEmp?.estado_registro)}</TableCell>
                <TableCell>{alertaSemaforo(r.dias)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
