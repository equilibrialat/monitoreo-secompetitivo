

## Plan: Default a Entidad Mecanismo B (App Cacao)

### Cambio en `src/contexts/RoleContext.tsx`

**Línea 67**: Cambiar el estado inicial del rol de `"entidad_mec_a"` a `"entidad_mec_b"`.

**Lógica de selección de entidad inicial** (~línea 103): Después de cargar las entidades, en vez de tomar `filteredFull[0]`, buscar primero la entidad cuyo `nombre_corto` contenga "Cacao" (o código equivalente). Si no se encuentra, usar la primera disponible como fallback.

```ts
// Línea 67
const [role, setRole] = useState<AppRole>("entidad_mec_b");

// Línea ~103 (selección inicial)
const defaultEntity = filteredFull.find(e => 
  e.nombre_corto?.toLowerCase().includes("cacao")
) || filteredFull[0];
if (!entidadId && defaultEntity) setEntidadId(defaultEntity.id);
```

Todo lo demás sigue igual: el usuario puede cambiar rol y entidad libremente.

### Archivo a modificar
- `src/contexts/RoleContext.tsx`

