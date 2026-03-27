
-- Enable RLS on all tables
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;

-- Allow public read for MVP (no auth yet)
CREATE POLICY "Allow public read" ON entidades FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON resultados FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON productos FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON actividades FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON perfiles FOR SELECT USING (true);
