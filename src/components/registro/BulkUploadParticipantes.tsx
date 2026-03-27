import { useRef, useState } from "react";
import { Upload, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { ParticipanteCapacitacion } from "@/types/registroMensual";

interface ParsedRow {
  dni: string;
  apellidos: string;
  nombres: string;
  genero: string;
  organizacion: string;
  aplico: string;
  errors: string[];
  valid: boolean;
}

interface Props {
  onImport: (participantes: ParticipanteCapacitacion[]) => void;
}

function normalize(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  if (!row.dni) errors.push("DNI vacío");
  else if (!/^\d{8}$/.test(row.dni)) errors.push("DNI debe tener 8 dígitos");
  if (!row.apellidos) errors.push("Apellidos vacío");
  if (!row.nombres) errors.push("Nombres vacío");
  if (row.genero && !["M", "F"].includes(row.genero.toUpperCase())) errors.push("Género debe ser M o F");
  return errors;
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["DNI", "Apellidos", "Nombres", "Género (M/F)", "Organización", "¿Aplicó aprendizaje? (Sí/No)"],
    ["45678901", "Pérez García", "Juan Carlos", "M", "Cooperativa Agraria", "Sí"],
  ]);
  ws["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participantes");
  XLSX.writeFile(wb, "Plantilla_Participantes.xlsx");
}

export function BulkUploadParticipantes({ onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", codepage: 65001 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

    const parsed: ParsedRow[] = jsonData.map((r: any) => {
      const keys = Object.keys(r);
      const dni = normalize(r[keys[0]]);
      const apellidos = normalize(r[keys[1]]);
      const nombres = normalize(r[keys[2]]);
      const genero = normalize(r[keys[3]]).toUpperCase();
      const organizacion = normalize(r[keys[4]]);
      const aplico = normalize(r[keys[5]]);

      const row: ParsedRow = { dni, apellidos, nombres, genero, organizacion, aplico, errors: [], valid: false };
      row.errors = validateRow(row);
      row.valid = row.errors.length === 0;
      return row;
    });

    setRows(parsed);
    setParsing(false);
    setOpen(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateRow = (idx: number, field: keyof ParsedRow, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      updated.errors = validateRow(updated);
      updated.valid = updated.errors.length === 0;
      return updated;
    }));
  };

  const validCount = rows.filter(r => r.valid).length;
  const errorCount = rows.length - validCount;

  const handleImport = () => {
    const participantes: ParticipanteCapacitacion[] = rows
      .filter(r => r.valid)
      .map(r => ({
        id: crypto.randomUUID(),
        num_documento: r.dni,
        apellidos: r.apellidos,
        nombres: r.nombres,
        genero: (r.genero === "M" || r.genero === "F" ? r.genero : "") as "M" | "F" | "",
        nombre_organizacion: r.organizacion,
        aplico_aprendizaje: r.aplico.toLowerCase() === "sí" || r.aplico.toLowerCase() === "si" ? true
          : r.aplico.toLowerCase() === "no" ? false : null,
      }));
    onImport(participantes);
    setOpen(false);
    setRows([]);
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFile} />

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Subir lista Excel
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={downloadTemplate}>
          <Download className="h-3 w-3 mr-1" /> Descargar plantilla
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar participantes desde archivo</DialogTitle>
            <DialogDescription>
              Revisa los datos antes de importar. Las filas con error se pueden corregir inline.
            </DialogDescription>
          </DialogHeader>

          {parsing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Procesando archivo...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Badge className="bg-emerald-500/15 text-emerald-700">{validCount} válidos</Badge>
                {errorCount > 0 && <Badge className="bg-destructive/15 text-destructive">{errorCount} con errores</Badge>}
                <span className="text-muted-foreground">de {rows.length} filas</span>
              </div>

              <div className="overflow-auto flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]">#</TableHead>
                      <TableHead className="w-[100px]">DNI</TableHead>
                      <TableHead>Apellidos</TableHead>
                      <TableHead>Nombres</TableHead>
                      <TableHead className="w-[60px]">Género</TableHead>
                      <TableHead>Organización</TableHead>
                      <TableHead className="w-[80px]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx} className={!row.valid ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs" value={row.dni}
                            onChange={e => updateRow(idx, "dni", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs" value={row.apellidos}
                            onChange={e => updateRow(idx, "apellidos", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs" value={row.nombres}
                            onChange={e => updateRow(idx, "nombres", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs w-[50px]" value={row.genero}
                            onChange={e => updateRow(idx, "genero", e.target.value.toUpperCase())} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs" value={row.organizacion}
                            onChange={e => updateRow(idx, "organizacion", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              <span className="text-[9px] text-destructive">{row.errors[0]}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setRows([]); }}>Cancelar</Button>
            <Button onClick={handleImport} disabled={validCount === 0}>
              Importar {validCount} válidos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
