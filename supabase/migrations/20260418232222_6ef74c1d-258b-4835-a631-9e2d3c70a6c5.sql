CREATE POLICY "public_delete" ON public.registros_mensuales FOR DELETE USING (true);
CREATE POLICY "public_delete" ON public.registro_financiamiento FOR DELETE USING (true);
CREATE POLICY "public_delete" ON public.registro_normativo FOR DELETE USING (true);