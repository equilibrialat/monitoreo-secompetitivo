import { downloadCSV } from "@/lib/reportUtils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  data: Record<string, any>[];
  filename: string;
  label?: string;
}

export default function ExcelDownloadButton({ data, filename, label = "Excel" }: Props) {
  function handleDownload() {
    if (data.length === 0) return;
    // Use CSV with BOM for Excel compatibility (already UTF-8 with BOM in reportUtils)
    downloadCSV(data, filename.replace(/\.xlsx$/, ".csv"));
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 print:hidden" title="Descargar datos">
      <Download className="h-3 w-3" />
      {label}
    </Button>
  );
}
