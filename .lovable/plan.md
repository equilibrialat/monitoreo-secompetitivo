

## Reestructurar Sección B: Cards solo para "Este mes", resúmenes como enlaces

### Cambio solicitado
- Las tarjetas completas (con botones Av. Técnico / Av. Presup.) deben mostrarse **solo para actividades con entregable ESTE MES** (`esteMes === true`)
- Los rezagados, pendientes y reportados se convierten en **badges-enlace** debajo (como los actuales de "vencidas" y "completadas"), cada uno navegando a `/mi-planificacion`

### Cambio en `src/components/dashboard/DashboardEntidad.tsx`

**1. Separar datos en dos grupos (nuevo `useMemo` o derivar del existente):**
- `tareasEsteMes`: actividades donde `esteMes === true` → se renderizan como cards completas (sin los pills de rezagados/etc, solo la info de la actividad + botones)
- Conteos para badges: sumar `rezagados`, `pendientes`, `reportados` de todas las `actividadesConPendientes`

**2. Render de tarjetas** (líneas ~254-309):
- Solo iterar `tareasEsteMes` con cards completas (código, descripción, botones Av. Técnico y Av. Presup.)
- Sin pills de estado dentro de cada card (ya no hace falta, todas son "este mes")
- Border amarillo (entregable este mes)

**3. Badges-enlace debajo** (líneas ~312-334):
- Reemplazar los badges actuales con 3 badges resumen:
  - 🔴 `N entregable(s) rezagado(s)` → `/mi-planificacion` (solo si > 0)
  - 🟢 `N reportado(s)` → `/mi-planificacion` (solo si > 0)
  - ⚪ `N pendiente(s) futuro(s)` → `/mi-planificacion` (solo si > 0)
- Mantener el badge de completadas existente

**4. Título de sección**: cambiar a "Lo que toca entregar este mes" para ser más claro

### Archivo a modificar
- `src/components/dashboard/DashboardEntidad.tsx`

