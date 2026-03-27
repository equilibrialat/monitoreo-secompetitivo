export interface GastoItem {
  id: string;
  tipo_gasto: string;
  monto: number;
  detalle: string;
  fecha: Date | undefined;
  referencia_comprobante: string;
}

export interface FuenteFinanciera {
  key: "cofinanciamiento_seco" | "contrapartida_monetaria" | "contrapartida_no_monetaria";
  label: string;
  presupuesto: number;
  ejecutado_acum: number;
  gastos: GastoItem[];
}

export interface RegistroCapacitacion {
  nombre_accion_formativa: string;
  tipo_accion_formativa: string;
  tema: string;
  fecha_inicio: Date | undefined;
  fecha_fin: Date | undefined;
  departamento: string;
  modalidad: string;
  participantes: ParticipanteCapacitacion[];
}

export interface ParticipanteCapacitacion {
  id: string;
  num_documento: string;
  apellidos: string;
  nombres: string;
  genero: "M" | "F" | "";
  nombre_organizacion: string;
  aplico_aprendizaje: boolean | null;
}

export interface RegistroInnovacion {
  activo: boolean;
  nombre_innovacion: string;
  optimizacion_recursos: boolean;
  optimizacion_procesos: boolean;
  tecnificacion_mecanizacion: boolean;
  digitalizacion_trazabilidad: boolean;
  sostenibilidad_certificaciones: boolean;
  valor_agregado_calidad: boolean;
  ruc_organizacion: string;
  nombre_organizacion: string;
}

export interface RegistroGei {
  activo: boolean;
  tipo_accion: string;
  nombre_practica: string;
  categoria: string;
  etapa_implementacion: string;
  ruc_organizacion: string;
  nombre_organizacion: string;
}

export interface RegistroNuevoProducto {
  activo: boolean;
  nombre_producto: string;
  cadena_valor: string;
  transformacion_primario: boolean;
  mejora_empaque: boolean;
  diferenciacion_origen: boolean;
  incorpora_innovacion: boolean;
  ruc_organizacion: string;
  nombre_organizacion: string;
}

export interface ContextualData {
  capacitacion?: RegistroCapacitacion;
  innovacion?: RegistroInnovacion;
  gei?: RegistroGei;
  nuevo_producto?: RegistroNuevoProducto;
}

export interface RegistroMensualForm {
  mes: number;
  anio: number;
  valor_avance: number;
  estado: string;
  descripcion: string;
  fecha_ejecucion: Date | undefined;
  fuentes: FuenteFinanciera[];
  contextual: ContextualData;
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

export function createEmptyCapacitacion(): RegistroCapacitacion {
  return {
    nombre_accion_formativa: "", tipo_accion_formativa: "", tema: "",
    fecha_inicio: undefined, fecha_fin: undefined, departamento: "", modalidad: "",
    participantes: [],
  };
}

export function createEmptyParticipante(): ParticipanteCapacitacion {
  return {
    id: crypto.randomUUID(),
    num_documento: "", apellidos: "", nombres: "", genero: "",
    nombre_organizacion: "", aplico_aprendizaje: null,
  };
}

export function createEmptyInnovacion(): RegistroInnovacion {
  return {
    activo: false, nombre_innovacion: "",
    optimizacion_recursos: false, optimizacion_procesos: false,
    tecnificacion_mecanizacion: false, digitalizacion_trazabilidad: false,
    sostenibilidad_certificaciones: false, valor_agregado_calidad: false,
    ruc_organizacion: "", nombre_organizacion: "",
  };
}

export function createEmptyGei(): RegistroGei {
  return {
    activo: false, tipo_accion: "", nombre_practica: "", categoria: "",
    etapa_implementacion: "", ruc_organizacion: "", nombre_organizacion: "",
  };
}

export function createEmptyNuevoProducto(): RegistroNuevoProducto {
  return {
    activo: false, nombre_producto: "", cadena_valor: "",
    transformacion_primario: false, mejora_empaque: false,
    diferenciacion_origen: false, incorpora_innovacion: false,
    ruc_organizacion: "", nombre_organizacion: "",
  };
}
