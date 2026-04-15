

# Plan: Selector de rango mes/año en Generar Reportes

## Problema actual
La página "Generar Reportes" tiene selectores fijos por tipo (trimestre T1-T4, semestre S1-S2, año). No permite elegir un rango libre de fechas como "Octubre 2025 a Diciembre 2025".

## Solución
Reemplazar todos los selectores de período específicos por un rango universal **Desde (mes + año) → Hasta (mes + año)**. Los tabs de tipo de reporte (Mensual, Trimestral, etc.) se convierten en atajos que pre-llenan el rango, pero el usuario siempre puede ajustarlo.

## UI resultante

```text
Tipo de reporte: [Mensual] [Trimestral] [Semestral] [Anual]

Desde: [Octubre ▼] [2025 ▼]   Hasta: [Diciembre ▼] [2025 ▼]   [Entidad ▼]
```

- Al hacer clic en "Mensual": pre-llena Desde=mes actual, Hasta=mes actual, mismo año
- Al hacer clic en "Trimestral": pre-llena 3 meses (ej: Oct-Dic 2025)
- Al hacer clic en "Semestral": pre-llena 6 meses (ej: Jul-Dic 2025)  
- Al hacer clic en "Anual": pre-llena Ene-Dic del año actual
- El usuario puede modificar cualquier valor libremente después del preset
- Años disponibles: 2024, 2025, 2026

## Cambios en archivos

### `src/pages/GenerarReportesPage.tsx`
- Eliminar los 8 estados individuales (mesMensual, anioMensual, trimestre, etc.)
- Reemplazar por 4 estados: `mesDesde`, `anioDesde`, `mesHasta`, `anioHasta`
- Los tabs de tipo siguen existiendo pero al cambiar uno, pre-llenan el rango
- Pasar el rango calculado a los componentes de reporte existentes (convertir mes/año a los props que cada componente espera)
- Un solo bloque de selectores visible siempre (no condicional por tipo)

### Lógica de conversión para componentes existentes
Los componentes de reporte (`ReporteMensualPreview`, `ReporteTrimestralCompleto`, etc.) mantienen sus props actuales. La página calcula los props correctos desde el rango:
- Mensual: `mes=mesDesde, anio=anioDesde`
- Trimestral: `trimestre` derivado del mesDesde, `anio=anioDesde`
- Semestral: `semestre` derivado del mesDesde, `anio=anioDesde`
- Anual: `anio=anioDesde`

