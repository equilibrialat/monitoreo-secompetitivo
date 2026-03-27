import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { TreeNode } from "@/data/mockActividades";
import { ActivityCard } from "@/components/ActivityCard";
import { cn } from "@/lib/utils";

interface TreeBranchProps {
  node: TreeNode;
  depth?: number;
  defaultOpen?: boolean;
}

export function TreeBranch({ node, depth = 0, defaultOpen = true }: TreeBranchProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const isActivity = !!node.actividad;

  if (isActivity) {
    return (
      <div className="ml-4">
        <ActivityCard actividad={node.actividad!} />
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
        <span
          className={cn(
            "text-sm font-medium text-foreground",
            depth === 0 && "text-base font-semibold"
          )}
        >
          {node.label}
        </span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground ml-auto">
            {node.children!.length}
          </span>
        )}
      </button>

      {open && hasChildren && (
        <div className="space-y-1 mt-1">
          {node.children!.map((child, i) => (
            <TreeBranch key={i} node={child} depth={depth + 1} defaultOpen={depth < 1} />
          ))}
        </div>
      )}
    </div>
  );
}
