import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailPanel({ open, onClose, title, children }: DetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <SheetTitle className="text-sm font-semibold flex-1 truncate">{title}</SheetTitle>
          </div>
        </SheetHeader>
        <div className="px-4 py-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
