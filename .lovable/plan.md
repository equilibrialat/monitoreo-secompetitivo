

# Plan: Enrich Dashboards to Display 4 Demo Cases with Differentiated Alerts

## Problem
The dashboards currently show basic KPIs and alerts based on the `v_dashboard_entidad` view, but lack entity-specific detail like "activities not started", "months without reports", "observed records", and detailed sobregiro info. The data is in the DB but the UI doesn't surface these granular alerts.

## Changes

### 1. Enhance `useDashboardData.ts` — Fetch richer per-entity data

Add queries to fetch:
- **Registros mensuales status per entity** (to detect missing months, observed records, borrador status)
- **Activities with `estado_actual = 'no_iniciada'`** count per entity
- **Latest registro date** per entity

Add new fields to `DashboardEntidad`:
- `actividades_sin_iniciar: number`
- `registros_observados: number`
- `ultimo_registro_mes: number | null`
- `ultimo_registro_anio: number | null`
- `meses_sin_reporte: string[]` (e.g., ["Dic 2025"])
- `tiene_observado: boolean`
- `registros_borrador: number`

The fetch function will query `registros_mensuales` grouped by entity to compute these, and `actividades` for `estado_actual` counts.

### 2. Update `DashboardMonitoreo.tsx` — Richer alerts and entity cards

**Alerts section**: Add specific alert messages:
- SENASA: "Sobregiro en S1.1.3", "Registro Oct observado"
- CANATUR: "4 actividades sin iniciar", "Dic 2025 sin reportar", "Nov en revisión coordinador"

**Entity cards**: Add badges for:
- "Sobregiro" badge (red) when `sobregiros_seco > 0`
- "Observado" badge (orange) when `tiene_observado`
- "X sin iniciar" when `actividades_sin_iniciar > 0`
- "Último reporte: Mes YYYY" line
- Missing month alerts

### 3. Update `DashboardAdministracion.tsx` — Highlight sobregiros

Add a "Sobregiros Detallados" section that queries `ejecucion_financiera` joined with `actividades` to show specific activities with executed > budgeted. This will highlight SENASA S1.1.3 and CANATUR T2.1.2 with their actual amounts.

### 4. Role-specific `filterFn` corrections (already done, verify)

- **Asesora Políticas (Claudia)**: `filterFn={(e) => e.mecanismo === "A"}` — shows COFIDE + SENASA
- **Coordinador Cadenas (Iván)**: `filterFn={(e) => e.mecanismo === "B"}` — shows APPCACAO + CANATUR

These filters are already in `Index.tsx` and should work with the data.

### 5. `MisActividades.tsx` — Already shows observados

The page already has an "Observados" section that shows records with `estado_registro === "observado"` and displays `observaciones_revision` in red. This should work for SENASA when selected. Verify that the `en_revision_coordinador` status for CANATUR Nov is visible in the status badges.

### 6. Update `ActivityCard.tsx` — Show `en_revision_coordinador` status

Check if the ActivityCard component handles the `en_revision_coordinador` status label. If not, add it to the status label map.

### Files to modify:
1. **`src/hooks/useDashboardData.ts`** — Add richer entity metrics (sin iniciar, observados, missing months)
2. **`src/components/dashboard/DashboardMonitoreo.tsx`** — Enhanced alerts with specific messages, richer entity cards with badges
3. **`src/components/dashboard/DashboardAdministracion.tsx`** — Add sobregiro detail table with activity-level breakdown
4. **`src/components/ActivityCard.tsx`** — Ensure `en_revision_coordinador` status is labeled properly

### Technical approach:
- Additional queries in `useDashboardData` to `registros_mensuales` and `actividades` tables
- Alert logic in `DashboardMonitoreo` checks for `actividades_sin_iniciar`, `tiene_observado`, `meses_sin_reporte`
- New sobregiro detail query in `DashboardAdministracion` joining `ejecucion_financiera` with `actividades` to get per-activity overrun amounts

