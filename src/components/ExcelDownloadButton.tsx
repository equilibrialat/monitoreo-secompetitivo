import * as XLSX from "xlsx";
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
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, filename.replace(/\.csv$/, ".xlsx"), { bookType: "xlsx", type: "binary" });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 print:hidden" title="Descargar datos">
      <Download className="h-3 w-3" />
      {label}
    </Button>
  );
}
