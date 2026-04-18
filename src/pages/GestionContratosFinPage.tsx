import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Receipt, Loader2, DollarSign, ChevronDown, ChevronRight, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/DashboardEntidad";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ContratoFin {
  id: string;
  entidad_codigo: string;
  actividad_codigo: string;
  numero_contrato: string | null;
  tipo: string | null;
  ruc: string | null;
  proveedor_nombre: string;
  objeto_contrato: string;
  tipo_gasto: string | null;
  moneda: string;
  monto_contrato_moneda_origen: number | null;
  tipo_cambio: number | null;
  monto_contrato_usd: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  trimestre_inicio: string | null;
  created_at: string;
}

interface Comprobante {
  id: string;
  entidad_codigo: string;
  actividad_codigo: string;
  contrato_id: string | null;
  fecha_documento: string;
  clase_documento: string | null;
  numero_documento: string | null;
  ruc: string | null;
  proveedor_nombre: string | null;
  concepto: string;
  moneda: string;
  monto_moneda_origen: number;
  tipo_cambio: number;
  monto_usd: number;
  tipo_gasto: string | null;
  trimestre: string;
  mes: string;
  fuente: string;
  igv_usd: number;
  enlace_producto: string | null;
  created_at: string;
}

interface PlanAct {
  actividad_codigo: string;
  actividad_descripcion: string | null;
  resultado_intermedio_codigo: string | null;
  producto_codigo: string | null;
}

const TIPO_GASTO_OPTIONS = [
  { value: "consultoría", label: "Servicio de consultoría" },
  { value: "terceros", label: "Servicio de terceros" },
  { value: "bienes", label: "Bienes de consumo" },
  { value: "viáticos", label: "Viáticos" },
  { value: "honorarios", label: "Honorarios" },
];

const CLASE_DOC_OPTIONS = [
  { value: "FAC", label: "FAC — Factura" },
  { value: "RHP", label: "RHP — Recibo por Honorarios" },
  { value: "REC", label: "REC — Recibo" },
  { value: "BOL", label: "BOL — Boleta" },
  { value: "PLI", label: "PLI — Póliza" },
  { value: "NDB", label: "NDB — Nota de débito" },
];

const FUENTE_OPTIONS = [
  { value: "seco", label: "SECO" },
  { value: "contrapartida_monetaria", label: "Contrapartida monetaria" },
  { value: "contrapartida_no_monetaria", label: "Contrapartida no monetaria" },
];

function calcTrimestre(fecha: string): string {
  const m = parseInt(fecha.split("-")[1]);
  const y = fecha.split("-")[0];
  if (m <= 3) return `${y}-T1`;
  if (m <= 6) return `${y}-T2`;
  if (m <= 9) return `${y}-T3`;
  return `${y}-T4`;
}

