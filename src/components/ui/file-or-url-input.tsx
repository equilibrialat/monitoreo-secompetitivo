import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Link as LinkIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileOrUrlValue =
  | { mode: "file"; file: File | null }
  | { mode: "url"; url: string };

interface Props {
  value: FileOrUrlValue;
  onChange: (v: FileOrUrlValue) => void;
  label?: string;
  accept?: string;
  className?: string;
  disabled?: boolean;
  /** Hint shown under the toggle */
  helperText?: string;
}

/**
 * Componente reutilizable: permite alternar entre subir un archivo o pegar una URL.
 * Solo uno de los dos modos está activo a la vez.
 */
export function FileOrUrlInput({
  value,
  onChange,
  label,
  accept,
  className,
  disabled,
  helperText,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const isFileMode = value.mode === "file";

  function setMode(mode: "file" | "url") {
    if (mode === "file") onChange({ mode: "file", file: null });
    else onChange({ mode: "url", url: "" });
    setUrlError(null);
  }

  function handleUrlChange(raw: string) {
    onChange({ mode: "url", url: raw });
    if (!raw) {
      setUrlError(null);
      return;
    }
    try {
      new URL(raw);
      setUrlError(null);
    } catch {
      setUrlError("URL inválida (incluye https://)");
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs">{label}</Label>}

      {/* Toggle */}
      <div className="flex gap-1 bg-muted rounded-md p-0.5 w-fit">
        <Button
          type="button"
          size="sm"
          variant={isFileMode ? "default" : "ghost"}
          className={cn("h-7 text-[11px] px-2.5", isFileMode && "shadow-sm")}
          onClick={() => setMode("file")}
          disabled={disabled}
        >
          <Upload className="h-3 w-3 mr-1" />
          Subir archivo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!isFileMode ? "default" : "ghost"}
          className={cn("h-7 text-[11px] px-2.5", !isFileMode && "shadow-sm")}
          onClick={() => setMode("url")}
          disabled={disabled}
        >
          <LinkIcon className="h-3 w-3 mr-1" />
          Agregar enlace
        </Button>
      </div>

      {/* File mode */}
      {isFileMode && (
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span className="truncate">{value.file ? value.file.name : "Seleccionar archivo…"}</span>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={accept}
              disabled={disabled}
              onChange={(e) => onChange({ mode: "file", file: e.target.files?.[0] || null })}
            />
          </label>
          {value.file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ mode: "file", file: null });
                if (fileRef.current) fileRef.current.value = "";
              }}
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* URL mode */}
      {!isFileMode && (
        <div className="space-y-1">
          <div className="relative">
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="url"
              inputMode="url"
              placeholder="https://drive.google.com/…"
              className="pl-8 text-sm h-9"
              value={value.url}
              disabled={disabled}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>
          {urlError && <p className="text-[10px] text-destructive">{urlError}</p>}
        </div>
      )}

      {helperText && <p className="text-[10px] text-muted-foreground">{helperText}</p>}
    </div>
  );
}

/**
 * Helper to validate a URL string. Returns null if empty/valid, or an error message.
 */
export function validateUrl(url: string): string | null {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return "URL inválida";
  }
}
