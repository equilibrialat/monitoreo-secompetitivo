

## Crear tablas `entregables` y `contrapartida_no_monetaria`

Ejecutar la migración SQL que enviaste, exactamente como la especificaste, sin modificar la estructura ni las políticas.

### Qué se va a crear

**Tabla `public.entregables`** — registro de productos/entregables comprometidos por contrato o actividad.
- Campos: `id`, `entidad_codigo`, `actividad_codigo`, `contrato_id`, `titulo`, `descripcion`, `tipo` (informe/producto/consultoria/capacitacion/estudio/otro), `responsable_nombre`, `responsable_rol` (consultor/equipo_interno/socio), `fecha_compromiso`, `fecha_entrega_real`, `estado` (pendiente/en_proceso/entregado/observado, default `pendiente`), `presupuesto_vinculado_usd`, `documento_url`, `observaciones`, `created_at`, `updated_at`.
- Columna generada: `mes` = `TO_CHAR(fecha_compromiso, 'YYYY-MM')` STORED.
- Validaciones por CHECK constraints en `tipo`, `responsable_rol` y `estado`.

**Tabla `public.contrapartida_no_monetaria`** — registro de horas de funcionarios valorizadas.
- Campos: `id`, `entidad_codigo`, `actividad_codigo`, `fecha`, `funcionario_nombre`, `funcionario_cargo`, `concepto`, `unidad` (default `Hora`), `cantidad`, `costo_unitario_soles`, `tipo_cambio` (default `3.75`), `total_usd`, `created_at`.
- Columnas generadas STORED: `total_soles` = `cantidad * costo_unitario_soles`, `mes` = `TO_CHAR(fecha, 'YYYY-MM')`.

### Seguridad (RLS)

Ambas tablas con RLS habilitado y 4 políticas `public_*` (SELECT/INSERT/UPDATE/DELETE) abiertas con `USING (true)` / `WITH CHECK (true)`, consistente con el patrón ya usado en el resto del proyecto (`comprobantes`, `contratos`, `desembolsos`, etc.).

### Verificación posterior

Después de aplicar la migración, voy a:
1. Re-ejecutar `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('entregables','contrapartida_no_monetaria')` y confirmar que devuelve 2 filas.
2. Listar columnas de cada tabla para confirmar que las columnas generadas (`mes`, `total_soles`) quedaron como `GENERATED ALWAYS … STORED`.
3. Confirmar las 8 políticas RLS creadas.

### Notas técnicas / consideraciones

1. **Tabla `contrapartida_no_monetaria` ya tiene un consumidor frontend desfasado.** La página `src/pages/mec-a/ContrapartidaNoMonetariaPage.tsx` (vía `src/lib/mecA.ts → fetchMecAContrapartidaNoMonetaria / insertMecAContrapartidaNoMonetaria`) actualmente usa otro nombre de columnas: `iniciativa_id`, `actividad_id`, `fecha_actividad`, `nombre_funcionario`, `cargo_funcionario`, `unidad_medida`, `registrado_por`. El esquema que pediste usa: `entidad_codigo`, `actividad_codigo`, `fecha`, `funcionario_nombre`, `funcionario_cargo`, `unidad`. **Esa página seguirá rota tras la migración** porque apunta a campos que no existen. No la voy a tocar en esta migración (tu instrucción es solo crear las tablas), pero conviene tenerlo en cuenta — cuando quieras cablear esa UI a la nueva tabla, dímelo y lo hacemos en un paso aparte.

2. **No existe consumidor frontend para `entregables` aún.** Tabla nueva sin código que la lea/escriba todavía. OK.

3. **CHECK constraints vs triggers de validación:** las directrices internas recomiendan triggers en lugar de CHECK para validaciones complejas o time-based. Aquí los CHECK son sobre **enums fijos de strings** (`tipo`, `responsable_rol`, `estado`) — son inmutables y seguros, así que se mantienen como CHECK tal cual los especificaste.

4. **No se crean índices, foreign keys ni triggers** (`updated_at` automático, etc.) — solo lo que está en tu SQL. Si quieres que añada un trigger `update_updated_at_column` para `entregables.updated_at`, o índices sobre `entidad_codigo` / `actividad_codigo` / `mes` para queries de dashboard, dímelo.

### Plan de ejecución

Una sola migración SQL con el bloque exacto que enviaste. No requiere cambios en `src/integrations/supabase/types.ts` porque ese archivo se regenera automáticamente tras la migración.

