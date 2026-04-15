
-- Table for document attachments
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidad_codigo TEXT NOT NULL,
  actividad_codigo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'otro',
  nombre_archivo TEXT NOT NULL,
  url_storage TEXT NOT NULL,
  subido_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subido_por TEXT
);

-- Enable RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Public read/insert/delete for MVP
CREATE POLICY "public_read" ON public.documentos FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.documentos FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete" ON public.documentos FOR DELETE USING (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Storage policies
CREATE POLICY "public_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');
CREATE POLICY "public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'documentos');
