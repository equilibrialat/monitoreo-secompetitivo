
-- Add missing RLS policies for contratos
CREATE POLICY "public_insert" ON public.contratos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.contratos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.contratos FOR DELETE TO public USING (true);

-- Add missing RLS policies for desembolsos
CREATE POLICY "public_insert" ON public.desembolsos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.desembolsos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.desembolsos FOR DELETE TO public USING (true);

-- Add missing RLS policies for reasignaciones
CREATE POLICY "public_insert" ON public.reasignaciones FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.reasignaciones FOR UPDATE TO public USING (true) WITH CHECK (true);
