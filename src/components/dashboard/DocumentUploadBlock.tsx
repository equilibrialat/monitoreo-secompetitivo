import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, X, FileText, Eye } from "lucide-react";
import { toast } from "sonner";

interface Props {
  entidadCodigo: string;
  actividades: { codigo: string; nombre: string }[];
}

const TIPOS_DOCUMENTO = ["Contrato", "Factura", "Informe", "Foto", "Otro"];

export default function DocumentUploadBlock({ entidadCodigo, actividades }: Props) {
  const [actividadCodigo, setActividadCodigo] = useState("");
  const [tipoDoc, setTipoDoc] = useState("Informe");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleUpload = useCallback(async (file: File) => {
    if (!actividadCodigo) {
      toast.error("Selecciona una actividad primero");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${entidadCodigo}/${actividadCodigo}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, file);

    if (uploadError) {
      toast.error("Error al subir archivo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);

    await (supabase as any).from("documentos").insert({
      entidad_codigo: entidadCodigo,
      actividad_codigo: actividadCodigo,
      tipo_documento: tipoDoc,
      nombre_archivo: file.name,
      url_storage: urlData.publicUrl,
    });

    toast.success("Documento subido");
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["documentos", entidadCodigo] });
  }, [actividadCodigo, tipoDoc, entidadCodigo, queryClient]);

  const handleDelete = async (id: string, url: string) => {
    // Extract path from URL
    const pathMatch = url.split("/documentos/")[1];
    if (pathMatch) {
      await supabase.storage.from("documentos").remove([pathMatch]);
    }
    await (supabase as any).from("documentos").delete().eq("id", id);
    toast.success("Documento eliminado");
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

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploading || !actividadCodigo}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "Subiendo..." : "Subir archivo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Recent documents */}
        {documentos && documentos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium">Archivos recientes:</p>
            {documentos.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{doc.nombre_archivo}</span>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
