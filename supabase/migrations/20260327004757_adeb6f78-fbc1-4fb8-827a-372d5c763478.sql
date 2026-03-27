
-- Allow delete on ejecucion_financiera for MVP (needed for upsert flow)
CREATE POLICY "public_delete" ON ejecucion_financiera FOR DELETE USING (true);
-- Allow update on registros_mensuales for upsert
CREATE POLICY "public_update" ON registros_mensuales FOR UPDATE USING (true) WITH CHECK (true);
