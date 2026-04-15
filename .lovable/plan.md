

## Plan: Ocultar selector de trimestres para entidades + quitar Notificaciones del menú de entidad

### Cambio 1 — Ocultar `TrimestreHeader` para roles de entidad

**Archivo**: `src/components/AppLayout.tsx`

Importar `useRole` del contexto y condicionar la renderización de `<TrimestreHeader />` para que NO se muestre cuando el rol sea `entidad_mec_a` o `entidad_mec_b`. Los demás roles lo siguen viendo.

```tsx
const { role } = useRole();
const showTrimestre = !["entidad_mec_a", "entidad_mec_b"].includes(role);
// ...
{showTrimestre && <TrimestreHeader />}
```

### Cambio 2 — Quitar "Notificaciones" del menú lateral de entidades

**Archivo**: `src/config/navigation.ts`

En `ENTIDAD_NAV` (líneas 36-58), eliminar el item `{ label: "Notificaciones", path: "/notificaciones", icon: Bell }` de la sección GESTIÓN. Si la sección queda vacía, eliminarla por completo.

Las entidades seguirán viendo la campanita (`NotificationBell`) en el header para recibir actualizaciones, pero no tendrán acceso a la página de envío de notificaciones.

### Archivos a modificar
1. `src/components/AppLayout.tsx` — condicionar `TrimestreHeader`
2. `src/config/navigation.ts` — quitar Notificaciones de `ENTIDAD_NAV`

