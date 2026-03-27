import { LayoutDashboard } from "lucide-react";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Esta sección está en desarrollo.</p>
      </div>
    </div>
  );
}
