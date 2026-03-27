import { useState, useEffect, useRef, useCallback } from "react";

interface UseAutoSaveOptions {
  interval?: number; // ms, default 30000
  onSave: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave({ interval = 30000, onSave, enabled = true }: UseAutoSaveOptions) {
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    dirtyRef.current = true;
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
    dirtyRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(async () => {
      if (dirtyRef.current && !isSaving) {
        setIsSaving(true);
        try {
          await onSave();
          setLastSaved(new Date());
          dirtyRef.current = false;
          setIsDirty(false);
        } catch {
          // silently fail
        }
        setIsSaving(false);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [interval, onSave, enabled, isSaving]);

  return { isDirty, isSaving, lastSaved, markDirty, markClean };
}
