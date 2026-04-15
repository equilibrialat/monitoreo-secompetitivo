

## Rediseño de "Lo que toca hacer este mes"

### Cambio solicitado
La sección B del dashboard debe mostrar:
1. **Solo actividades entregables este mes (abril)** — sin mezclar vencidas
2. **Debajo**, dos enlaces/badges lado a lado:
   - **Izquierda**: enlace rojo a actividades vencidas (como el badge actual de Sección C)
   - **Derecha**: enlace verde a actividades completadas

### Cambios en `src/components/dashboard/DashboardEntidad.tsx`

1. **Separar `tareasDelMes`** para que solo filtre `entregable_este_mes` (sin `vencida`)
2. **Reemplazar la Sección C** (badge de alerta solo vencidas) por una fila con dos badges lado a lado:
   - 🔴 `N actividad(es) vencida(s)` → navega a `/mi-planificacion`
   - ✅ `N actividad(es) completada(s)` → navega a `/mi-planificacion`
3. Ambos badges se muestran siempre (con conteo 0 si aplica), o solo cuando el conteo > 0

### Detalle técnico
- `tareasDelMes`: filtrar solo `lifecycle === "entregable_este_mes"`
- Mover la lógica de vencidas al bloque de badges junto con completadas
- Los badges usan `flex gap-2` en una fila horizontal debajo de las cards de tareas del mes

