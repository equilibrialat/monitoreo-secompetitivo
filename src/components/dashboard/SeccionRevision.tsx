import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Eye, Loader2, MessageSquare, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchRegistrosPorEstado,
  cambiarEstadoRegistro,
  type RegistroPendiente,
} from "@/lib/registroAprobacion";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADO_LABELS: Record<string, string> = {
  enviado: "Enviado",
  en_revision_tecnica: "Rev. Técnica",
  en_revision_financiera: "Rev. Financiera",
  aprobado: "Aprobado",
  observado: "Observado",
  borrador: "Borrador",
};

interface Props {
  title: string;
  /** Estado(s) a filtrar — puede ser uno o varios separados por coma */
  estadoFiltro: string;
  estadoAprobar: string;
  labelAprobar?: string;
  filterFn?: (r: RegistroPendiente) => boolean;
}

export function SeccionRevision({ title, estadoFiltro, estadoAprobar, labelAprobar = "Aprobar", filterFn }: Props) {
  const queryClient = useQueryClient();
  const estados = estadoFiltro.split(",").map((s) => s.trim());

  // Fetch each estado in parallel via separate queries
  const queries = estados.map((est) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["registros-pendientes", est],
      queryFn: () => fetchRegistrosPorEstado(est),
      staleTime: 15_000,
    })
  );

  const isLoading = queries.some((q) => q.isLoading);
  const allRegistros = queries.flatMap((q) => q.data || []);
  const filtered = filterFn ? allRegistros.filter(filterFn) : allRegistros;

  if (isLoading) return null;
  if (filtered.length === 0) return null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["registros-pendientes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-entidades"] });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidad</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead>Mes/Año</TableHead>
              <TableHead className="text-right">Avance</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((reg) => (
              <RevisionRow
                key={reg.id}
                registro={reg}
                estadoAprobar={estadoAprobar}
                labelAprobar={labelAprobar}
                onDone={invalidate}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RevisionRow({
  registro,
  estadoAprobar,
  labelAprobar,
  onDone,
}: {
  registro: RegistroPendiente;
  estadoAprobar: string;
  labelAprobar: string;
  onDone: () => void;
}) {
  const [acting, setActing] = useState(false);
  const [showObs, setShowObs] = useState(false);
  const [obs, setObs] = useState("");

  // For multi-estado views, determine next state based on current estado
  const nextEstado = (() => {
    if (registro.estado_registro === "enviado") return "en_revision_tecnica";
    if (registro.estado_registro === "en_revision_tecnica") return "en_revision_financiera";
    if (registro.estado_registro === "en_revision_financiera") return "aprobado";
    return estadoAprobar;
  })();

  const handleAction = async (nuevoEstado: string, observaciones?: string) => {
    setActing(true);
    const result = await cambiarEstadoRegistro(registro.id, nuevoEstado, observaciones);
    setActing(false);
    if (result.success) {
      toast.success(nuevoEstado === "observado" ? "Registro observado" : "Registro aprobado");
      onDone();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium text-xs">{registro.entidad_nombre}</TableCell>
        <TableCell className="text-xs">
          <span className="font-mono text-muted-foreground mr-1">{registro.actividad_codigo}</span>
          {registro.actividad_nombre}
        </TableCell>
        <TableCell className="text-xs">
          {MESES[registro.mes - 1]} {registro.anio}
        </TableCell>
        <TableCell className="text-right font-bold text-sm">{registro.avance_valor ?? 0}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">
            {ESTADO_LABELS[registro.estado_registro || ""] || registro.estado_registro}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {showObs ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <Textarea
                placeholder="Observaciones..."
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="text-xs min-h-[50px]"
              />
              <div className="flex gap-1 justify-end">
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs h-7"
                  disabled={!obs.trim() || acting}
                  onClick={() => handleAction("observado", obs)}
                >
                  {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                  Enviar
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowObs(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 justify-end">
              <Button
                size="sm"
                className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={acting}
                onClick={() => handleAction(nextEstado)}
              >
                {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-amber-400 text-amber-600 hover:bg-amber-50"
                onClick={() => setShowObs(true)}
              >
                <Undo2 className="h-3 w-3 mr-1" /> Observar
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}
