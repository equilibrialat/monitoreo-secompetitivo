export function downloadCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

export const MESES_NOMBRE = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const TRIMESTRES_MESES: Record<string, number[]> = {
  T1: [1, 2, 3],
  T2: [4, 5, 6],
  T3: [7, 8, 9],
  T4: [10, 11, 12],
};

export const SEMESTRES_MESES: Record<string, number[]> = {
  S1: [1, 2, 3, 4, 5, 6],
  S2: [7, 8, 9, 10, 11, 12],
};
