import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Eye, Loader2, MessageSquare, Undo2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import {
  fetchRegistrosPorEstado,
  cambiarEstadoRegistro,
  agregarComentario,
  fetchHistorialRegistro,
  type RegistroPendiente,
  type HistorialEntry,
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

const ROLE_LABELS: Record<string, string> = {
  coordinador_regional: "Coordinador Regional",
  coordinador_cadenas: "Coordinador Cadenas de Valor",
  asesora_politicas: "Asesora Políticas Públicas",
  monitoreo: "Monitoreo",
  administracion: "Administración",
  direccion: "Dirección",
  entidad: "Entidad",
  gestor: "Gestor",
};

async function fetchMultipleEstados(estados: string[]): Promise<RegistroPendiente[]> {
  const results = await Promise.all(estados.map(fetchRegistrosPorEstado));
  return results.flat();
}

interface Props {
  title: string;
  estadoFiltro: string;
  estadoAprobar: string;
  labelAprobar?: string;
  filterFn?: (r: RegistroPendiente) => boolean;
}

export function SeccionRevision({ title, estadoFiltro, estadoAprobar, labelAprobar = "Aprobar", filterFn }: Props) {
  const queryClient = useQueryClient();
  const estados = estadoFiltro.split(",").map((s) => s.trim());

  const { data: allRegistros, isLoading } = useQuery({
    queryKey: ["registros-pendientes", ...estados],
    queryFn: () => fetchMultipleEstados(estados),
    staleTime: 15_000,
  });

  const filtered = filterFn ? (allRegistros || []).filter(filterFn) : (allRegistros || []);

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

function HistorialTimeline({ registroId }: { registroId: string }) {
  const { data: historial, isLoading } = useQuery({
    queryKey: ["historial-registro", registroId],
    queryFn: () => fetchHistorialRegistro(registroId),
    staleTime: 10_000,
  });

  if (isLoading) return <Loader2 className="h-3 w-3 animate-spin" />;
  if (!historial || historial.length === 0) return null;

  const hasObservacion = historial.some(h => h.accion === "observar");

  return (
    <div className="mt-2 space-y-1">
      {hasObservacion && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-1">
          <AlertTriangle className="h-3 w-3" />
          <span className="font-medium">Este registro fue observado anteriormente</span>
        </div>
      )}
      {historial.map((h) => (
        <div key={h.id} className={`flex items-start gap-2 text-[10px] rounded px-2 py-1 ${
          h.accion === "observar" ? "bg-destructive/5 border border-destructive/20" :
          h.accion === "comentar" ? "bg-primary/5 border border-primary/20" :
          "bg-muted/50"
        }`}>
          <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="text-muted-foreground">
              {h.created_at ? new Date(h.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
            <span className="mx-1">—</span>
            <span className="font-medium">{h.nombre_usuario || "Sistema"}</span>
            <span className="mx-1">→</span>
            <Badge className={`text-[8px] ${
              h.accion === "aprobar" ? "bg-emerald-500/15 text-emerald-700" :
              h.accion === "observar" ? "bg-destructive/15 text-destructive" :
              "bg-primary/15 text-primary"
            }`}>
              {h.accion === "aprobar" ? "✅ Aprobó" : h.accion === "observar" ? "↩ Observó" : "💬 Comentó"}
            </Badge>
            {h.valor_nuevo && <span className="ml-1 text-muted-foreground">→ {ESTADO_LABELS[h.valor_nuevo] || h.valor_nuevo}</span>}
            {h.observaciones && (
              <p className="text-foreground mt-0.5 italic">"{h.observaciones}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
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
  const { role, entidades } = useRole();
  const [acting, setActing] = useState(false);
  const [mode, setMode] = useState<"none" | "observar" | "comentar">("none");
  const [obs, setObs] = useState("");
  const [showHistorial, setShowHistorial] = useState(false);

  const nombreUsuario = ROLE_LABELS[role] || role;

  // Determine if this is a Mec A entity (skip financial review)
  const regEntidad = entidades.find(e => e.id === registro.entidad_id);
  const isMecA = regEntidad?.mecanismo === "A" || regEntidad?.tipo_entidad === "mec_a";

  const nextEstado = (() => {
    if (registro.estado_registro === "enviado") return "en_revision_tecnica";
    if (registro.estado_registro === "en_revision_tecnica") {
      // Mec A: skip financial review (Carmen already loaded financials)
      return isMecA ? "aprobado" : "en_revision_financiera";
    }
    if (registro.estado_registro === "en_revision_financiera") return "aprobado";
    return estadoAprobar;
  })();

  const handleAprobar = async () => {
    setActing(true);
    const result = await cambiarEstadoRegistro(
      registro.id, nextEstado, undefined, nombreUsuario, registro.estado_registro || undefined
    );
    setActing(false);
    if (result.success) {
      toast.success("Registro aprobado");
      onDone();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  const handleObservar = async () => {
    if (!obs.trim()) return;
    setActing(true);
    const result = await cambiarEstadoRegistro(
      registro.id, "observado", obs, nombreUsuario, registro.estado_registro || undefined
    );
    setActing(false);
    if (result.success) {
      toast.success("Registro observado");
      setMode("none");
      setObs("");
      onDone();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  const handleComentar = async () => {
    if (!obs.trim()) return;
    setActing(true);
    const result = await agregarComentario(registro.id, obs, nombreUsuario);
    setActing(false);
    if (result.success) {
      toast.success("Comentario guardado");
      setMode("none");
      setObs("");
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
        <TableCell className="text-xs">{MESES[registro.mes - 1]} {registro.anio}</TableCell>
        <TableCell className="text-right font-bold text-sm">{registro.avance_valor ?? 0}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">
            {ESTADO_LABELS[registro.estado_registro || ""] || registro.estado_registro}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end flex-wrap">
            <Button size="sm" className="text-xs h-7" disabled={acting} onClick={handleAprobar}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              ✅ Aprobar
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setMode("observar"); setObs(""); }}>
              <Undo2 className="h-3 w-3 mr-1" /> ↩ Observar
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setMode("comentar"); setObs(""); }}>
              <MessageSquare className="h-3 w-3 mr-1" /> 💬 Comentar
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => setShowHistorial(!showHistorial)}>
              <Clock className="h-3 w-3 mr-1" /> Historial
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Textarea row for observar/comentar */}
      {mode !== "none" && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="flex flex-col gap-2 max-w-lg ml-auto">
              <p className="text-xs font-medium">
                {mode === "observar" ? "↩ Escribir observación (devuelve el registro):" : "💬 Escribir comentario (no cambia estado):"}
              </p>
              <Textarea
                placeholder={mode === "observar" ? "Detalle la observación..." : "Escriba un comentario informativo..."}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="text-xs min-h-[50px]"
              />
              <div className="flex gap-1 justify-end">
                <Button
                  size="sm"
                  variant={mode === "observar" ? "destructive" : "default"}
                  className="text-xs h-7"
                  disabled={!obs.trim() || acting}
                  onClick={mode === "observar" ? handleObservar : handleComentar}
                >
                  {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {mode === "observar" ? "Enviar observación" : "Enviar comentario"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setMode("none")}>
                  Cancelar
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Historial row */}
      {showHistorial && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <HistorialTimeline registroId={registro.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
