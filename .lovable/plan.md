
# Plan: Generar Manual Técnico de la Plataforma SeCompetitivo

## Objetivo
Crear un documento Markdown completo (`/mnt/documents/manual_tecnico_secompetitivo.md`) que sirva como referencia técnica para que otra IA pueda entender la arquitectura, los datos, los flujos y la lógica de negocio de la aplicación.

## Contenido del Manual

El documento incluirá las siguientes secciones:

1. **Descripción General** — Qué es SeCompetitivo, su propósito (monitoreo de programa de cooperación SECO-Perú), mecanismos A y B
2. **Stack Tecnológico** — React 18, Vite 5, Tailwind CSS, TypeScript, Supabase (Lovable Cloud), TanStack Query, docx, xlsx, lucide-react
3. **Arquitectura de Roles** — Los 8 roles, qué ve cada uno (navegación, dashboards, permisos), sin autenticación real (selector dropdown MVP)
4. **Esquema de Base de Datos** — Todas las tablas con columnas, tipos, relaciones lógicas (sin FK formales), enums, triggers, funciones SQL
5. **Flujos de Negocio Principales**:
   - Registro mensual de avance por actividad (entidad → envío → revisión técnica/financiera → aprobación)
   - Diferenciación Mec A vs Mec B en flujo financiero
   - Aprobación trimestral por Dirección
   - Indicadores de impacto (productividad, empleo, comercial, gobernanza, etc.)
   - Generación de reportes (trimestral, semestral, anual)
   - Notificaciones y historial de cambios
6. **Estructura de Archivos** — Mapa de carpetas src/pages, src/components, src/lib, src/hooks, src/contexts
7. **Edge Functions y IA** — Función `analyze` con 4 tipos de análisis (ejecutivo, reporte, consistencia, narrativa), prompts del sistema, modelo usado
8. **Generación de Documentos** — DOCX con librería docx, CSV con BOM UTF-8, Excel con SheetJS
9. **Componentes Clave** — MapaMarcoLogico (árbol jerárquico), DashboardCadenasValor (agrupación por cadena), ResumenRegional, AprobacionTrimestral
10. **Diseño Visual** — Tokens de color (#0f2b46 sidebar, #2a9d8f primario, etc.), fuente DM Sans

## Implementación

- Leer los archivos restantes que falten para completar detalles
- Generar un archivo Markdown extenso y bien estructurado en `/mnt/documents/manual_tecnico_secompetitivo.md`
- Usar un script Python para escribir el contenido

## Archivos a Modificar
Ningún archivo del proyecto se modifica. Solo se genera un artifact en `/mnt/documents/`.
