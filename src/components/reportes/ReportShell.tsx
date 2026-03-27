import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { downloadCSV, formatCurrency } from "@/lib/reportUtils";

const ANIOS = [2024, 2025, 2026];
const TRIMESTRES = [
  { value: "T1", label: "T1 (Ene-Mar)" },
  { value: "T2", label: "T2 (Abr-Jun)" },
  { value: "T3", label: "T3 (Jul-Sep)" },
  { value: "T4", label: "T4 (Oct-Dic)" },
];
const SEMESTRES = [
  { value: "S1", label: "S1 (Ene-Jun)" },
  { value: "S2", label: "S2 (Jul-Dic)" },
];

export function usePeriodSelector() {
  const [trimestre, setTrimestre] = useState("T1");
  const [anioTrimestral, setAnioTrimestral] = useState("2025");
  const [semestre, setSemestre] = useState("S1");
  const [anioSemestral, setAnioSemestral] = useState("2025");
  const [anioAnual, setAnioAnual] = useState("2025");
  return { trimestre, setTrimestre, anioTrimestral, setAnioTrimestral, semestre, setSemestre, anioSemestral, setAnioSemestral, anioAnual, setAnioAnual, ANIOS, TRIMESTRES, SEMESTRES };
}

export function PeriodSelector({ label, type, value, onChange, anio, onAnioChange }: {
  label: string;
  type: "trimestre" | "semestre" | "anual";
  value: string;
  onChange: (v: string) => void;
  anio: string;
  onAnioChange: (v: string) => void;
}) {
  const options = type === "trimestre" ? TRIMESTRES : type === "semestre" ? SEMESTRES : [];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      {options.length > 0 && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={anio} onValueChange={onAnioChange}>
        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Semaforo({ value, thresholds = [15, 30] }: { value: number; thresholds?: [number, number] }) {
  const icon = value <= thresholds[0] ? "🟢" : value <= thresholds[1] ? "🟡" : "🔴";
  return <span title={`${value.toFixed(1)}%`}>{icon}</span>;
}

export function EmptyState({ message = "No hay registros para este período." }: { message?: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}

export function DownloadButton({ data, filename }: { data: Record<string, any>[]; filename: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => downloadCSV(data, filename)} disabled={data.length === 0}>
      <Download className="h-4 w-4 mr-2" /> Descargar CSV
    </Button>
  );
}

export { Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatCurrency, downloadCSV };
