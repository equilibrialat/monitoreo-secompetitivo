import { useRole, ROLE_LABELS } from "@/contexts/RoleContext";
import { LayoutDashboard } from "lucide-react";

export default function Index() {
  const { role } = useRole();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Vista de {ROLE_LABELS[role]}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="h-2 w-20 rounded bg-muted mb-3" />
            <div className="h-8 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
