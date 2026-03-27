ALTER TABLE reporte_empleo 
ADD COLUMN IF NOT EXISTS empleos_retenidos_post_cosecha INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS empleos_retenidos_agroindustria INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS empleos_mejorados_manejo_finca INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS empleos_mejorados_post_cosecha INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS empleos_mejorados_agroindustria INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS empleos_mejorados_turismo INT DEFAULT 0;

ALTER TABLE reporte_productividad 
ADD COLUMN IF NOT EXISTS num_productores_masculino INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_productores_femenino INT DEFAULT 0;