function calcMes(fecha: string): string {
  return fecha.substring(0, 7);
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GestionContratosFinPage() {
  const { entidadId, entidades } = useRole();
  const entidad = entidades.find((e) => e.id === entidadId);
  const entidadCodigo = entidad?.nombre_corto === "App Cacao" ? "APPCACAO" : null;

  const [contratos, setContratos] = useState<ContratoFin[]>([]);
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [actividades, setActividades] = useState<PlanAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContratoDialog, setShowContratoDialog] = useState(false);
  const [showComprobanteDialog, setShowComprobanteDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Contrato form
  const [cForm, setCForm] = useState({
    actividad_codigo: "", tipo: "persona_natural", ruc: "", proveedor_nombre: "",
    objeto_contrato: "", tipo_gasto: "consultoría", moneda: "USD",
    monto_contrato_moneda_origen: "", tipo_cambio: "1", fecha_inicio: "", fecha_fin: "", numero_contrato: "",
  });

  // Comprobante form
  const [pForm, setPForm] = useState({
    contrato_id: "none", actividad_codigo: "", fecha_documento: "",
    clase_documento: "FAC", numero_documento: "", ruc: "", proveedor_nombre: "",
    concepto: "", moneda: "USD", monto_moneda_origen: "", tipo_cambio: "1",
    tipo_gasto: "consultoría", fuente: "seco", igv_usd: "0", enlace_producto: "",
  });

  const loadData = useCallback(() => {
    if (!entidadCodigo) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      (supabase as any).from("contratos_financieros").select("*").eq("entidad_codigo", entidadCodigo).order("created_at", { ascending: false }),
      (supabase as any).from("comprobantes").select("*").eq("entidad_codigo", entidadCodigo).order("fecha_documento", { ascending: false }),
      (supabase as any).from("planificacion_actividades").select("actividad_codigo, actividad_descripcion, resultado_intermedio_codigo, producto_codigo").eq("entidad_codigo", entidadCodigo).order("actividad_codigo"),
    ]).then(([cRes, pRes, aRes]: any[]) => {
      setContratos(cRes.data || []);
      setComprobantes(pRes.data || []);
      setActividades(aRes.data || []);
      setLoading(false);
    });
  }, [entidadCodigo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Summary
  const summary = useMemo(() => {
    const totalConvenio = 243114; // APPCACAO total
    const ejecutadoSeco = comprobantes.filter(c => c.fuente === "seco").reduce((s, c) => s + c.monto_usd, 0);
    const comprometido = contratos.filter(c => c.estado === "vigente").reduce((s, c) => s + (c.monto_contrato_usd || 0), 0);
    return {
      totalConvenio,
      ejecutadoSeco,
      saldo: totalConvenio - ejecutadoSeco,
      comprometido,
      saldoLibre: totalConvenio - ejecutadoSeco - comprometido,
    };
  }, [comprobantes, contratos]);

  async function handleSaveContrato() {
    if (!entidadCodigo || !cForm.actividad_codigo || !cForm.proveedor_nombre || !cForm.objeto_contrato) {
      toast.error("Complete los campos obligatorios"); return;
    }
    setSaving(true);
    const montoOrigen = parseFloat(cForm.monto_contrato_moneda_origen) || 0;
    const tc = parseFloat(cForm.tipo_cambio) || 1;
    const montoUsd = cForm.moneda === "PEN" ? montoOrigen / tc : montoOrigen;

    const { error } = await (supabase as any).from("contratos_financieros").insert({
      entidad_codigo: entidadCodigo,
      actividad_codigo: cForm.actividad_codigo,
      numero_contrato: cForm.numero_contrato || null,
      tipo: cForm.tipo,
      ruc: cForm.ruc || null,
      proveedor_nombre: cForm.proveedor_nombre,
      objeto_contrato: cForm.objeto_contrato,
      tipo_gasto: cForm.tipo_gasto,
      moneda: cForm.moneda,
      monto_contrato_moneda_origen: montoOrigen,
      tipo_cambio: cForm.moneda === "PEN" ? tc : null,
      monto_contrato_usd: montoUsd,
      fecha_inicio: cForm.fecha_inicio || null,
      fecha_fin: cForm.fecha_fin || null,
      trimestre_inicio: cForm.fecha_inicio ? calcTrimestre(cForm.fecha_inicio) : null,
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar"); console.error(error); }
    else {
      toast.success("Contrato registrado");
      setShowContratoDialog(false);
      setCForm({ actividad_codigo: "", tipo: "persona_natural", ruc: "", proveedor_nombre: "", objeto_contrato: "", tipo_gasto: "consultoría", moneda: "USD", monto_contrato_moneda_origen: "", tipo_cambio: "1", fecha_inicio: "", fecha_fin: "", numero_contrato: "" });
      loadData();
    }
  }

  async function handleSaveComprobante() {
    if (!entidadCodigo || !pForm.fecha_documento || !pForm.concepto) {
      toast.error("Complete los campos obligatorios"); return;
    }
    const actCode = pForm.actividad_codigo || (pForm.contrato_id !== "none" ? contratos.find(c => c.id === pForm.contrato_id)?.actividad_codigo : "");
    if (!actCode) { toast.error("Seleccione actividad vinculada"); return; }

    setSaving(true);
    const montoOrigen = parseFloat(pForm.monto_moneda_origen) || 0;
    const tc = parseFloat(pForm.tipo_cambio) || 1;
    const montoUsd = pForm.moneda === "PEN" ? montoOrigen / tc : montoOrigen;

    const { error } = await (supabase as any).from("comprobantes").insert({
      entidad_codigo: entidadCodigo,
      actividad_codigo: actCode,
      contrato_id: pForm.contrato_id !== "none" ? pForm.contrato_id : null,
      fecha_documento: pForm.fecha_documento,
      clase_documento: pForm.clase_documento,
      numero_documento: pForm.numero_documento || null,
      ruc: pForm.ruc || null,
      proveedor_nombre: pForm.proveedor_nombre || null,
      concepto: pForm.concepto,
      moneda: pForm.moneda,
      monto_moneda_origen: montoOrigen,
      tipo_cambio: tc,
      monto_usd: montoUsd,
      tipo_gasto: pForm.tipo_gasto,
      trimestre: calcTrimestre(pForm.fecha_documento),
      mes: calcMes(pForm.fecha_documento),
      fuente: pForm.fuente,
      igv_usd: parseFloat(pForm.igv_usd) || 0,
      enlace_producto: pForm.enlace_producto.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar"); console.error(error); }
    else {
      toast.success("Comprobante registrado");
      setShowComprobanteDialog(false);
      setPForm({ contrato_id: "none", actividad_codigo: "", fecha_documento: "", clase_documento: "FAC", numero_documento: "", ruc: "", proveedor_nombre: "", concepto: "", moneda: "USD", monto_moneda_origen: "", tipo_cambio: "1", tipo_gasto: "consultoría", fuente: "seco", igv_usd: "0", enlace_producto: "" });
      loadData();
    }
  }

  function handleExportComprobantes() {
    if (comprobantes.length === 0) {
      toast.info("No hay comprobantes para exportar");
      return;
    }
    const contratoLabel = (id: string | null) => {
      if (!id) return "—";
      const c = contratos.find(x => x.id === id);
      return c ? (c.numero_contrato || c.proveedor_nombre || "—") : "—";
    };
    const contratadoLabel = (id: string | null) => {
      if (!id) return "—";
      const c = contratos.find(x => x.id === id);
      return c?.proveedor_nombre || "—";
    };
    const rows = comprobantes.map(p => ({
      "Contrato": contratoLabel(p.contrato_id),
      "Contratado": contratadoLabel(p.contrato_id) !== "—" ? contratadoLabel(p.contrato_id) : (p.proveedor_nombre || "—"),
      "Actividad vinculada": p.actividad_codigo,
      "N° comprobante": [p.clase_documento, p.numero_documento].filter(Boolean).join(" ") || "—",
      "Fecha": p.fecha_documento,
      "Concepto": p.concepto,
      "Tipo de documento": p.clase_documento || "—",
      "Monto": Number(p.monto_usd?.toFixed(2) ?? 0),
      "Enlace producto": p.enlace_producto || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comprobantes");
    const fname = `comprobantes_${entidadCodigo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`Exportados ${rows.length} comprobantes`);
  }

  // When selecting contrato in comprobante form, pre-fill fields
  function onContratoSelected(contratoId: string) {
    setPForm(prev => {
      const c = contratos.find(x => x.id === contratoId);
      if (!c) return { ...prev, contrato_id: contratoId };
      return {
        ...prev,
        contrato_id: contratoId,
        actividad_codigo: c.actividad_codigo,
        ruc: c.ruc || "",
        proveedor_nombre: c.proveedor_nombre,
        tipo_gasto: c.tipo_gasto || prev.tipo_gasto,
      };
    });
  }

  if (!entidadCodigo) return null;

  const actLabel = (code: string) => {
    const a = actividades.find(x => x.actividad_codigo === code);
    return a ? `${code} — ${(a.actividad_descripcion || "").substring(0, 60)}` : code;
  };

  return (
    <div>
      <Header title="Contratos y Comprobantes" subtitle={entidad?.nombre_corto} />

      {/* Financial health summary */}
      <Card className="mb-4 border-primary/20">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumen financiero — APPCACAO</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Presupuesto SECO convenio:</span>
              <p className="font-bold text-sm mt-0.5">USD {fmt(summary.totalConvenio)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ejecutado acumulado:</span>
              <p className="font-bold text-sm mt-0.5 text-primary">USD {fmt(summary.ejecutadoSeco)} ({Math.round(summary.ejecutadoSeco / summary.totalConvenio * 100)}%)</p>
            </div>
            <div>
              <span className="text-muted-foreground">Saldo disponible:</span>
              <p className="font-bold text-sm mt-0.5">USD {fmt(summary.saldo)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Comprometido (contratos):</span>
              <p className="font-bold text-sm mt-0.5 text-amber-600">USD {fmt(summary.comprometido)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Saldo libre:</span>
              <p className="font-bold text-sm mt-0.5 text-green-600">USD {fmt(summary.saldoLibre)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contratos">
        <div className="flex items-center justify-between mb-3">
          <TabsList>
            <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
            <TabsTrigger value="comprobantes">Comprobantes ({comprobantes.length})</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportComprobantes}
              disabled={loading || comprobantes.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar
            </Button>
            <Dialog open={showContratoDialog} onOpenChange={setShowContratoDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Contrato</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Registrar Contrato</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Actividad vinculada *</Label>
                    <Select value={cForm.actividad_codigo} onValueChange={v => setCForm(p => ({ ...p, actividad_codigo: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione actividad" /></SelectTrigger>
                      <SelectContent>{actividades.map(a => (
                        <SelectItem key={a.actividad_codigo} value={a.actividad_codigo} className="text-xs">
                          {a.actividad_codigo} — {(a.actividad_descripcion || "").substring(0, 50)}
                        </SelectItem>
                      ))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tipo de gasto *</Label>
                      <Select value={cForm.tipo_gasto} onValueChange={v => setCForm(p => ({ ...p, tipo_gasto: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPO_GASTO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo contrato</Label>
                      <Select value={cForm.tipo} onValueChange={v => setCForm(p => ({ ...p, tipo: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="persona_natural" className="text-xs">Persona natural</SelectItem>
                          <SelectItem value="persona_juridica" className="text-xs">Persona jurídica</SelectItem>
                          <SelectItem value="orden_servicio" className="text-xs">Orden de servicio</SelectItem>
                          <SelectItem value="otro" className="text-xs">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Proveedor *</Label><Input className="h-8 text-xs" value={cForm.proveedor_nombre} onChange={e => setCForm(p => ({ ...p, proveedor_nombre: e.target.value }))} /></div>
                    <div><Label className="text-xs">RUC/DNI</Label><Input className="h-8 text-xs" value={cForm.ruc} onChange={e => setCForm(p => ({ ...p, ruc: e.target.value }))} /></div>
                  </div>
                  <div><Label className="text-xs">Objeto del contrato *</Label><Textarea className="text-xs" rows={2} value={cForm.objeto_contrato} onChange={e => setCForm(p => ({ ...p, objeto_contrato: e.target.value }))} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Monto</Label><Input className="h-8 text-xs" type="number" value={cForm.monto_contrato_moneda_origen} onChange={e => setCForm(p => ({ ...p, monto_contrato_moneda_origen: e.target.value }))} /></div>
                    <div>
                      <Label className="text-xs">Moneda</Label>
                      <Select value={cForm.moneda} onValueChange={v => setCForm(p => ({ ...p, moneda: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD" className="text-xs">USD</SelectItem>
                          <SelectItem value="PEN" className="text-xs">PEN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {cForm.moneda === "PEN" && (
                      <div><Label className="text-xs">T/C</Label><Input className="h-8 text-xs" type="number" step="0.01" value={cForm.tipo_cambio} onChange={e => setCForm(p => ({ ...p, tipo_cambio: e.target.value }))} /></div>
                    )}
                  </div>
                  {cForm.moneda === "PEN" && parseFloat(cForm.monto_contrato_moneda_origen) > 0 && (
                    <p className="text-xs text-muted-foreground">Monto USD: <strong>{fmt(parseFloat(cForm.monto_contrato_moneda_origen) / (parseFloat(cForm.tipo_cambio) || 1))}</strong></p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Fecha inicio</Label><Input className="h-8 text-xs" type="date" value={cForm.fecha_inicio} onChange={e => setCForm(p => ({ ...p, fecha_inicio: e.target.value }))} /></div>
                    <div><Label className="text-xs">Fecha fin</Label><Input className="h-8 text-xs" type="date" value={cForm.fecha_fin} onChange={e => setCForm(p => ({ ...p, fecha_fin: e.target.value }))} /></div>
                  </div>
                  <div><Label className="text-xs">Nro. contrato</Label><Input className="h-8 text-xs" value={cForm.numero_contrato} onChange={e => setCForm(p => ({ ...p, numero_contrato: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handleSaveContrato} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar contrato
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showComprobanteDialog} onOpenChange={setShowComprobanteDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Comprobante</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Registrar Comprobante</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Contrato vinculado (opcional)</Label>
                    <Select value={pForm.contrato_id} onValueChange={onContratoSelected}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin contrato" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">Sin contrato</SelectItem>
                        {contratos.filter(c => c.estado === "vigente").map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">{c.actividad_codigo} — {c.proveedor_nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Actividad vinculada *</Label>
                    <Select value={pForm.actividad_codigo} onValueChange={v => setPForm(p => ({ ...p, actividad_codigo: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                      <SelectContent>{actividades.map(a => (
                        <SelectItem key={a.actividad_codigo} value={a.actividad_codigo} className="text-xs">
                          {a.actividad_codigo} — {(a.actividad_descripcion || "").substring(0, 50)}
                        </SelectItem>
                      ))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Fecha documento *</Label><Input className="h-8 text-xs" type="date" value={pForm.fecha_documento} onChange={e => setPForm(p => ({ ...p, fecha_documento: e.target.value }))} /></div>
                    <div>
                      <Label className="text-xs">Tipo documento</Label>
                      <Select value={pForm.clase_documento} onValueChange={v => setPForm(p => ({ ...p, clase_documento: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CLASE_DOC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Nro. documento</Label><Input className="h-8 text-xs" value={pForm.numero_documento} onChange={e => setPForm(p => ({ ...p, numero_documento: e.target.value }))} /></div>
                    <div><Label className="text-xs">RUC</Label><Input className="h-8 text-xs" value={pForm.ruc} onChange={e => setPForm(p => ({ ...p, ruc: e.target.value }))} /></div>
                  </div>
                  <div><Label className="text-xs">Proveedor</Label><Input className="h-8 text-xs" value={pForm.proveedor_nombre} onChange={e => setPForm(p => ({ ...p, proveedor_nombre: e.target.value }))} /></div>
                  <div><Label className="text-xs">Concepto *</Label><Input className="h-8 text-xs" value={pForm.concepto} onChange={e => setPForm(p => ({ ...p, concepto: e.target.value }))} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Monto *</Label><Input className="h-8 text-xs" type="number" step="0.01" value={pForm.monto_moneda_origen} onChange={e => setPForm(p => ({ ...p, monto_moneda_origen: e.target.value }))} /></div>
                    <div>
                      <Label className="text-xs">Moneda</Label>
                      <Select value={pForm.moneda} onValueChange={v => setPForm(p => ({ ...p, moneda: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD" className="text-xs">USD</SelectItem>
                          <SelectItem value="PEN" className="text-xs">PEN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {pForm.moneda === "PEN" && (
                      <div><Label className="text-xs">T/C</Label><Input className="h-8 text-xs" type="number" step="0.01" value={pForm.tipo_cambio} onChange={e => setPForm(p => ({ ...p, tipo_cambio: e.target.value }))} /></div>
                    )}
                  </div>
                  {pForm.moneda === "PEN" && parseFloat(pForm.monto_moneda_origen) > 0 && (
                    <p className="text-xs text-muted-foreground">Monto USD: <strong>{fmt(parseFloat(pForm.monto_moneda_origen) / (parseFloat(pForm.tipo_cambio) || 1))}</strong></p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Tipo de gasto</Label>
                      <Select value={pForm.tipo_gasto} onValueChange={v => setPForm(p => ({ ...p, tipo_gasto: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPO_GASTO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Fuente</Label>
                      <Select value={pForm.fuente} onValueChange={v => setPForm(p => ({ ...p, fuente: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{FUENTE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">IGV (USD)</Label><Input className="h-8 text-xs" type="number" step="0.01" value={pForm.igv_usd} onChange={e => setPForm(p => ({ ...p, igv_usd: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label className="text-xs">Enlace del producto</Label>
                    <Input
                      className="h-8 text-xs"
                      type="url"
                      placeholder="https://drive.google.com/... (opcional)"
                      value={pForm.enlace_producto}
                      onChange={e => setPForm(p => ({ ...p, enlace_producto: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">URL del repositorio donde está alojado el producto/entregable que justifica este pago.</p>
                  </div>
                  <Button className="w-full" onClick={handleSaveComprobante} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar comprobante
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="contratos">
          <Card>
            <CardContent className="pt-4">
              {loading ? <p className="text-sm text-muted-foreground text-center py-8">Cargando…</p> : contratos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin contratos registrados. Use el botón "+ Contrato" para agregar.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Actividad</TableHead>
                        <TableHead className="text-xs">Proveedor</TableHead>
                        <TableHead className="text-xs">Tipo gasto</TableHead>
                        <TableHead className="text-xs text-right">Monto USD</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="text-xs">Período</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratos.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs font-mono font-bold text-primary">{c.actividad_codigo}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{c.proveedor_nombre}</TableCell>
                          <TableCell className="text-xs capitalize">{c.tipo_gasto}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{fmt(c.monto_contrato_usd)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]",
                              c.estado === "vigente" ? "border-green-300 text-green-700" : "border-muted text-muted-foreground"
                            )}>{c.estado}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.fecha_inicio || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprobantes">
          <Card>
            <CardContent className="pt-4">
              {loading ? <p className="text-sm text-muted-foreground text-center py-8">Cargando…</p> : comprobantes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin comprobantes registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs">Actividad</TableHead>
                        <TableHead className="text-xs">Doc</TableHead>
                        <TableHead className="text-xs">Concepto</TableHead>
                        <TableHead className="text-xs">Tipo gasto</TableHead>
                        <TableHead className="text-xs text-right">USD</TableHead>
                        <TableHead className="text-xs">Fuente</TableHead>
                        <TableHead className="text-xs">Trim.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprobantes.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs text-muted-foreground">{p.fecha_documento}</TableCell>
                          <TableCell className="text-xs font-mono font-bold text-primary">{p.actividad_codigo}</TableCell>
                          <TableCell className="text-xs">{p.clase_documento}{p.numero_documento ? ` ${p.numero_documento}` : ""}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{p.concepto}</TableCell>
                          <TableCell className="text-xs capitalize">{p.tipo_gasto}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-medium">{fmt(p.monto_usd)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{p.fuente === "seco" ? "SECO" : p.fuente}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.trimestre}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
