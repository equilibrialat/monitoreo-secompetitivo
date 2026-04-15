

## Plan consolidado: Desglose de entregables en Dashboard + Selector "Mes a reportar" en ambos modales

### Cambio 1 — Dashboard: Cards con desglose por actividad

**Archivo**: `src/components/dashboard/DashboardEntidad.tsx`

Reemplazar `tareasDelMes` con `actividadesConPendientes` que clasifica cada mes de `meses_programados` por estado:

```ts
type ActividadDesglose = PlanificacionActividad & {
  rezagados: number;
  esteMes: boolean;
  pendientes: number;
  reportados: number;
};
```

- Filtrar actividades con `rezagados > 0` o `esteMes === true`
- Cada card muestra la actividad UNA vez con pills de color (rojo=rezagados, amarillo=este mes, gris=pendientes, verde=reportados)
- Botón "Registrar avance" abre el modal pasando `mesesProgramados` y `mesesReportados`
- Se mantienen los badges de vencidas/completadas debajo

---

### Cambio 2 — Modal Avance Técnico: Agregar selector "Mes a reportar"

**Archivo**: `src/components/planificacion/ModalAvanceTecnico.tsx`

- Nuevas props opcionales: `mesesProgramados?: string[]`, `mesesReportados?: Set<string>`
- Cuando se pasan estas props, mostrar un `<Select>` "Mes a reportar" con los meses pendientes (no reportados), cada uno con indicador visual:
  - 🔴 mes < currentYM (rezagado)
  - 🟡 mes === currentYM (este mes)
  - ⚪ mes > currentYM (futuro)
- El `mes` y `anio` del insert se derivan del mes seleccionado
- Se mantiene "Fecha de ejecución" como campo separado (cuándo se hizo el trabajo)
- Si no se pasan las props, el modal funciona como antes (retrocompatible)

---

### Cambio 3 — Modal Avance Presupuestario: Mismo selector "Mes a reportar"

**Archivo**: `src/components/planificacion/ModalAvancePresupuestario.tsx`

- Mismas props opcionales: `mesesProgramados?: string[]`, `mesesReportados?: Set<string>`
- Mismo `<Select>` de "Mes a reportar" con las mismas reglas de color
- El `mes` y `anio` del registro mensual se derivan del mes seleccionado
- Retrocompatible cuando no se pasan las props

---

### Cambio 4 — MiPlanificacion: Pasar props a los modales

**Archivo**: `src/components/planificacion/MiPlanificacion.tsx`

- Al abrir `ModalAvanceTecnico` y `ModalAvancePresupuestario`, pasar:
  - `mesesProgramados={modalX.act.meses_programados}`
  - `mesesReportados={reportsByActivity.get(modalX.act.actividad_codigo) || new Set()}`

---

### Archivos a modificar
1. `src/components/dashboard/DashboardEntidad.tsx` — desglose de entregables + pasar props al modal
2. `src/components/planificacion/ModalAvanceTecnico.tsx` — selector "Mes a reportar"
3. `src/components/planificacion/ModalAvancePresupuestario.tsx` — selector "Mes a reportar"
4. `src/components/planificacion/MiPlanificacion.tsx` — pasar mesesProgramados/mesesReportados a ambos modales

