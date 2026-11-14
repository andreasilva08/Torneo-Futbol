# Torneo Barrio - Frontend

## Registro de Cambios y Mejoras

### 2026-11-13
- **Refactorización de `ImagePreview.vue`**: Eliminación de props no utilizadas, limpieza de sintaxis y migración de estilos dinámicos a clases CSS.
- **Refactorización de `MatchSummaryCard.vue`**: Eliminación de props huérfanas (`compact`, `crestSize`, `useShortNames`, `highlightTeamId`).
- **Componentización de Tablas de Estadísticas**: Creación del componente reutilizable `PlayerStatsTable.vue` para unificar la visualización de datos en las vistas de Goleadores, Asistencias y Porteros.
- **Limpieza de Código**: Reducción de código duplicado en múltiples archivos `.vue` y estandarización de componentes de UI.
