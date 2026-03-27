import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";

interface Props {
  isSaving: boolean;
  lastSaved: Date | null;
  isDirty: boolean;
}

export function AutoSaveIndicator({ isSaving, lastSaved, isDirty }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Guardando...</span>
      </div>
    );
  }

  if (lastSaved) {
    const seconds = Math.floor((now - lastSaved.getTime()) / 1000);
    const label = seconds < 10 ? "hace un momento" : seconds < 60 ? `hace ${seconds}s` : `hace ${Math.floor(seconds / 60)}min`;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Save className="h-3 w-3" />
        <span>💾 Guardado automáticamente {label}</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <span>● Cambios sin guardar</span>
      </div>
    );
  }

  return null;
}
