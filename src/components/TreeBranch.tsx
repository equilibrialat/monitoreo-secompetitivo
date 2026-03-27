import { cn } from "@/lib/utils";
import type { TreeNode, ActividadDB } from "@/lib/supabaseQueries";
import { ActivityCard } from "@/components/ActivityCard";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { RegistroPendiente } from "@/lib/registroAprobacion";

interface TreeBranchProps {
  node: TreeNode;
  depth?: number;
  defaultOpen?: boolean;
  onRegistrar?: (actividad: ActividadDB) => void;
  registroMap?: Map<string, RegistroPendiente>;
  currentMonthStatusMap?: Map<string, string | null>;
}

export function TreeBranch({ node, depth = 0, defaultOpen = true, onRegistrar, registroMap, currentMonthStatusMap }: TreeBranchProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const isActivity = !!node.actividad;

  if (isActivity) {
    const registro = registroMap?.get(node.actividad!.id);
    const currentStatus = currentMonthStatusMap?.get(node.actividad!.id) ?? null;
    return (
      <div className="ml-4">
        <ActivityCard
          actividad={node.actividad!}
          onRegistrar={onRegistrar}
          ultimoRegistro={registro}
          currentMonthStatus={currentStatus}
        />
      </div>
    );
  }

  return (
    <div className={cn(depth > 0 && "ml-4 border-l border-border pl-3")}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 py-2 px-2 w-full text-left rounded-md hover:bg-muted/50 transition-colors group"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            open && "rotate-90"
          )}
        />
        <span className={cn("text-sm font-medium text-foreground", depth === 0 && "text-base font-semibold")}>
          {node.label}
        </span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground ml-auto">{node.children!.length}</span>
        )}
      </button>
      {open && hasChildren && (
        <div className="space-y-1 mt-1">
          {node.children!.map((child, i) => (
            <TreeBranch key={i} node={child} depth={depth + 1} defaultOpen={depth < 1} onRegistrar={onRegistrar} registroMap={registroMap} currentMonthStatusMap={currentMonthStatusMap} />
          ))}
        </div>
      )}
    </div>
  );
}
