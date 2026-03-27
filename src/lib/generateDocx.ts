import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} from "docx";
import { saveAs } from "file-saver";
import { formatCurrency, MESES_NOMBRE } from "./reportUtils";

const BLUE_DARK = "0F2B46";
const BLUE_LIGHT = "D5E8F0";
const GRAY_LIGHT = "F3F4F6";
const WHITE = "FFFFFF";
const RED = "DC2626";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 };

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 18, color: WHITE })] })],
  });
}

function dataCell(text: string, width: number, opts?: { bold?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shade?: string }): TableCell {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts?.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      alignment: opts?.align,
      children: [new TextRun({ text: text || "—", font: "Arial", size: 18, bold: opts?.bold, color: opts?.color })],
    })],
  });
}

function sectionHeading(number: number, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
    children: [new TextRun({ text: `  SECCIÓN ${number} — ${title}`, bold: true, font: "Arial", size: 22, color: WHITE })],
  });
}

interface ReportData {
  entidadNombre: string;
  entidad: any;
  trimestre: string;
  anio: number;
  mesLabels: string[];
  meses: number[];
  actividades: any[];
  registros: any[];
  gastos: any[];
  capacitaciones: any[];
  innovaciones: any[];
  gei: any[];
  nuevosProductos: any[];
  normativo: any[];
  contratos: any[];
  desembolsos: any[];
  aiSummary: string | null;
  // Computed
  actConAvance: Set<string>;
  actCulminadas: Set<string>;
  totalSeco: number;
  totalCM: number;
  totalCNM: number;
  totalPresupuestoSeco: number;
  totalEjecAcumSeco: number;
  pctEjecTotal: string;
  regByActMes: Map<string, Map<number, any>>;
  grouped: Map<string, Map<string, any[]>>;
  gastosByActFuente: Map<string, Record<string, number[]>>;
  capByAct: Map<string, any[]>;
}

