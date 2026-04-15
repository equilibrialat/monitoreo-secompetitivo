

## Plan consolidado: Corregir KPIs + Agregar tooltips explicativos

### Archivo a modificar
`src/components/dashboard/DashboardEntidad.tsx`

### Cambio 1 — Corregir cálculo de KPIs (líneas 63-134)

**Problema**: Los KPIs muestran 0% porque excluyen borradores (línea 72) y requieren `ejecutado >= meta_total` para "completada" (línea 95), pero los pills cuentan borradores como "reportados".

**Correcciones**:

1. **Incluir borradores en avance** (línea 72): eliminar `if (r.estado_registro !== "borrador")` — todos los registros cuentan como avance
2. **Avance basado en meses reportados** (líneas 119-121): reemplazar cálculo por ratio `meses_con_registro / total_meses_programados × 100` por actividad
3. **"Completada" sin requisito numérico** (línea 95): cambiar a `todos los meses programados tienen registro` (sin exigir `ejecutado >= meta_total`)
4. **Nivel de cumplimiento** se corrige automáticamente al arreglar "completadas"

### Cambio 2 — Agregar tooltips a KPI Cards (líneas 202-237, 395-414)

**Modificar `KpiCard`**: agregar prop `tooltip?: string` y envolver label con `<Tooltip>` + icono `Info` (ℹ)

| KPI | Tooltip |
|-----|---------|
| % Avance del producto | "Promedio de entregables reportados respecto al total de meses programados por actividad." |
| Nivel de cumplimiento | "Porcentaje de actividades que ya reportaron todos sus entregables programados." |
| Total de actividades | *(sin tooltip)* |
| Actividades completadas | *(sin tooltip)* |
| Actividades vencidas | "Actividades con entregables cuyo mes programado ya pasó sin registro." + **clickeable** → `/mi-planificacion` |
| Contribución al producto | "Porcentaje de ejecución financiera SECO respecto al presupuesto asignado." |

### Cambio 3 — Hacer "Actividades vencidas" clickeable

Usar `onClick={() => navigate("/mi-planificacion")}` y `cursor-pointer` en esa KPI card específica.

