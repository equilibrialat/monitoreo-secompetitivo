
CREATE POLICY "public_insert" ON public.viaticos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_update" ON public.viaticos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.viaticos FOR DELETE TO public USING (true);