export async function generateTrimestralDocx(data: ReportData) {
  const {
    entidadNombre, entidad, trimestre, anio, mesLabels, meses,
    actividades, registros, gastos, capacitaciones, innovaciones, gei,
    nuevosProductos, normativo, contratos, desembolsos, aiSummary,
    actConAvance, actCulminadas, totalSeco, totalCM, totalCNM,
    totalPresupuestoSeco, totalEjecAcumSeco, pctEjecTotal,
    regByActMes, grouped, gastosByActFuente, capByAct
  } = data;

  const children: (Paragraph | Table)[] = [];

  // ---- HEADER ----
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `INFORME TRIMESTRAL ${trimestre}-${anio} (${mesLabels.join(" – ")})`, bold: true, font: "Arial", size: 32, color: BLUE_DARK })],
  }));
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "Entidad: ", font: "Arial", size: 22 }),
      new TextRun({ text: entidadNombre, bold: true, font: "Arial", size: 22 }),
    ],
  }));
  if (entidad) {
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: `Mecanismo ${entidad.mecanismo === "mec_b" ? "B" : "A"} | Región: ${entidad.region || "—"} | CdV: ${entidad.cadena_valor || "—"}`, font: "Arial", size: 20, color: "666666" })],
    }));
  }
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: `Fecha de generación: ${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}`, font: "Arial", size: 18, color: "999999" })],
  }));

  // ---- SECTION 1: AI SUMMARY ----
  if (aiSummary) {
    children.push(sectionHeading(1, "RESUMEN EJECUTIVO"));
    aiSummary.split("\n").filter(Boolean).forEach(p => {
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: p, font: "Arial", size: 22, italics: true })],
      }));
    });
  }

  // ---- SECTION 2: KPIs ----
  children.push(sectionHeading(2, "KPIs DEL TRIMESTRE"));
  const kpiCols = [
    { label: "Act. con avance", value: `${actConAvance.size} de ${actividades.length}` },
    { label: "Act. culminadas", value: String(actCulminadas.size) },
    { label: "Ejec. SECO Trim.", value: formatCurrency(totalSeco) },
    { label: "C. Monetaria", value: formatCurrency(totalCM) },
    { label: "C. No Mon.", value: formatCurrency(totalCNM) },
    { label: "% Ejec. Acum.", value: `${pctEjecTotal}%` },
  ];
  const kpiColWidth = Math.floor(9360 / 3);
  for (let i = 0; i < kpiCols.length; i += 3) {
    const row = kpiCols.slice(i, i + 3);
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: row.map(() => kpiColWidth),
      rows: [
        new TableRow({ children: row.map(k => new TableCell({
          borders: cellBorders, width: { size: kpiColWidth, type: WidthType.DXA },
          shading: { fill: BLUE_LIGHT, type: ShadingType.CLEAR }, margins: cellMargins,
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.label, font: "Arial", size: 16, color: "666666" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.value, font: "Arial", size: 24, bold: true })] }),
          ],
        })) }),
      ],
    }));
  }

  // ---- SECTION 3: AVANCE OPERATIVO ----
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeading(3, "AVANCE OPERATIVO"));

  const opColWidths = [1200, 2200, 500, 500, 500, 500, 500, 600, 500, 700];
  const opHeaders = ["Código", "Actividad", "Meta", "Unid.", ...mesLabels.map(m => m.substring(0, 3)), "Acum.", "%", "Estado"];
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: opColWidths,
    rows: [
      new TableRow({ children: opColWidths.map((w, i) => headerCell(opHeaders[i] || "", w)) }),
      ...actividades.map((a, idx) => {
        const regs = regByActMes.get(a.id);
        const vals = meses.map(m => regs?.get(m)?.avance_valor ?? 0);
        const acumTrim = vals.reduce((s, v) => s + v, 0);
        const pct = a.meta_valor ? ((acumTrim / a.meta_valor) * 100) : 0;
        const lastEstado = regs ? Array.from(regs.values()).sort((x: any, y: any) => y.mes - x.mes)[0]?.estado : "";
        const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
        return new TableRow({
          children: [
            dataCell(a.codigo, opColWidths[0], { shade }),
            dataCell(a.nombre, opColWidths[1], { shade }),
            dataCell(String(a.meta_valor ?? "—"), opColWidths[2], { shade, align: AlignmentType.RIGHT }),
            dataCell(a.meta_unidad_medida || "—", opColWidths[3], { shade }),
            ...vals.map((v, i) => dataCell(v ? String(v) : "—", opColWidths[4 + i], { shade, align: AlignmentType.RIGHT })),
            dataCell(acumTrim ? String(acumTrim) : "—", opColWidths[7], { shade, bold: true, align: AlignmentType.RIGHT }),
            dataCell(`${pct.toFixed(0)}%`, opColWidths[8], { shade, align: AlignmentType.RIGHT, color: pct > 100 ? RED : pct >= 66 ? "16A34A" : pct >= 33 ? "D97706" : RED }),
            dataCell(lastEstado?.replace(/_/g, " ") || "—", opColWidths[9], { shade }),
          ],
        });
      }),
    ],
  }));

  // ---- SECTION 4: NARRATIVE DETAIL ----
  children.push(sectionHeading(4, "DETALLE NARRATIVO POR ACTIVIDAD"));
  actividades.filter(a => actConAvance.has(a.id)).forEach(a => {
    const regs = regByActMes.get(a.id);
    const lastEstado = regs ? Array.from(regs.values()).sort((x: any, y: any) => y.mes - x.mes)[0]?.estado : "";
    const isCulm = lastEstado === "culminado_100";

    children.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BLUE_DARK } },
      children: [
        new TextRun({ text: `${a.codigo} — ${a.nombre}`, bold: true, font: "Arial", size: 22 }),
        new TextRun({ text: `  [${isCulm ? "✅ Culminado" : lastEstado?.replace(/_/g, " ")}]`, font: "Arial", size: 20, color: isCulm ? "16A34A" : "666666" }),
      ],
    }));

    meses.forEach(m => {
      const r = regs?.get(m);
      if (!r?.descripcion_avance) return;
      children.push(new Paragraph({
        spacing: { after: 80 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `${MESES_NOMBRE[m - 1]}: `, bold: true, font: "Arial", size: 20, color: "666666" }),
          new TextRun({ text: r.descripcion_avance, font: "Arial", size: 20 }),
        ],
      }));
    });

    // Contextual indicators for this activity
    const caps = capByAct.get(a.id) || [];
    const actInn = innovaciones.filter((i: any) => i.actividad_id === a.id);
    const actGei = gei.filter((g: any) => g.actividad_id === a.id);
    const tags: string[] = [];
    if (caps.length > 0) {
      const tp = caps.reduce((s: number, c: any) => s + (c.total_participantes || 0), 0);
      tags.push(`📊 ${caps.length} capacitaciones, ${tp} participantes`);
    }
    if (actInn.length > 0) tags.push(`💡 ${actInn.length} innovaciones`);
    if (actGei.length > 0) tags.push(`🌱 ${actGei.length} prácticas GEI`);
    if (tags.length > 0) {
      children.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: tags.join("  |  "), font: "Arial", size: 18, color: "666666", italics: true })],
      }));
    }
  });

  // ---- SECTION 5: FINANCIAL ----
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeading(5, "EJECUCIÓN FINANCIERA"));

  const fuentes = [
    { key: "cofinanciamiento_seco", label: "Cofinanciamiento SECO", presField: "presupuesto_seco", acumField: "ejecutado_seco_acum" },
    { key: "contrapartida_monetaria", label: "Contrapartida Monetaria", presField: "presupuesto_contrapartida_monetaria", acumField: "ejecutado_cm_acum" },
    { key: "contrapartida_no_monetaria", label: "Contrapartida No Monetaria", presField: "presupuesto_contrapartida_no_monetaria", acumField: "ejecutado_cnm_acum" },
  ];

  fuentes.forEach(fuente => {
    const rows: { codigo: string; nombre: string; pres: number; months: number[]; acum: number }[] = [];
    actividades.forEach(a => {
      const pres = a[fuente.presField] || 0;
      const monthData = gastosByActFuente.get(a.id)?.[fuente.key] || [0, 0, 0];
      if (pres > 0 || monthData.some((v: number) => v > 0)) {
        rows.push({ codigo: a.codigo, nombre: a.nombre, pres, months: monthData, acum: a[fuente.acumField] || 0 });
      }
    });
    if (rows.length === 0) return;

    children.push(new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: fuente.label, bold: true, font: "Arial", size: 22, color: BLUE_DARK })],
    }));

    const finColWidths = [1800, 900, 700, 700, 700, 800, 900, 700, 500];
    const finHeaders = ["Actividad", "Presup.", ...mesLabels.map(m => m.substring(0, 3)), "Tot. Trim.", "Acum.", "Saldo", "%"];

    const totM = [0, 0, 0]; let totPres = 0; let totAcum = 0;
    rows.forEach(r => { r.months.forEach((v, i) => totM[i] += v); totPres += r.pres; totAcum += r.acum; });

    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: finColWidths,
      rows: [
        new TableRow({ children: finColWidths.map((w, i) => headerCell(finHeaders[i] || "", w)) }),
        ...rows.map((r, idx) => {
          const trim = r.months.reduce((a, b) => a + b, 0);
          const saldo = r.pres - r.acum;
          const pct = r.pres > 0 ? (r.acum / r.pres) * 100 : 0;
          const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
          return new TableRow({
            children: [
              dataCell(`${r.codigo}`, finColWidths[0], { shade }),
              dataCell(formatCurrency(r.pres), finColWidths[1], { shade, align: AlignmentType.RIGHT }),
              ...r.months.map((v, i) => dataCell(v > 0 ? formatCurrency(v) : "—", finColWidths[2 + i], { shade, align: AlignmentType.RIGHT })),
              dataCell(formatCurrency(trim), finColWidths[5], { shade, bold: true, align: AlignmentType.RIGHT }),
              dataCell(formatCurrency(r.acum), finColWidths[6], { shade, align: AlignmentType.RIGHT }),
              dataCell(formatCurrency(saldo), finColWidths[7], { shade, align: AlignmentType.RIGHT, color: saldo < 0 ? RED : undefined }),
              dataCell(`${pct.toFixed(0)}%`, finColWidths[8], { shade, align: AlignmentType.RIGHT, color: pct > 100 ? RED : undefined }),
            ],
          });
        }),
        // Total row
        new TableRow({
          children: [
            dataCell("TOTAL", finColWidths[0], { bold: true, shade: BLUE_LIGHT }),
            dataCell(formatCurrency(totPres), finColWidths[1], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
            ...totM.map((v, i) => dataCell(formatCurrency(v), finColWidths[2 + i], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT })),
            dataCell(formatCurrency(totM.reduce((a, b) => a + b, 0)), finColWidths[5], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
            dataCell(formatCurrency(totAcum), finColWidths[6], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
            dataCell(formatCurrency(totPres - totAcum), finColWidths[7], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
            dataCell(totPres > 0 ? `${((totAcum / totPres) * 100).toFixed(0)}%` : "—", finColWidths[8], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
          ],
        }),
      ],
    }));
  });

  // Financial summary table
  children.push(new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text: "Resumen Financiero Consolidado", bold: true, font: "Arial", size: 22, color: BLUE_DARK })],
  }));
  const sumColWidths = [1800, 1500, 1500, 1500, 900, 1500];
  const summaryRows = [
    { label: "SECO", pres: totalPresupuestoSeco, trim: totalSeco, acum: totalEjecAcumSeco },
    { label: "C. Monetaria", pres: actividades.reduce((s: number, a: any) => s + (a.presupuesto_contrapartida_monetaria || 0), 0), trim: totalCM, acum: actividades.reduce((s: number, a: any) => s + (a.ejecutado_cm_acum || 0), 0) },
    { label: "C. No Monetaria", pres: actividades.reduce((s: number, a: any) => s + (a.presupuesto_contrapartida_no_monetaria || 0), 0), trim: totalCNM, acum: actividades.reduce((s: number, a: any) => s + (a.ejecutado_cnm_acum || 0), 0) },
  ];
  const grandTotal = { pres: summaryRows.reduce((s, r) => s + r.pres, 0), trim: summaryRows.reduce((s, r) => s + r.trim, 0), acum: summaryRows.reduce((s, r) => s + r.acum, 0) };

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: sumColWidths,
    rows: [
      new TableRow({ children: ["Fuente", "Presup. Total", "Ejec. Trim.", "Ejec. Acum.", "% Ejec.", "Saldo"].map((h, i) => headerCell(h, sumColWidths[i])) }),
      ...summaryRows.map((r, idx) => {
        const pct = r.pres > 0 ? ((r.acum / r.pres) * 100).toFixed(0) : "—";
        const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
        return new TableRow({
          children: [
            dataCell(r.label, sumColWidths[0], { shade, bold: true }),
            dataCell(formatCurrency(r.pres), sumColWidths[1], { shade, align: AlignmentType.RIGHT }),
            dataCell(formatCurrency(r.trim), sumColWidths[2], { shade, align: AlignmentType.RIGHT }),
            dataCell(formatCurrency(r.acum), sumColWidths[3], { shade, align: AlignmentType.RIGHT }),
            dataCell(`${pct}%`, sumColWidths[4], { shade, align: AlignmentType.RIGHT }),
            dataCell(formatCurrency(r.pres - r.acum), sumColWidths[5], { shade, align: AlignmentType.RIGHT }),
          ],
        });
      }),
      new TableRow({
        children: [
          dataCell("TOTAL", sumColWidths[0], { bold: true, shade: BLUE_LIGHT }),
          dataCell(formatCurrency(grandTotal.pres), sumColWidths[1], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
          dataCell(formatCurrency(grandTotal.trim), sumColWidths[2], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
          dataCell(formatCurrency(grandTotal.acum), sumColWidths[3], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
          dataCell(grandTotal.pres > 0 ? `${((grandTotal.acum / grandTotal.pres) * 100).toFixed(0)}%` : "—", sumColWidths[4], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
          dataCell(formatCurrency(grandTotal.pres - grandTotal.acum), sumColWidths[5], { bold: true, shade: BLUE_LIGHT, align: AlignmentType.RIGHT }),
        ],
      }),
    ],
  }));

  // ---- SECTION 7: CAPACITACIONES ----
  if (capacitaciones.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(sectionHeading(7, "CAPACITACIONES DEL TRIMESTRE"));
    const capColWidths = [800, 2000, 900, 1200, 800, 500, 500, 500, 800];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: capColWidths,
      rows: [
        new TableRow({ children: ["Act.", "Nombre", "Tipo", "Tema", "Fecha", "H", "M", "Total", "Modal."].map((h, i) => headerCell(h, capColWidths[i])) }),
        ...capacitaciones.map((c: any, idx: number) => {
          const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
          return new TableRow({
            children: [
              dataCell(c.actividades?.codigo || "", capColWidths[0], { shade }),
              dataCell(c.nombre_accion_formativa, capColWidths[1], { shade }),
              dataCell(c.tipo_accion_formativa || "—", capColWidths[2], { shade }),
              dataCell(c.tema || "—", capColWidths[3], { shade }),
              dataCell(c.fecha_inicio || "—", capColWidths[4], { shade }),
              dataCell(String(c.participantes_masculino || 0), capColWidths[5], { shade, align: AlignmentType.RIGHT }),
              dataCell(String(c.participantes_femenino || 0), capColWidths[6], { shade, align: AlignmentType.RIGHT }),
              dataCell(String(c.total_participantes || 0), capColWidths[7], { shade, bold: true, align: AlignmentType.RIGHT }),
              dataCell(c.modalidad || "—", capColWidths[8], { shade }),
            ],
          });
        }),
      ],
    }));
  }

  // ---- SECTION 9: CONTRATOS ----
  if (contratos.length > 0) {
    children.push(sectionHeading(9, "CONTRATOS"));
    const contColWidths = [1800, 2200, 1000, 900, 900, 800, 700];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: contColWidths,
      rows: [
        new TableRow({ children: ["Contratado", "Objeto", "Monto", "Inicio", "Fin", "Estado", "Días"].map((h, i) => headerCell(h, contColWidths[i])) }),
        ...contratos.map((c: any, idx: number) => {
          const diasRest = c.fecha_fin ? Math.ceil((new Date(c.fecha_fin).getTime() - Date.now()) / 86400000) : null;
          const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
          return new TableRow({
            children: [
              dataCell(c.nombre_contratado, contColWidths[0], { shade }),
              dataCell(c.objeto || "—", contColWidths[1], { shade }),
              dataCell(formatCurrency(c.monto), contColWidths[2], { shade, align: AlignmentType.RIGHT }),
              dataCell(c.fecha_inicio || "—", contColWidths[3], { shade }),
              dataCell(c.fecha_fin || "—", contColWidths[4], { shade }),
              dataCell(c.estado || "—", contColWidths[5], { shade }),
              dataCell(diasRest !== null ? (diasRest < 0 ? `Vencido` : `${diasRest}d`) : "—", contColWidths[6], { shade, color: diasRest !== null && diasRest < 10 ? RED : undefined }),
            ],
          });
        }),
      ],
    }));
  }

  // ---- SECTION 10: DESEMBOLSOS ----
  if (desembolsos.length > 0) {
    children.push(sectionHeading(10, "ESTADO DE DESEMBOLSOS"));
    const desColWidths = [900, 1400, 700, 1400, 1200, 1200, 1000];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: desColWidths,
      rows: [
        new TableRow({ children: ["Remesa", "Monto USD", "TC", "Monto PEN", "Fecha", "Trimestre", "Estado"].map((h, i) => headerCell(h, desColWidths[i])) }),
        ...desembolsos.sort((a: any, b: any) => a.numero_remesa - b.numero_remesa).map((d: any, idx: number) => {
          const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
          return new TableRow({
            children: [
              dataCell(`Remesa ${d.numero_remesa}`, desColWidths[0], { shade, bold: true }),
              dataCell(formatCurrency(d.monto_usd), desColWidths[1], { shade, align: AlignmentType.RIGHT }),
              dataCell(d.tipo_cambio ? String(d.tipo_cambio) : "—", desColWidths[2], { shade, align: AlignmentType.RIGHT }),
              dataCell(d.monto_pen ? formatCurrency(d.monto_pen) : "—", desColWidths[3], { shade, align: AlignmentType.RIGHT }),
              dataCell(d.fecha_desembolso || "—", desColWidths[4], { shade }),
              dataCell(d.trimestre_vinculado || "—", desColWidths[5], { shade }),
              dataCell(d.estado || "—", desColWidths[6], { shade }),
            ],
          });
        }),
      ],
    }));
  }

  // Footer
  children.push(new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({ text: "Generado automáticamente por el Sistema de Monitoreo SeCompetitivo", font: "Arial", size: 16, color: "999999", italics: true })],
  }));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE_DARK, space: 4 } },
            children: [new TextRun({ text: `SeCompetitivo — Informe ${trimestre}-${anio} — ${entidadNombre}`, font: "Arial", size: 16, color: "999999" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Página ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const filename = `Informe_Trimestral_${entidadNombre}_${trimestre}_${anio}.docx`;
  saveAs(buffer, filename);
}

// ---- RESUMEN EJECUTIVO TRIMESTRAL (Para Dirección) ----
interface ResumenEjecutivoData {
  trimestre: string;
  anio: number;
  entidadesDetalle: {
    id: string;
    nombre: string;
    mecanismo: string;
    estado: "aprobado" | "en_revision" | "sin_reporte";
    avanceOp: number;
    pctEjec: number;
  }[];
  kpis: {
    totalActividades: number;
    actConAvance: number;
    totalPresupuesto: number;
    totalEjecutado: number;
    pctEjecucion: number;
    avanceOperativo: number;
  };
  aiSummary: string | null;
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
}

export async function generateResumenEjecutivoDocx(data: ResumenEjecutivoData) {
  const { trimestre, anio, entidadesDetalle, kpis, aiSummary, aprobadoPor, fechaAprobacion } = data;
  const children: (Paragraph | Table)[] = [];

  // ---- PAGE 1: KPIs ----
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `RESUMEN EJECUTIVO ${trimestre}-${anio}`, bold: true, font: "Arial", size: 36, color: BLUE_DARK })],
  }));
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: "Programa SeCompetitivo — Cooperación Suiza (SECO)", font: "Arial", size: 22, color: "666666" })],
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: `Fecha: ${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}`, font: "Arial", size: 18, color: "999999" })],
  }));

  if (aprobadoPor) {
    children.push(new Paragraph({
      spacing: { after: 200 },
      shading: { fill: "D1FAE5", type: ShadingType.CLEAR },
      children: [new TextRun({ text: `  ✅ Aprobado por ${aprobadoPor} — ${fechaAprobacion ? new Date(fechaAprobacion).toLocaleDateString("es-PE") : ""}`, bold: true, font: "Arial", size: 20, color: "065F46" })],
    }));
  }

  children.push(sectionHeading(1, "KPIs DEL TRIMESTRE"));
  const kpiColWidth = Math.floor(9360 / 3);
  const kpiRows = [
    [
      { label: "Entidades activas", value: String(entidadesDetalle.length) },
      { label: "Entidades aprobadas", value: String(entidadesDetalle.filter(e => e.estado === "aprobado").length) },
      { label: "Actividades con avance", value: `${kpis.actConAvance} / ${kpis.totalActividades}` },
    ],
    [
      { label: "Avance operativo promedio", value: `${kpis.avanceOperativo}%` },
      { label: "Ejecución financiera", value: `${kpis.pctEjecucion}%` },
      { label: "Total actividades", value: String(kpis.totalActividades) },
    ],
  ];
  for (const row of kpiRows) {
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: row.map(() => kpiColWidth),
      rows: [new TableRow({ children: row.map(k => new TableCell({
        borders: cellBorders, width: { size: kpiColWidth, type: WidthType.DXA },
        shading: { fill: BLUE_LIGHT, type: ShadingType.CLEAR }, margins: cellMargins,
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.label, font: "Arial", size: 16, color: "666666" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.value, font: "Arial", size: 28, bold: true })] }),
        ],
      })) })],
    }));
  }

  // ---- PAGE 2: Avance por mecanismo ----
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeading(2, "AVANCE POR MECANISMO"));

  const mecA = entidadesDetalle.filter(e => e.mecanismo === "A");
  const mecB = entidadesDetalle.filter(e => e.mecanismo !== "A");
  const avgEjec = (arr: typeof entidadesDetalle) => arr.length > 0 ? Math.round(arr.reduce((s, e) => s + e.pctEjec, 0) / arr.length) : 0;

  const mecColWidths = [2000, 1500, 1500, 1500, 1500, 1360];
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: mecColWidths,
    rows: [
      new TableRow({ children: ["Mecanismo", "Entidades", "Aprobadas", "Pendientes", "Ejec. SECO %", "Estado"].map((h, i) => headerCell(h, mecColWidths[i])) }),
      ...([
        { label: "Mecanismo A — Políticas Públicas", ents: mecA },
        { label: "Mecanismo B — Cadenas de Valor", ents: mecB },
      ].map((row, idx) => {
        const aprobadas = row.ents.filter(e => e.estado === "aprobado").length;
        const pend = row.ents.length - aprobadas;
        const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
        return new TableRow({
          children: [
            dataCell(row.label, mecColWidths[0], { shade, bold: true }),
            dataCell(String(row.ents.length), mecColWidths[1], { shade, align: AlignmentType.CENTER }),
            dataCell(String(aprobadas), mecColWidths[2], { shade, align: AlignmentType.CENTER, color: "16A34A" }),
            dataCell(String(pend), mecColWidths[3], { shade, align: AlignmentType.CENTER, color: pend > 0 ? RED : undefined }),
            dataCell(`${avgEjec(row.ents)}%`, mecColWidths[4], { shade, align: AlignmentType.CENTER }),
            dataCell(pend === 0 ? "Listo" : "Pendiente", mecColWidths[5], { shade }),
          ],
        });
      })),
    ],
  }));

  // Detailed entity table
  children.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "Detalle por Entidad", bold: true, font: "Arial", size: 22, color: BLUE_DARK })] }));
  const entColWidths = [2500, 1000, 1500, 1500, 1500, 1360];
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: entColWidths,
    rows: [
      new TableRow({ children: ["Entidad", "Mec.", "Estado", "Avance Op.", "Ejec. SECO", "Semáforo"].map((h, i) => headerCell(h, entColWidths[i])) }),
      ...entidadesDetalle.map((e, idx) => {
        const shade = idx % 2 === 0 ? GRAY_LIGHT : WHITE;
        const estadoLabel = e.estado === "aprobado" ? "✅ Aprobado" : e.estado === "en_revision" ? "⏳ En revisión" : "🔴 Sin reporte";
        return new TableRow({
          children: [
            dataCell(e.nombre, entColWidths[0], { shade }),
            dataCell(`MEC-${e.mecanismo}`, entColWidths[1], { shade }),
            dataCell(estadoLabel, entColWidths[2], { shade, color: e.estado === "aprobado" ? "16A34A" : e.estado === "en_revision" ? undefined : RED }),
            dataCell(`${e.avanceOp}%`, entColWidths[3], { shade, align: AlignmentType.CENTER }),
            dataCell(`${e.pctEjec}%`, entColWidths[4], { shade, align: AlignmentType.CENTER }),
            dataCell(e.pctEjec >= 70 ? "🟢" : e.pctEjec >= 40 ? "🟡" : "🔴", entColWidths[5], { shade, align: AlignmentType.CENTER }),
          ],
        });
      }),
    ],
  }));

  // ---- PAGE 3: AI Analysis ----
  if (aiSummary) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(sectionHeading(3, "ANÁLISIS EJECUTIVO (IA)"));
    aiSummary.split("\n").filter(Boolean).forEach(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith("##")) {
        children.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: trimmed.replace(/^#+\s*/, ""), bold: true, font: "Arial", size: 24, color: BLUE_DARK })],
        }));
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        children.push(new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360 },
          children: [new TextRun({ text: `• ${trimmed.replace(/^[-*]\s*/, "")}`, font: "Arial", size: 20 })],
        }));
      } else {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: trimmed, font: "Arial", size: 20 })],
        }));
      }
    });
  }

  // ---- PAGE 4: Alertas y acciones ----
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeading(aiSummary ? 4 : 3, "ALERTAS Y ACCIONES PENDIENTES"));

  const pendientes = entidadesDetalle.filter(e => e.estado !== "aprobado");
  if (pendientes.length > 0) {
    children.push(new Paragraph({
      spacing: { after: 100 },
      shading: { fill: "FEF2F2", type: ShadingType.CLEAR },
      children: [new TextRun({ text: `  ⚠️ ${pendientes.length} entidades pendientes de aprobación`, bold: true, font: "Arial", size: 20, color: RED })],
    }));
    pendientes.forEach(e => {
      children.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: `• ${e.nombre} (MEC-${e.mecanismo}) — ${e.estado === "en_revision" ? "En revisión" : "Sin reporte"}`, font: "Arial", size: 20 })],
      }));
    });
  } else {
    children.push(new Paragraph({
      spacing: { after: 100 },
      shading: { fill: "D1FAE5", type: ShadingType.CLEAR },
      children: [new TextRun({ text: "  ✅ Todas las entidades aprobadas — Trimestre listo para cierre", bold: true, font: "Arial", size: 20, color: "065F46" })],
    }));
  }

  const lowExec = entidadesDetalle.filter(e => e.pctEjec < 30);
  if (lowExec.length > 0) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: "Entidades con baja ejecución financiera (<30%)", bold: true, font: "Arial", size: 20, color: BLUE_DARK })],
    }));
    lowExec.forEach(e => {
      children.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: `• ${e.nombre} — Ejecución SECO: ${e.pctEjec}%`, font: "Arial", size: 20, color: RED })],
      }));
    });
  }

  // Footer
  children.push(new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({ text: "Generado automáticamente por el Sistema de Monitoreo SeCompetitivo", font: "Arial", size: 16, color: "999999", italics: true })],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE_DARK, space: 4 } },
            children: [new TextRun({ text: `SeCompetitivo — Resumen Ejecutivo ${trimestre}-${anio}`, font: "Arial", size: 16, color: "999999" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Página ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `Resumen_Ejecutivo_${trimestre}_${anio}.docx`);
}

// ---- RESUMEN REGIONAL MENSUAL ----
interface ResumenRegionalData {
  region: string;
  mes: number;
  anio: number;
  entidades: {
    nombre: string;
    mecanismo: string;
    cadenaValor: string;
    avanceOp: number;
    ejecSeco: number;
    ejecutadoMes: { seco: number; cm: number; cnm: number };
    estadoAprobacion: string;
    alertas: string[];
    prioridades: string | null;
    compromisos: string | null;
    presupuesto: number;
    ejecutado: number;
    actConAvance: number;
    totalRegistros: number;
  }[];
  aiSummary: string | null;
}

export async function generateResumenRegionalDocx(data: ResumenRegionalData) {
  const { region, mes, anio, entidades, aiSummary } = data;
  const mesNombre = MESES_NOMBRE[mes] || String(mes);
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `RESUMEN REGIONAL — ${region}`, bold: true, font: "Arial", size: 36, color: BLUE_DARK })],
  }));
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `${mesNombre} ${anio} — Programa SeCompetitivo`, font: "Arial", size: 22, color: "666666" })],
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: `Generado: ${new Date().toLocaleDateString("es-PE")}`, font: "Arial", size: 18, color: "999999" })],
  }));

  // Section 1: KPIs
  children.push(sectionHeading(1, "ESTADO GENERAL"));
  const conReporte = entidades.filter(e => e.estadoAprobacion !== "Sin registro").length;
  const totalAlertas = entidades.reduce((s, e) => s + e.alertas.length, 0);
  const kpiW = Math.floor(9360 / 4);
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [kpiW, kpiW, kpiW, kpiW],
    rows: [new TableRow({ children: [
      { label: "Entidades", value: String(entidades.length) },
      { label: "Con reporte", value: String(conReporte) },
      { label: "Pendientes", value: String(entidades.length - conReporte) },
      { label: "Alertas", value: String(totalAlertas) },
    ].map(k => new TableCell({
      borders: cellBorders, width: { size: kpiW, type: WidthType.DXA },
      shading: { fill: BLUE_LIGHT, type: ShadingType.CLEAR }, margins: cellMargins,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.label, font: "Arial", size: 16, color: "666666" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.value, font: "Arial", size: 28, bold: true })] }),
      ],
    })) })],
  }));

  // Section 2: Detail per entity
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeading(2, "DETALLE POR ENTIDAD"));

  const colWidths = [2200, 1000, 1200, 1200, 1200, 1200, 1360];

  for (const ent of entidades) {
    children.push(new Paragraph({
      spacing: { before: 240, after: 100 },
      shading: { fill: BLUE_LIGHT, type: ShadingType.CLEAR },
      children: [new TextRun({ text: `  ${ent.nombre} (MEC-${ent.mecanismo}) — ${ent.cadenaValor}`, bold: true, font: "Arial", size: 22 })],
    }));

    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 2340, 2340, 2340],
      rows: [new TableRow({ children: [
        { l: "Avance Op.", v: `${ent.avanceOp}%` },
        { l: "Ejec. SECO", v: `${ent.ejecSeco}%` },
        { l: "Acts. con avance", v: `${ent.actConAvance}/${ent.totalRegistros}` },
        { l: "Estado", v: ent.estadoAprobacion },
      ].map(k => new TableCell({
        borders: cellBorders, width: { size: 2340, type: WidthType.DXA },
        margins: cellMargins,
        children: [
          new Paragraph({ children: [new TextRun({ text: k.l, font: "Arial", size: 16, color: "666666" })] }),
          new Paragraph({ children: [new TextRun({ text: k.v, font: "Arial", size: 20, bold: true })] }),
        ],
      })) })],
    }));

    // Financiero del mes
    children.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "Ejecución del mes:", font: "Arial", size: 18, bold: true, color: "444444" })],
    }));
    children.push(new Paragraph({
      indent: { left: 360 },
      children: [new TextRun({ text: `SECO: ${formatCurrency(ent.ejecutadoMes.seco)} | CM: ${formatCurrency(ent.ejecutadoMes.cm)} | CNM: ${formatCurrency(ent.ejecutadoMes.cnm)}`, font: "Arial", size: 18 })],
    }));

    if (ent.prioridades) {
      children.push(new Paragraph({
        spacing: { before: 60 }, indent: { left: 360 },
        children: [
          new TextRun({ text: "Prioridades: ", font: "Arial", size: 18, bold: true, color: "444444" }),
          new TextRun({ text: ent.prioridades, font: "Arial", size: 18 }),
        ],
      }));
    }
    if (ent.compromisos) {
      children.push(new Paragraph({
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Compromisos: ", font: "Arial", size: 18, bold: true, color: "444444" }),
          new TextRun({ text: ent.compromisos, font: "Arial", size: 18 }),
        ],
      }));
    }

    if (ent.alertas.length > 0) {
      children.push(new Paragraph({
        spacing: { before: 60 },
        shading: { fill: "FEF2F2", type: ShadingType.CLEAR },
        children: [new TextRun({ text: `  ⚠️ ${ent.alertas.join(" | ")}`, font: "Arial", size: 18, color: RED })],
      }));
    }
  }

  // Section 3: AI
  if (aiSummary) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(sectionHeading(3, "ANÁLISIS REGIONAL (IA)"));
    aiSummary.split("\n").filter(Boolean).forEach(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith("##")) {
        children.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: trimmed.replace(/^#+\s*/, ""), bold: true, font: "Arial", size: 24, color: BLUE_DARK })],
        }));
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        children.push(new Paragraph({
          spacing: { after: 60 }, indent: { left: 360 },
          children: [new TextRun({ text: `• ${trimmed.replace(/^[-*]\s*/, "")}`, font: "Arial", size: 20 })],
        }));
      } else {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: trimmed, font: "Arial", size: 20 })],
        }));
      }
    });
  }

  children.push(new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({ text: "Generado automáticamente por el Sistema de Monitoreo SeCompetitivo", font: "Arial", size: 16, color: "999999", italics: true })],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE_DARK, space: 4 } },
            children: [new TextRun({ text: `SeCompetitivo — Resumen Regional ${region} — ${mesNombre} ${anio}`, font: "Arial", size: 16, color: "999999" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Página ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `Resumen_Regional_${region}_${mesNombre}_${anio}.docx`);
}
