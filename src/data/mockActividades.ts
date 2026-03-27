import type { AppRole } from "@/contexts/RoleContext";

export interface Actividad {
  id: string;
  codigo: string;
  nombre: string;
  meta_valor: number;
  meta_unidad_medida: string;
  presupuesto_seco: number;
  presupuesto_contrapartida_monetaria: number;
  presupuesto_contrapartida_no_monetaria: number;
  ejecutado_seco_acum: number;
  ejecutado_cm_acum: number;
  ejecutado_cnm_acum: number;
  avance_operativo_pct: number;
  estado_actual: string;
  tags: string[];
  resultado: string;
  producto: string;
}

// Mock data based on APPCACAO structure
export const MOCK_ACTIVIDADES: Actividad[] = [
  {
    id: "1",
    codigo: "R1.P1.A1",
    nombre: "Asistencia técnica en manejo integrado de plagas del cacao",
    meta_valor: 500,
    meta_unidad_medida: "productores",
    presupuesto_seco: 45000,
    presupuesto_contrapartida_monetaria: 12000,
    presupuesto_contrapartida_no_monetaria: 8000,
    ejecutado_seco_acum: 38200,
    ejecutado_cm_acum: 9500,
    ejecutado_cnm_acum: 6400,
    avance_operativo_pct: 72,
    estado_actual: "en_ejecucion",
    tags: ["campo", "fitosanidad"],
    resultado: "R1 - Incremento de productividad del cacao",
    producto: "P1 - Productores capacitados en MIP",
  },
  {
    id: "2",
    codigo: "R1.P1.A2",
    nombre: "Capacitación en fermentación y secado de cacao fino de aroma",
    meta_valor: 300,
    meta_unidad_medida: "productores",
    presupuesto_seco: 32000,
    presupuesto_contrapartida_monetaria: 8000,
    presupuesto_contrapartida_no_monetaria: 5000,
    ejecutado_seco_acum: 12800,
    ejecutado_cm_acum: 2400,
    ejecutado_cnm_acum: 1500,
    avance_operativo_pct: 35,
    estado_actual: "en_ejecucion",
    tags: ["postcosecha", "calidad", "capacitacion"],
    resultado: "R1 - Incremento de productividad del cacao",
    producto: "P1 - Productores capacitados en MIP",
  },
  {
    id: "3",
    codigo: "R1.P2.A1",
    nombre: "Instalación de jardines clonales con material genético mejorado",
    meta_valor: 15,
    meta_unidad_medida: "jardines",
    presupuesto_seco: 60000,
    presupuesto_contrapartida_monetaria: 20000,
    presupuesto_contrapartida_no_monetaria: 15000,
    ejecutado_seco_acum: 58000,
    ejecutado_cm_acum: 19200,
    ejecutado_cnm_acum: 14800,
    avance_operativo_pct: 95,
    estado_actual: "completado",
    tags: ["viveros", "genética"],
    resultado: "R1 - Incremento de productividad del cacao",
    producto: "P2 - Material genético disponible",
  },
  {
    id: "4",
    codigo: "R2.P1.A1",
    nombre: "Fortalecimiento organizacional de cooperativas cacaoteras",
    meta_valor: 8,
    meta_unidad_medida: "cooperativas",
    presupuesto_seco: 28000,
    presupuesto_contrapartida_monetaria: 10000,
    presupuesto_contrapartida_no_monetaria: 6000,
    ejecutado_seco_acum: 8400,
    ejecutado_cm_acum: 2000,
    ejecutado_cnm_acum: 1200,
    avance_operativo_pct: 22,
    estado_actual: "atrasado",
    tags: ["asociatividad", "gobernanza"],
    resultado: "R2 - Fortalecimiento de la cadena de valor",
    producto: "P1 - Cooperativas fortalecidas",
  },
  {
    id: "5",
    codigo: "R2.P2.A1",
    nombre: "Vinculación comercial con compradores de cacao especial",
    meta_valor: 5,
    meta_unidad_medida: "acuerdos comerciales",
    presupuesto_seco: 18000,
    presupuesto_contrapartida_monetaria: 5000,
    presupuesto_contrapartida_no_monetaria: 3000,
    ejecutado_seco_acum: 0,
    ejecutado_cm_acum: 0,
    ejecutado_cnm_acum: 0,
    avance_operativo_pct: 0,
    estado_actual: "pendiente",
    tags: ["comercialización", "mercados"],
    resultado: "R2 - Fortalecimiento de la cadena de valor",
    producto: "P2 - Acceso a mercados diferenciados",
  },
];

export interface TreeNode {
  label: string;
  children?: TreeNode[];
  actividad?: Actividad;
}

export function buildActivityTree(actividades: Actividad[]): TreeNode[] {
  const resultadoMap = new Map<string, Map<string, Actividad[]>>();

  for (const act of actividades) {
    if (!resultadoMap.has(act.resultado)) {
      resultadoMap.set(act.resultado, new Map());
    }
    const productoMap = resultadoMap.get(act.resultado)!;
    if (!productoMap.has(act.producto)) {
      productoMap.set(act.producto, []);
    }
    productoMap.get(act.producto)!.push(act);
  }

  const tree: TreeNode[] = [];
  for (const [resultado, productoMap] of resultadoMap) {
    const productoNodes: TreeNode[] = [];
    for (const [producto, acts] of productoMap) {
      productoNodes.push({
        label: producto,
        children: acts.map((a) => ({ label: a.codigo, actividad: a })),
      });
    }
    tree.push({ label: resultado, children: productoNodes });
  }
  return tree;
}
