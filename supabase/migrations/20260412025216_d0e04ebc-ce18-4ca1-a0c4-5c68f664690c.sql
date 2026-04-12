
-- New table: remesas_proyecto
CREATE TABLE public.remesas_proyecto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  numero text NOT NULL,
  fecha_desembolso date,
  monto_pen numeric DEFAULT 0,
  monto_usd numeric DEFAULT 0,
  tipo_cambio numeric,
  periodo_liquidacion text,
  liquidado_pen numeric,
  liquidado_usd numeric,
  saldo_pendiente_pen numeric DEFAULT 0,
  saldo_pendiente_usd numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.remesas_proyecto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON public.remesas_proyecto FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.remesas_proyecto FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.remesas_proyecto FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.remesas_proyecto FOR DELETE USING (true);

-- New table: vouchers_gasto
CREATE TABLE public.vouchers_gasto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  codigo_actividad text,
  item text,
  fecha date,
  clase_documento text,
  numero_documento text,
  ruc_proveedor text,
  proveedor text,
  concepto text,
  monto_usd numeric DEFAULT 0,
  monto_pen numeric DEFAULT 0,
  tipo_cambio numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vouchers_gasto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON public.vouchers_gasto FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.vouchers_gasto FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.vouchers_gasto FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.vouchers_gasto FOR DELETE USING (true);

-- New table: igv_control
CREATE TABLE public.igv_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  numero text,
  trimestre text NOT NULL,
  igv_desembolsado_pen numeric DEFAULT 0,
  igv_recuperado_pen numeric DEFAULT 0,
  igv_pendiente_pen numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.igv_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON public.igv_control FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.igv_control FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.igv_control FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.igv_control FOR DELETE USING (true);

-- Add missing columns to contratos table
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS objetivo text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fecha_inicio_contrato date;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS producto_entregable text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fecha_vencimiento_producto date;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS monto_pagado_pen numeric;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS estado_situacional text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS dni text;
