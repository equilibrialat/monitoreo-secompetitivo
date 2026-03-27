
CREATE POLICY "public_delete" ON registro_capacitaciones FOR DELETE USING (true);
CREATE POLICY "public_delete" ON participantes_capacitacion FOR DELETE USING (true);
CREATE POLICY "public_delete" ON registro_innovaciones FOR DELETE USING (true);
CREATE POLICY "public_delete" ON registro_gei FOR DELETE USING (true);
CREATE POLICY "public_delete" ON registro_nuevos_productos FOR DELETE USING (true);
