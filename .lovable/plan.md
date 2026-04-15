

# Plan: Filtros reactivos + Vista de indicadores con actividades

## Diagnóstico de datos

**Datos actuales en Supabase:**
- `planificacion_actividades`: solo APPCACAO (17 actividades), agrupadas por RI1, RI2, RI3
- `indicadores_proyecto`: solo tiene datos de entidades Mec A (COFIDE, JNC). No hay indicadores para APPCACAO/CANATUR/MARKAHUAMACHUCO
- `reportes_trimestrales`: 3 entidades con datos (APPCACAO, CANATUR, MARKAHUAMACHUCO) para T4 2025
- No existe vinculación directa entre `indicadores_proyecto` y `planificacion_actividades`

**Conclusión**: La tabla `indicadores_proyecto` no es útil para Mec B en esta fase. La vista de indicadores debe construirse desde `planificacion_actividades` agrupando por `resultado_intermedio_codigo`, enriquecida con datos de `reportes_trimestrales`.

## Arquitectura: 3 elementos compartidos

### 1. Hook `useIndicadoresActividades(filtros)`
- Query `planificacion_actividades` agrupando por `resultado_intermedio_codigo`
- LEFT JOIN con `reportes_trimestrales` para avance por trimestre
- `queryKey` incluye todos los filtros para refetch automático
- Retorna estructura: `Map<RI, { descripcion, actividades[], semaforo }>`
- Fallback cuando no hay `planificacion_actividades`: mostrar solo datos de `reportes_trimestrales`

### 2. Componente `<BarraFiltrosIndicadores />`
- Extiende `CascadingFilters` con filtro de "Nivel" (RI1, RI2, RI3, Todos)
- Botón [Aplicar filtros] + badges removibles con ×
- Mensaje "No hay datos para estos filtros" con lista de datos disponibles
- Props: `rol` determina qué filtros mostrar/ocultar

### 3. Componente `<ArbolIndicadoresActividades />`
- Agrupa por RI con collapsible (🔴 expandidos por defecto)
- Cada RI muestra: código, descripción, semáforo agregado, conteo de actividades
- Tabla de actividades dentro de cada RI: código, descripción, entidad, avance ejecutado/meta, semáforo
- Clic en actividad → panel lateral con reporte técnico + documentos
- Empty state descriptivo cuando no hay datos

## Cambios por dashboard

### IndicadoresMonitoreoPage (Fabiola — `/indicadores`)
- Reemplazar la lógica actual que usa `indicadores_proyecto` + `actividades`
- Usar `useIndicadoresActividades(filtros)` con los filtros de BarraFiltros
- Renderizar `<ArbolIndicadoresActividades />`
- Los filtros disparan refetch automático via queryKey

### DashboardCadenasValor (Iván)
- Agregar sección colapsable "Ver por indicadores" debajo de "Mis proyectos"
- Al expandir: renderiza `<ArbolIndicadoresActividades />` con filtros Mec B
- Conectar el trimestre selector existente al nuevo hook

### DashboardDireccionNew (Paula)
- En el panel lateral de entidad, agregar pestaña [Por indicadores]
- Usa `<ArbolIndicadoresActividades />` filtrado por entidad seleccionada
- El trimestre del CascadingFilters se pasa al hook

### DashboardCoordinadorRegional
- Misma integración que Iván: sección colapsable con el árbol

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/hooks/useIndicadoresActividades.ts` | Crear — hook compartido |
| `src/components/dashboard/ArbolIndicadoresActividades.tsx` | Crear — componente compartido |
| `src/pages/IndicadoresMonitoreoPage.tsx` | Reescribir — usar hook + árbol compartidos |
| `src/components/dashboard/DashboardCadenasValor.tsx` | Agregar sección colapsable |
| `src/components/dashboard/DashboardDireccionNew.tsx` | Agregar pestaña en panel lateral |
| `src/components/dashboard/DashboardCoordinadorRegional.tsx` | Agregar sección colapsable |

## Lógica de datos

```text
planificacion_actividades (PA)
  → GROUP BY resultado_intermedio_codigo
  → Para cada actividad: buscar en reportes_trimestrales
    WHERE entidad_codigo = PA.entidad_codigo
    AND actividad_codigo = PA.actividad_codigo
    AND trimestre = filtro.trimestre

Si PA no tiene datos para una entidad:
  → Usar reportes_trimestrales directamente
  → Mostrar badge "Planificación pendiente de carga"
```

