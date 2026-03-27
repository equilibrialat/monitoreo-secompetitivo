import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRole } from "@/contexts/RoleContext";
import { fetchNotificacionesForEntidad, countUnread, markAsRead, type Notificacion } from "@/lib/notificaciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPO_ICON: Record<string, string> = {
  recordatorio: "⏰",
  solicitud_info: "📋",
  aviso_general: "📢",
  auto_observado: "⚠️",
  auto_aprobado: "✅",
  auto_vencimiento: "🔔",
};

export function NotificationBell() {
  const { entidadId, role } = useRole();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<Notificacion | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const isEntidad = role === "entidad" && !!entidadId;

  useEffect(() => {
    if (!isEntidad || !entidadId) return;
    const load = async () => {
      const [data, count] = await Promise.all([
        fetchNotificacionesForEntidad(entidadId),
        countUnread(entidadId),
      ]);
      setNotifs(data);
      setUnreadCount(count);
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [entidadId, isEntidad]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isEntidad) return null;

  const handleClick = async (n: Notificacion) => {
    setSelected(n);
    if (!n.leido) {
      await markAsRead(n.id);
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, leido: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => { setOpen(!open); setSelected(null); }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border bg-card shadow-xl z-50">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Notificaciones</h3>
            <p className="text-[10px] text-muted-foreground">{unreadCount} sin leer</p>
          </div>

          {selected ? (
            <div className="p-4 space-y-2">
              <Button variant="ghost" size="sm" className="text-xs mb-1 -ml-2" onClick={() => setSelected(null)}>
                ← Volver
              </Button>
              <div className="flex items-center gap-2">
                <span>{TIPO_ICON[selected.tipo] ?? "📢"}</span>
                <span className="text-sm font-semibold">{selected.asunto}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(selected.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
              </p>
              <p className="text-xs text-foreground whitespace-pre-wrap mt-2">{selected.mensaje}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              {notifs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No hay notificaciones</p>
              ) : (
                <div className="divide-y">
                  {notifs.slice(0, 30).map((n) => (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${!n.leido ? "bg-primary/5" : ""}`}
                      onClick={() => handleClick(n)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm shrink-0">{TIPO_ICON[n.tipo] ?? "📢"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium truncate ${!n.leido ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.asunto}
                            </span>
                            {!n.leido && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{n.mensaje}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {format(new Date(n.created_at), "dd MMM HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
