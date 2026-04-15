import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "./NotificationBell";
import { StatusLegendFab } from "./StatusLegend";
import { TrimestreHeader } from "./TrimestreHeader";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar — always visible, never collapsible */}
      {!isMobile && <AppSidebar />}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            <AppSidebar mobileOpen onMobileClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center justify-between px-4 md:px-6 py-2 border-b bg-card shrink-0 min-h-[48px]">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 -ml-1 rounded-md hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            {isMobile && (
              <span className="text-sm font-semibold text-foreground">
                Se<span className="text-primary">Competitivo</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <TrimestreHeader />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <StatusLegendFab />
        <div className="shrink-0 border-t px-4 py-1.5 text-[10px] text-muted-foreground text-center bg-card">
          MVP — Mecanismo B · 3 entidades activas
        </div>
      </div>
    </div>
  );
}
