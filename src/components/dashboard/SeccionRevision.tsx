import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, Eye, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  fetchRegistrosPorEstado,
  cambiarEstadoRegistro,
  type RegistroPendiente,
} from "@/lib/registroAprobacion";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface Props {
  title: string;
  estadoFiltro: string;
  estadoAprobar: string;
  labelAprobar?: string;
  filterFn?: (r: RegistroPendiente) => boolean;
}

export function SeccionRevision({ title, estadoFiltro, estadoAprobar, labelAprobar = "Aprobar", filterFn }: Props) {
  const queryClient = useQueryClient();
  const { data: registros, isLoading } = useQuery({
    queryKey: ["registros-pendientes", estadoFiltro],
    queryFn: () => fetchRegistrosPorEstado(estadoFiltro),
    staleTime: 15_000,
  });

  const filtered = filterFn ? (registros || []).filter(filterFn) : (registros || []);

  if (isLoading) return null;
  if (filtered.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Eye className="h-4 w-4" />
        {title}
        <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
      </h2>
      <div className="space-y-3">
        {filtered.map((reg) => (
          <RegistroRevisionCard
            key={reg.id}
            registro={reg}
            estadoAprobar={estadoAprobar}
            labelAprobar={labelAprobar}
            onDone={() => {
              queryClient.invalidateQueries({ queryKey: ["registros-pendientes"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard-entidades"] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RegistroRevisionCard({
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
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {registro.entidad_nombre && (
                <span className="text-xs font-medium text-primary">{registro.entidad_nombre}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {MESES[registro.mes - 1]} {registro.anio}
              </span>
            </div>
            <p className="text-sm font-medium">
              <span className="font-mono text-muted-foreground mr-1">{registro.actividad_codigo}</span>
              {registro.actividad_nombre}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-foreground">{registro.avance_valor ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">avance reportado</p>
          </div>
        </div>

        {registro.descripcion_avance && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{registro.descripcion_avance}</p>
        )}

        {showObs ? (
          <div className="space-y-2 mb-2">
            <Textarea
              placeholder="Escribe las observaciones..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="text-xs min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="text-xs flex-1"
                disabled={!obs.trim() || acting}
                onClick={() => handleAction("observado", obs)}
              >
                {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                Enviar observación
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowObs(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-xs flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={acting}
              onClick={() => handleAction(estadoAprobar)}
            >
              {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              {labelAprobar}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              onClick={() => setShowObs(true)}
            >
              <Eye className="h-3 w-3 mr-1" /> Observar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
