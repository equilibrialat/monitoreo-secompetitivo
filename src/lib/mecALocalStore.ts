// ─── localStorage store for Mec A demo data ───────────────────────────────────

const DEMO_INI_ID = "demo-ini-senasa-2025";

export const DEMO_DATA = {
  mec_a_iniciativas: [
    {
      id: DEMO_INI_ID,
      nombre: "Fortalecimiento de capacidades de inocuidad alimentaria en cadena frutícola",
      epb_nombre: "Servicio Nacional de Sanidad Agraria",
      epb_siglas: "SENASA",
      fecha_inicio: "2025-01-01",
      fecha_fin: "2026-12-31",
      presupuesto_seco_usd: 185000,
      estado: "activa",
      gestor_user_id: null,
      created_by: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ],
  mec_a_resultados: [
    { id: "res-1", iniciativa_id: DEMO_INI_ID, numero: "R1", nombre: "SENASA mejora su sistema de control de inocuidad en frutas de exportación", indicador_nombre: "% de predios certificados", indicador_unidad: "%", indicador_meta: 80, orden: 0, created_at: "2025-01-01T00:00:00Z" },
    { id: "res-2", iniciativa_id: DEMO_INI_ID, numero: "R2", nombre: "Operadores de la cadena frutícola aplican BPA y BPM", indicador_nombre: "Nº de operadores capacitados", indicador_unidad: "Personas", indicador_meta: 120, orden: 1, created_at: "2025-01-01T00:00:00Z" },
  ],
  mec_a_productos: [
    { id: "prod-1-1", resultado_id: "res-1", iniciativa_id: DEMO_INI_ID, numero: "P1.1", nombre: "Sistema de trazabilidad implementado", orden: 0, created_at: "2025-01-01T00:00:00Z" },
    { id: "prod-1-2", resultado_id: "res-1", iniciativa_id: DEMO_INI_ID, numero: "P1.2", nombre: "Protocolo de inspección actualizado", orden: 1, created_at: "2025-01-01T00:00:00Z" },
    { id: "prod-2-1", resultado_id: "res-2", iniciativa_id: DEMO_INI_ID, numero: "P2.1", nombre: "Programa de capacitación en BPA ejecutado", orden: 0, created_at: "2025-01-01T00:00:00Z" },
  ],
  mec_a_actividades: [
    { id: "act-1", producto_id: "prod-1-1", iniciativa_id: DEMO_INI_ID, codigo: "1.1.1", descripcion: "Diseño e implementación del sistema de trazabilidad digital para predios frutícolas", unidad_medida: "Sistema", meta_total: 1, seco_honorarios_usd: 28000, seco_viaticos_usd: 4500, seco_servicios_usd: 12000, seco_materiales_usd: 2000, cm_honorarios_usd: 8000, cm_viaticos_usd: 1200, cm_servicios_usd: 3000, cm_materiales_usd: 500, cnm_total_usd: 5000, orden: 0, meses_programados: ['2026-04'], created_at: "2025-01-01T00:00:00Z" },
    { id: "act-2", producto_id: "prod-1-1", iniciativa_id: DEMO_INI_ID, codigo: "1.1.2", descripcion: "Piloto de trazabilidad en 3 predios certificados de Ica", unidad_medida: "Predio", meta_total: 3, seco_honorarios_usd: 15000, seco_viaticos_usd: 6000, seco_servicios_usd: 5000, seco_materiales_usd: 1500, cm_honorarios_usd: 4000, cm_viaticos_usd: 2000, cm_servicios_usd: 1000, cm_materiales_usd: 300, cnm_total_usd: 3000, orden: 1, meses_programados: ['2026-03','2026-06'], created_at: "2025-01-01T00:00:00Z" },
    { id: "act-3", producto_id: "prod-1-2", iniciativa_id: DEMO_INI_ID, codigo: "1.2.1", descripcion: "Revisión y actualización del protocolo de inspección fitosanitaria", unidad_medida: "Protocolo", meta_total: 1, seco_honorarios_usd: 18000, seco_viaticos_usd: 2500, seco_servicios_usd: 8000, seco_materiales_usd: 1000, cm_honorarios_usd: 5000, cm_viaticos_usd: 800, cm_servicios_usd: 2000, cm_materiales_usd: 200, cnm_total_usd: 2500, orden: 0, meses_programados: ['2026-05'], created_at: "2025-01-01T00:00:00Z" },
    { id: "act-4", producto_id: "prod-2-1", iniciativa_id: DEMO_INI_ID, codigo: "2.1.1", descripcion: "Taller de BPA para productores de arándano en La Libertad", unidad_medida: "Taller", meta_total: 4, seco_honorarios_usd: 12000, seco_viaticos_usd: 8000, seco_servicios_usd: 4000, seco_materiales_usd: 3000, cm_honorarios_usd: 3000, cm_viaticos_usd: 2500, cm_servicios_usd: 1000, cm_materiales_usd: 800, cnm_total_usd: 4000, orden: 0, meses_programados: ['2026-04'], created_at: "2025-01-01T00:00:00Z" },
    { id: "act-5", producto_id: "prod-2-1", iniciativa_id: DEMO_INI_ID, codigo: "2.1.2", descripcion: "Capacitación en BPM para operadores de plantas empacadoras", unidad_medida: "Persona", meta_total: 60, seco_honorarios_usd: 10000, seco_viaticos_usd: 5000, seco_servicios_usd: 3000, seco_materiales_usd: 2000, cm_honorarios_usd: 2500, cm_viaticos_usd: 1500, cm_servicios_usd: 800, cm_materiales_usd: 500, cnm_total_usd: 3500, orden: 1, meses_programados: ['2026-06'], created_at: "2025-01-01T00:00:00Z" },
  ],
  mec_a_avance_operativo: [
    { id: "avo-1", actividad_id: "act-1", iniciativa_id: DEMO_INI_ID, anio: 2025, mes: 3, unidades_planif: 0.25, unidades_ejecut: 0.20, logros: "Se completó el diseño conceptual del sistema. Se firmó contrato con proveedor TI y se inició el desarrollo del módulo de registro de predios.", comentarios: "Ligero retraso por demoras en proceso de adquisición.", registrado_por: null, created_at: "2025-03-31T00:00:00Z", updated_at: "2025-03-31T00:00:00Z" },
    { id: "avo-2", actividad_id: "act-2", iniciativa_id: DEMO_INI_ID, anio: 2025, mes: 3, unidades_planif: 1, unidades_ejecut: 1, logros: "Se identificó y certificó el primer predio piloto en Ica. Productores capacitados en uso del sistema.", comentarios: null, registrado_por: null, created_at: "2025-03-31T00:00:00Z", updated_at: "2025-03-31T00:00:00Z" },
    { id: "avo-3", actividad_id: "act-4", iniciativa_id: DEMO_INI_ID, anio: 2025, mes: 3, unidades_planif: 1, unidades_ejecut: 1, logros: "Primer taller BPA ejecutado en Trujillo con 32 productores. Material entregado. Evaluación post-capacitación promedio 8.2/10.", comentarios: null, registrado_por: null, created_at: "2025-03-31T00:00:00Z", updated_at: "2025-03-31T00:00:00Z" },
    { id: "avo-4", actividad_id: "act-5", iniciativa_id: DEMO_INI_ID, anio: 2025, mes: 3, unidades_planif: 15, unidades_ejecut: 18, logros: null, comentarios: "Mayor asistencia de la esperada. Se priorizó planta Virú Export.", registrado_por: null, created_at: "2025-03-31T00:00:00Z", updated_at: "2025-03-31T00:00:00Z" },
  ],
  mec_a_entregables_consultores: [
    { id: "ent-1", actividad_id: "act-1", iniciativa_id: DEMO_INI_ID, consultor_nombre: "Ing. Roberto Quispe Salinas", consultor_dni_ruc: "10234567890", objetivo_consultoria: "Diseño e implementación del sistema de trazabilidad digital", numero_contrato: "N° 30-2025-SeCompetitivo", fecha_inicio_contrato: "2025-01-15", fecha_fin_contrato: "2025-06-30", numero_producto: "P1", descripcion_producto: "Documento de diseño técnico del sistema de trazabilidad", presupuesto_soles: 28000, presupuesto_usd: 7467, plazo_entrega: "2025-03-15", fecha_recepcion: "2025-03-14", estado_producto: "conforme", observaciones_tecnicas: "Producto entregado completo y dentro del plazo.", medidas_correctivas: null, fecha_no_objecion: null, fecha_pago: "2025-03-28", monto_comprobante_soles: 28000, tipo_cambio: 3.75, pago_usd: 7467, numero_comprobante: "F001-00234", registrado_por: null, created_at: "2025-01-15T00:00:00Z", updated_at: "2025-03-28T00:00:00Z" },
    { id: "ent-2", actividad_id: "act-1", iniciativa_id: DEMO_INI_ID, consultor_nombre: "Ing. Roberto Quispe Salinas", consultor_dni_ruc: "10234567890", objetivo_consultoria: "Diseño e implementación del sistema de trazabilidad digital", numero_contrato: "N° 30-2025-SeCompetitivo", fecha_inicio_contrato: "2025-01-15", fecha_fin_contrato: "2025-06-30", numero_producto: "P2", descripcion_producto: "Software del sistema de trazabilidad instalado y probado en servidor SENASA", presupuesto_soles: 42000, presupuesto_usd: 11200, plazo_entrega: "2025-05-30", fecha_recepcion: null, estado_producto: "pendiente", observaciones_tecnicas: null, medidas_correctivas: null, fecha_no_objecion: null, fecha_pago: null, monto_comprobante_soles: null, tipo_cambio: null, pago_usd: null, numero_comprobante: null, registrado_por: null, created_at: "2025-01-15T00:00:00Z", updated_at: "2025-01-15T00:00:00Z" },
    { id: "ent-3", actividad_id: "act-4", iniciativa_id: DEMO_INI_ID, consultor_nombre: "Lic. María Fernanda Ochoa", consultor_dni_ruc: "10456789012", objetivo_consultoria: "Facilitación de talleres BPA para productores frutícolas", numero_contrato: "N° 31-2025-SeCompetitivo", fecha_inicio_contrato: "2025-02-01", fecha_fin_contrato: "2025-11-30", numero_producto: "P1", descripcion_producto: "Informe del primer taller BPA — La Libertad", presupuesto_soles: 8500, presupuesto_usd: 2267, plazo_entrega: "2025-04-10", fecha_recepcion: "2025-04-08", estado_producto: "conforme", observaciones_tecnicas: "Informe completo con lista de asistentes, fotos y evaluaciones.", medidas_correctivas: null, fecha_no_objecion: null, fecha_pago: null, monto_comprobante_soles: null, tipo_cambio: null, pago_usd: null, numero_comprobante: null, registrado_por: null, created_at: "2025-02-01T00:00:00Z", updated_at: "2025-04-08T00:00:00Z" },
  ],
  mec_a_contrapartida_monetaria: [
    { id: "cm-1", actividad_id: "act-2", iniciativa_id: DEMO_INI_ID, tipo_recurso: "viajes_viaticos", fecha_comprobante: "2025-03-10", nombre_proveedor: "Transportes Cruz del Sur S.A.C.", numero_comprobante: "F002-00891", concepto: "Pasajes Lima-Ica-Lima para equipo técnico SENASA (3 personas)", monto_soles: 1890, tipo_cambio: 3.75, monto_usd: 504, registrado_por: null, created_at: "2025-03-10T00:00:00Z" },
    { id: "cm-2", actividad_id: "act-4", iniciativa_id: DEMO_INI_ID, tipo_recurso: "materiales", fecha_comprobante: "2025-03-12", nombre_proveedor: "Imprenta Digital Perú E.I.R.L.", numero_comprobante: "B001-01234", concepto: "Impresión de 50 manuales BPA full color + separatas técnicas", monto_soles: 2750, tipo_cambio: 3.75, monto_usd: 733, registrado_por: null, created_at: "2025-03-12T00:00:00Z" },
    { id: "cm-3", actividad_id: "act-5", iniciativa_id: DEMO_INI_ID, tipo_recurso: "servicios_terceros", fecha_comprobante: "2025-03-25", nombre_proveedor: "Centro de Convenciones Virú E.I.R.L.", numero_comprobante: "F001-00567", concepto: "Alquiler de sala y servicio de catering para capacitación BPM (1 día, 18 asistentes)", monto_soles: 3200, tipo_cambio: 3.76, monto_usd: 851, registrado_por: null, created_at: "2025-03-25T00:00:00Z" },
  ],
  mec_a_contrapartida_no_monetaria: [
    { id: "cnm-1", actividad_id: "act-1", iniciativa_id: DEMO_INI_ID, fecha_actividad: "2025-02-05", nombre_funcionario: "Lic. Carmen Rosa Huamán Vallejos", cargo_funcionario: "Jefa de la Unidad de Inocuidad Alimentaria", concepto: "Reunión de coordinación con equipo técnico SENASA para definir requerimientos del sistema de trazabilidad", unidad_medida: "Hora", cantidad: 4, costo_unitario_soles: 125, total_soles: 500, tipo_cambio: 3.75, total_usd: 133, registrado_por: null, created_at: "2025-02-05T00:00:00Z" },
    { id: "cnm-2", actividad_id: "act-2", iniciativa_id: DEMO_INI_ID, fecha_actividad: "2025-03-08", nombre_funcionario: "Ing. José Luis Vargas Palomino", cargo_funcionario: "Especialista en Certificación Fitosanitaria", concepto: "Acompañamiento técnico en visita a predio piloto Fundo San Juan — Ica", unidad_medida: "Hora", cantidad: 8, costo_unitario_soles: 112.5, total_soles: 900, tipo_cambio: 3.75, total_usd: 240, registrado_por: null, created_at: "2025-03-08T00:00:00Z" },
    { id: "cnm-3", actividad_id: "act-4", iniciativa_id: DEMO_INI_ID, fecha_actividad: "2025-03-20", nombre_funcionario: "Lic. Carmen Rosa Huamán Vallejos", cargo_funcionario: "Jefa de la Unidad de Inocuidad Alimentaria", concepto: "Palabras de apertura y supervisión del Taller BPA Trujillo", unidad_medida: "Hora", cantidad: 3, costo_unitario_soles: 125, total_soles: 375, tipo_cambio: 3.75, total_usd: 100, registrado_por: null, created_at: "2025-03-20T00:00:00Z" },
  ],
  mec_a_reasignaciones: [
    {
      id: "rea-1", iniciativa_id: DEMO_INI_ID, tipo: "entre_productos",
      actividad_origen_id: "act-1", actividad_destino_id: "act-2",
      monto_usd: 2500, porcentaje: 8.9, justificacion: "Monto requerido para expandir el alcance del piloto a 2 predios adicionales tras identificar ahorros en el diseño del sistema.",
      estado: "pendiente", fecha_solicitud: "2025-03-28T10:00:00Z",
      comentario_claudia: null, fecha_resolucion: null, solicitado_por: null, resuelto_por: null
    },
    {
      id: "rea-2", iniciativa_id: DEMO_INI_ID, tipo: "entre_resultados",
      actividad_origen_id: "act-4", actividad_destino_id: "act-1",
      monto_usd: 1200, porcentaje: 4.4, justificacion: "Ajuste por menor costo en la organización logística del taller en Trujillo. Se traslada saldo al producto 1.1 para mejoras técnicas.",
      estado: "aprobado", fecha_solicitud: "2025-02-15T09:00:00Z",
      comentario_claudia: "Procede el ajuste. Al ser menor al 10% no requiere No Objeción de SECO.", fecha_resolucion: "2025-02-16T11:00:00Z", solicitado_por: null, resuelto_por: null
    }
  ] as any[],
};

// ─── CRUD helpers ──────────────────────────────────────────────────────────────

type StoreKey = keyof typeof DEMO_DATA;

export function lsGet<T>(key: StoreKey): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function lsSet<T>(key: StoreKey, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function lsInsert<T extends { id?: string }>(key: StoreKey, item: T): T {
  const all = lsGet<T>(key);
  const withId = { ...item, id: item.id ?? crypto.randomUUID(), created_at: new Date().toISOString() } as T;
  lsSet(key, [...all, withId]);
  return withId;
}

export function lsUpdate<T extends { id: string }>(key: StoreKey, id: string, patch: Partial<T>): void {
  const all = lsGet<T>(key);
  lsSet(key, all.map(r => (r as any).id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r));
}

export function lsDelete(key: StoreKey, id: string): void {
  const all = lsGet<any>(key);
  lsSet(key, all.filter((r: any) => r.id !== id));
}

export function lsFilter<T>(key: StoreKey, pred: (r: T) => boolean): T[] {
  return lsGet<T>(key).filter(pred);
}

// ─── Seed & clear ─────────────────────────────────────────────────────────────

export function seedLocalStorage(): void {
  Object.entries(DEMO_DATA).forEach(([key, data]) => {
    lsSet(key as StoreKey, data as any[]);
  });
}

export function clearLocalStorage(): void {
  Object.keys(DEMO_DATA).forEach(key => localStorage.removeItem(key));
}

export function isLocalMode(): boolean {
  return !!localStorage.getItem("mec_a_local_mode");
}

export function enableLocalMode(): void {
  localStorage.setItem("mec_a_local_mode", "1");
}

export function disableLocalMode(): void {
  localStorage.removeItem("mec_a_local_mode");
}

export function getLocalIniciativaId(): string {
  return DEMO_DATA.mec_a_iniciativas[0]?.id ?? DEMO_INI_ID;
}
