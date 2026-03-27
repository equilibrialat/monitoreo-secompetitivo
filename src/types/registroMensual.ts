export interface GastoItem {
  id: string;
  tipo_gasto: string;
  monto: number;
  detalle: string;
  fecha: Date | undefined;
  referencia_comprobante: string;
}

export interface FuenteFinanciera {
  key: "seco" | "cm" | "cnm";
  label: string;
  presupuesto: number;
  ejecutado_acum: number;
  gastos: GastoItem[];
}

export interface RegistroCapacitacion {
  tema: string;
  num_participantes_hombres: number;
  num_participantes_mujeres: number;
  horas_capacitacion: number;
  lugar: string;
  fecha: Date | undefined;
  metodologia: string;
}

export interface RegistroMensualForm {
  mes: number;
  anio: number;
  valor_avance: number;
  estado: string;
  descripcion: string;
  fecha_ejecucion: Date | undefined;
  fuentes: FuenteFinanciera[];
  capacitacion?: RegistroCapacitacion;
}

export const ESTADOS_AVANCE = [
  { value: "no_iniciada", label: "No iniciada" },
  { value: "iniciado_1_35", label: "Iniciado (1-35%)" },
  { value: "en_proceso_36_65", label: "En proceso (36-65%)" },
  { value: "avanzado_66_99", label: "Avanzado (66-99%)" },
  { value: "culminado_100", label: "Culminado (100%)" },
];

export const TIPOS_GASTO = [
  "Honorarios / Consultorías",
  "Equipamiento",
  "Materiales e insumos",
  "Viáticos y movilidad",
  "Servicios (logística, impresión, etc.)",
  "Infraestructura",
  "Otros",
];

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const TAGS_CON_INDICADORES = ["capacitacion"] as const;

export function createEmptyGasto(): GastoItem {
  return {
    id: crypto.randomUUID(),
    tipo_gasto: "",
    monto: 0,
    detalle: "",
    fecha: undefined,
    referencia_comprobante: "",
  };
}
