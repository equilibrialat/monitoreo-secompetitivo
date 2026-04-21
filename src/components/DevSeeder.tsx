import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, Trash2, FlaskConical } from "lucide-react";
import {
  seedLocalStorage, clearLocalStorage, isLocalMode,
  enableLocalMode, disableLocalMode, getLocalIniciativaId,
} from "@/lib/mecALocalStore";
import { useRole } from "@/contexts/RoleContext";

export function DevSeeder() {
  const [localMode, setLocalMode] = useState(isLocalMode());
  const { setRole, setIniciativaId } = useRole();
  const navigate = useNavigate();

  function handleSeed() {
    seedLocalStorage();
    enableLocalMode();
    setLocalMode(true);
    const iniId = getLocalIniciativaId();
    setIniciativaId(iniId);
    setRole("gestor_iniciativa");
    toast.success("✅ Datos demo cargados — modo local activado");
    navigate(`/mec-a/iniciativa/${iniId}`);
  }

  function handleClear() {
    clearLocalStorage();
    disableLocalMode();
    setLocalMode(false);
    setIniciativaId(null);
    toast.info("🗑️ Datos demo eliminados — modo Supabase restaurado");
  }

  return (
    <div className="mx-3 mb-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Modo Demo</span>
        {localMode && (
          <span className="ml-auto text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">ACTIVO</span>
        )}
      </div>
      {!localMode ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={handleSeed}
        >
          <Database className="h-3 w-3" />
          Cargar datos demo
        </Button>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            Iniciativa SENASA cargada en localStorage
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-6 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleSeed}
            >
              Resetear
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-6 text-[10px] gap-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleClear}
            >
              <Trash2 className="h-2.5 w-2.5" />
              Limpiar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
