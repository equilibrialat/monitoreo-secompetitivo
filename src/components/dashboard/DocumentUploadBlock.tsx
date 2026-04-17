import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, X, FileText, Eye, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FileOrUrlInput, type FileOrUrlValue, validateUrl } from "@/components/ui/file-or-url-input";

interface Props {
  entidadCodigo: string;
  actividades: { codigo: string; nombre: string }[];
}

const TIPOS_DOCUMENTO = ["Contrato", "Factura", "Informe", "Foto", "Otro"];

export default function DocumentUploadBlock({ entidadCodigo, actividades }: Props) {
  const [actividadCodigo, setActividadCodigo] = useState("");
  const [tipoDoc, setTipoDoc] = useState("Informe");
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<FileOrUrlValue>({ mode: "file", file: null });
  const queryClient = useQueryClient();

  const { data: documentos } = useQuery({
    queryKey: ["documentos", entidadCodigo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("documentos")
        .select("*")
        .eq("entidad_codigo", entidadCodigo)
        .order("subido_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleSave = useCallback(async () => {
    if (!actividadCodigo) {
      toast.error("Selecciona una actividad primero");
      return;
    }

    let nombreArchivo = "";
    let urlFinal = "";

    if (source.mode === "file") {
      if (!source.file) {
        toast.error("Selecciona un archivo o cambia a modo enlace");
        return;
      }
      setSaving(true);
      const file = source.file;
      const ext = file.name.split(".").pop();
      const path = `${entidadCodigo}/${actividadCodigo}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(path, file);
      if (uploadError) {
        toast.error("Error al subir archivo");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
      urlFinal = urlData.publicUrl;
      nombreArchivo = file.name;
    } else {
      const trimmed = source.url.trim();
      const err = validateUrl(trimmed);
      if (!trimmed || err) {
        toast.error(err || "Ingresa una URL válida");
        return;
      }
      setSaving(true);
      urlFinal = trimmed;
      // Try to derive a friendly label from the URL
      try {
        const parsed = new URL(trimmed);
        nombreArchivo = parsed.hostname + (parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "");
        if (nombreArchivo.length > 60) nombreArchivo = nombreArchivo.slice(0, 57) + "…";
      } catch {
        nombreArchivo = trimmed.slice(0, 60);
      }
    }

    const { error: insertError } = await (supabase as any).from("documentos").insert({
      entidad_codigo: entidadCodigo,
      actividad_codigo: actividadCodigo,
      tipo_documento: tipoDoc,
      nombre_archivo: nombreArchivo,
      url_storage: urlFinal,
    });

    if (insertError) {
      toast.error("Error al guardar el registro");
      setSaving(false);
      return;
    }

    toast.success(source.mode === "file" ? "Documento subido" : "Enlace agregado");
    setSource({ mode: source.mode, ...(source.mode === "file" ? { file: null } : { url: "" }) } as FileOrUrlValue);
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["documentos", entidadCodigo] });
  }, [actividadCodigo, tipoDoc, entidadCodigo, queryClient, source]);

  const handleDelete = async (id: string, url: string) => {
    // Solo borrar de storage si es un archivo subido por nosotros
    const pathMatch = url.split("/documentos/")[1];
    if (pathMatch && url.includes("/storage/")) {
      await supabase.storage.from("documentos").remove([pathMatch]);
    }
    await (supabase as any).from("documentos").delete().eq("id", id);
    toast.success("Eliminado");
    queryClient.invalidateQueries({ queryKey: ["documentos", entidadCodigo] });
  };

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Adjuntar documento de sustento
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={actividadCodigo} onValueChange={setActividadCodigo}>
            <SelectTrigger className="h-8 text-xs w-[200px]">
              <SelectValue placeholder="Actividad" />
            </SelectTrigger>
            <SelectContent>
              {actividades.map(a => (
                <SelectItem key={a.codigo} value={a.codigo}>
                  {a.codigo} — {a.nombre?.substring(0, 30)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tipoDoc} onValueChange={setTipoDoc}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FileOrUrlInput
          value={source}
          onChange={setSource}
          disabled={saving || !actividadCodigo}
          helperText="Solo uno de los dos: archivo o enlace."
        />

        <div className="mt-2">
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={
              saving ||
              !actividadCodigo ||
              (source.mode === "file" ? !source.file : !source.url.trim())
            }
            onClick={handleSave}
          >
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {source.mode === "file" ? "Subir" : "Guardar enlace"}
          </Button>
        </div>

        {/* Recent documents */}
        {documentos && documentos.length > 0 && (
          <div className="space-y-1.5 mt-4">
            <p className="text-[10px] text-muted-foreground font-medium">Recientes:</p>
            {documentos.map((doc: any) => {
              const isExternalLink =
                doc.url_storage &&
                !doc.url_storage.includes("/storage/v1/object/public/documentos/");
              return (
                <div key={doc.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
                  {isExternalLink ? (
                    <LinkIcon className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <a
                    href={doc.url_storage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate flex-1 hover:underline hover:text-primary"
                  >
                    {doc.nombre_archivo}
                  </a>
                  <span className="text-[10px] text-muted-foreground shrink-0">{doc.actividad_codigo}</span>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" asChild>
                    <a href={doc.url_storage} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 text-destructive"
                    onClick={() => handleDelete(doc.id, doc.url_storage)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
