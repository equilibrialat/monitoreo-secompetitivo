import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "./NotificationBell";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-end px-6 py-2 border-b bg-card shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
