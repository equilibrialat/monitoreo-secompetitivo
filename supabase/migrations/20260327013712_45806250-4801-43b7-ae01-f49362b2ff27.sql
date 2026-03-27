
-- Add INSERT/UPDATE/DELETE policies to reporte tables for public access
-- reporte_empleo
CREATE POLICY "public_insert" ON public.reporte_empleo FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reporte_empleo FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.reporte_empleo FOR DELETE TO public USING (true);

-- reporte_productividad
CREATE POLICY "public_insert" ON public.reporte_productividad FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reporte_productividad FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.reporte_productividad FOR DELETE TO public USING (true);

-- reporte_comercial
CREATE POLICY "public_insert" ON public.reporte_comercial FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reporte_comercial FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.reporte_comercial FOR DELETE TO public USING (true);

-- reporte_gobernanza
CREATE POLICY "public_insert" ON public.reporte_gobernanza FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reporte_gobernanza FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.reporte_gobernanza FOR DELETE TO public USING (true);

-- reporte_turismo_ventas
CREATE POLICY "public_insert" ON public.reporte_turismo_ventas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reporte_turismo_ventas FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.reporte_turismo_ventas FOR DELETE TO public USING (true);

-- reporte_turismo_atractivos
CREATE POLICY "public_insert" ON public.reporte_turismo_atractivos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reporte_turismo_atractivos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.reporte_turismo_atractivos FOR DELETE TO public USING (true);
