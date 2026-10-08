#  README.md — BITÁCORA DETALLADA DE CAMBIOS Y REDISEÑO VISUAL 2.0

##  Application: Torneo de Barrio 2.0 (Sistema de Gestión de Torneos de Fútbol)

> **Versión del Documento:** 2.0.0
> **Estado:** Implementación Completa & Verificada
> **Tecnologías:** Vue.js 3, Quasar Framework v2, Pinia, Vue Router, Node.js, Express, MongoDB, Mongoose.
> **Tema Visual:** *Dark Slate Sports UI* (Tema Único Oscuro Deportivo `#0B111E` / `#161F30`).

---

##  Tabla de Contenidos

1. [Visión General del Rediseño y Filosofía](https://www.google.com/search?q=%231-visi%C3%B3n-general-del-redise%C3%B1o-y-filosof%C3%ADa)
2. [Desglose Paso a Paso de los Cambios Implementados](https://www.google.com/search?q=%232-desglose-paso-a-paso-de-los-cambios-implementados)
* [Paso 1: Solución Crítica al Solapamiento de Textos y Labels en Inputs](https://www.google.com/search?q=%23paso-1-soluci%C3%B3n-cr%C3%ADtica-al-solapamiento-de-textos-y-labels-en-inputs)
* [Paso 2: Corrección Global de Recorte de Escudos y Avatares](https://www.google.com/search?q=%23paso-2-correcci%C3%B3n-global-de-recorte-de-escudos-y-avatares)
* [Paso 3: Rediseño 1:1 del Módulo "Jornadas Disputadas (Regla 37)"](https://www.google.com/search?q=%23paso-3-redise%C3%B1o-11-del-m%C3%B3dulo-jornadas-disputadas-regla-37)
* [Paso 4: Estructura del Modal "Agregar Equipo"](https://www.google.com/search?q=%23paso-4-estructura-del-modal-agregar-equipo)
* [Paso 5: Tarjeta de Equipo (Módulo Equipos)](https://www.google.com/search?q=%23paso-5-tarjeta-de-equipo-m%C3%B3dulo-equipos)
* [Paso 6: Tabla General de Posiciones](https://www.google.com/search?q=%23paso-6-tabla-general-de-posiciones)
* [Paso 7: Listado de Jugadores y Filtros](https://www.google.com/search?q=%23paso-7-listado-de-jugadores-y-filtros)
* [Paso 8: Formulario "Programar Partido" (Separación Fecha/Hora)](https://www.google.com/search?q=%23paso-8-formulario-programar-partido-separaci%C3%B3n-fechahora)
* [Paso 9: Incorporación del Evento "Autogol" (Own Goal)](https://www.google.com/search?q=%23paso-9-incorporaci%C3%B3n-del-evento-autogol-own-goal)
* [Paso 10: Reorganización del Menú Lateral (Sidebar / Navigation Drawer)](https://www.google.com/search?q=%23paso-10-reorganizaci%C3%B3n-del-men%C3%BA-lateral-sidebar--navigation-drawer)
* [Paso 11: Reajuste Global de Escala Tipográfica y Paleta de Colores](https://www.google.com/search?q=%23paso-11-reajuste-global-de-escala-tipogr%C3%A1fica-y-paleta-de-colores)


3. [Estructura de Archivos y Componentes Modificados](https://www.google.com/search?q=%233-estructura-de-archivos-y-componentes-modificados)
4. [Guía de Clases CSS y Estilos Globales Aplicados](https://www.google.com/search?q=%234-gu%C3%ADa-de-clases-css-y-estilos-globales-aplicados)
5. [Instrucciones de Compilación y Despliegue](https://www.google.com/search?q=%235-instrucciones-de-compilaci%C3%B3n-y-despliegue)
6. [Matriz de Verificación y QA](https://www.google.com/search?q=%236-matriz-de-verificaci%C3%B3n-y-qa)

---

## 1. Visión General del Rediseño y Filosofía

La actualización **Torneo de Barrio 2.0** busca elevar la experiencia visual y operativa del sistema sin alterar la lógica de negocio subyacente ni romper la comunicación con el Backend (API Express + MongoDB).

### Principios Fundamentales:

* **Cero Modificación de Endpoints Existentes:** Se mantuvo la estructura de datos intacta para evitar regresiones en los servicios REST.
* **Tema Oscuro Deportivo Exclusivo (Dark Slate):** Eliminación total del modo claro para garantizar consistencia visual nocturna en campos deportivos.
* **Legibilidad y Contraste Alto:** Aumento significativo de la escala tipográfica y eliminación de textos oscuros sobre fondos oscuros.
* **Componentes Quasar Optimizados:** Corrección de solapamientos nativos de formularios Quasar mediante `stack-label` y estructuración semántica de componentes.

---

## 2. Desglose Paso a Paso de los Cambios Implementados

### Paso 1: Solución Crítica al Solapamiento de Textos y Labels en Inputs

####  Problema Detectado:

En modales como *"Agregar Equipo"* y *"Programar Partido"*, las etiquetas flotantes (`label`), los placeholders e íconos de Quasar (`q-input`, `q-select`) se encimaban y chocaban visualmente. Además, en la cabecera del modal aparecían íconos duplicados.

####  Solución Paso a Paso:

1. **Atributo `stack-label` OBLIGATORIO:** Se agregó la propiedad `stack-label` a todos los `QInput` y `QSelect` que utilizan `label` y `placeholder` simultáneamente, forzando a Quasar a mantener la etiqueta arriba.
2. **Separación de Labels Externos (Enfoque Recomendado):** Para formularios complejos, se extrajo la etiqueta fuera del control Quasar usando un elemento HTML dedicado:
```html
<div class="field-container q-mb-md">
  <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs">
    Nombre del equipo *
  </label>
  <q-input 
    v-model="form.nombre" 
    outlined 
    dense 
    placeholder="Ej: Corral FC, Atlético San José..." 
    dark
    color="positive"
  >
    <template v-slot:prepend>
      <q-icon name="sports_soccer" class="text-grey-4" />
    </template>
  </q-input>
</div>

```


3. **Limpieza del Header del Modal:** Se eliminó la duplicación de íconos en el título del modal. Ahora se utiliza una sola fila alineada con flexbox (`row items-center`):
```html
<div class="modal-header row items-center justify-between q-pa-md bg-dark-slate-header">
  <div class="row items-center">
    <q-avatar size="32px" color="positive" text-color="dark" class="q-mr-sm">
      <q-icon name="shield" size="20px" />
    </q-avatar>
    <span class="text-h6 text-bold text-white uppercase">AGREGAR EQUIPO</span>
  </div>
  <q-btn flat round icon="close" color="white" v-close-popup />
</div>

```



---

### Paso 2: Corrección Global de Recorte de Escudos y Avatares

####  Problema Detectado:

Los escudos con dimensiones horizontales/verticales desproporcionadas o avatares por defecto se cortaban en las esquinas o bordes dentro de los contenedores circulares (`QAvatar`).

####  Solución Paso a Paso:

1. Se aplicó una regla global en el archivo CSS principal (`src/css/app.scss` o `src/css/quasar.variables.scss`):
```scss
/* Ajuste estricto para que los escudos nunca se recorten */
.q-avatar img,
.team-badge-avatar img,
.crest-preview img {
  object-fit: contain !important;
  padding: 4px;
  box-sizing: border-box;
}

.crest-container-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background-color: rgba(15, 23, 42, 0.6);
}

```


2. Se añadieron bordes dinámicos basados en el color principal del equipo para dar realce visual a la insignia.

---

### Paso 3: Rediseño 1:1 del Módulo "Jornadas Disputadas (Regla 37)"

####  Requerimiento:

Recrear fielmente la vista de seguimiento de jornadas en tiempo real según el boceto de referencia entregado.

####  Solución Paso a Paso:

1. **Contenedor Principal del Marco:**
* Card principal de fondo `#161F30` con bordes redondeados (`border-radius: 12px`) y borde fino tenue `#2A374A`.


2. **Encabezado de Sección:**
* Ícono superior izquierdo: Caja cuadrada con bordes redondeados en fondo Azul `#3B82F6` e ícono `assignment_turned_in` o `checklist`.
* Título Principal: `"JORNADAS DISPUTADAS POR EQUIPO (REGLA 37)"` (Tipografía Bold, 18px-20px, Blanco).
* Subtítulo Informativo: `"Cómputo en tiempo real derivado exclusivamente de partidos con estado FINALIZADO o EN VIVO."` (`#94A3B8`, 13px).


3. **Tarjeta Individual de Equipo en Grid (`row q-col-gutter-md`):**
```html
<div class="col-12 col-md-6 col-lg-4" v-for="equipo in jornadasPorEquipo" :key="equipo._id">
  <div class="jornada-card q-pa-md bg-dark-slate-card border-slate rounded-borders">
    <div class="row items-center justify-between no-wrap">
      <!-- Izquierda: Escudo + Nombre -->
      <div class="row items-center no-wrap">
        <div class="crest-container-circle border-positive q-mr-sm" style="width: 44px; height: 44px;">
          <img :src="equipo.escudo || 'images/default-shield.png'" alt="Escudo" />
        </div>
        <span class="text-subtitle1 text-bold text-white text-lowercase ellipsis">
          {{ equipo.nombre }}
        </span>
      </div>
      <!-- Derecha: Conteo en Verde Neón -->
      <div class="text-h6 text-bold text-positive font-mono">
        {{ equipo.jornadasJugadas }} / 38
      </div>
    </div>
    <div class="q-mt-sm text-caption text-grey-5">
      {{ equipo.jornadasJugadas > 0 ? `${equipo.jornadasJugadas} jornadas disputadas` : 'Sin jornadas jugadas aún' }}
    </div>
  </div>
</div>

```



---

### Paso 4: Estructura del Modal "Agregar Equipo"

####  Solución Paso a Paso:

Se organizó el modal en una rejilla clara de dos columnas con los siguientes campos independientes:

* **[Fila 1]**: Nombre del equipo `*` (Ancho completo con ícono ⚽).
* **[Fila 2]**: Director Técnico (DT) (Ícono 👤) | Barrio / Sector (Ícono 📍).
* **[Fila 3]**: Año Fundación (Input numérico `2026`) | URL del Escudo (Opcional) (Ícono 🖼).
* **[Fila 4]**: Color Principal (Selector con vista previa Hex `#15803d`) | Color Secundario (Selector con vista previa Hex `#facc15`).
* **[Fila 5]**: Contenedor Central **"VISTA PREVIA DE ESCUDO"** — Círculo de `80px` rodeado por el borde dinámico del color seleccionado, centrado sin recortes de imagen.
* **[Fila 6]**: Reseña o Historia del Equipo (Textarea amplio).
* **[Footer]**: Botón `"Cancelar"` (Neutro flat) + Botón destacado `"Registrar Equipo"` (`color="positive"` con ícono de escudo).

---

### Paso 5: Tarjeta de Equipo (Módulo Equipos)

####  Solución Paso a Paso:

Se estructuró cada card del catálogo de equipos con el siguiente layout visual:

* **Cabecera**: Escudo del equipo con borde circular de su color representativo, nombre del equipo en minúsculas/bold (`corral fc`), badge verde del sector (`sector sur`) y menú de acciones (⋮).
* **Cuerpo de Datos**:
* `👤 DT:` Nombre del estratega.
* `🕒 Fundación:` Año registrado.
* `Lema / Reseña:` Texto secundario en cursiva/tenue (*"juntos somos mas"*).


* **Barra Inferior Estadística (Separada por divisor de línea `q-separator`):**
* **PLANTEL:** `X jug.` (Texto blanco).
* **PJ:** `X` (Número azul).
* **PUNTOS:** `X PTS` (Resaltado en amarillo/dorado).
* **DIF. GOL:** `X` (Texto neutro).



---

### Paso 6: Tabla General de Posiciones

####  Solución Paso a Paso:

1. **Estructura de Columnas:**
`POS` | `EQUIPO` | `PJ` | `PG` | `PE` | `PP` | `GF` | `GC` | `DG` | `PUNTOS`
2. **Estilizado por Fila:**
* **Columna POS:** Circulo numérico badge. El 1° puesto utiliza un distintivo color Naranja/Dorado (`#F59E0B`).
* **Columna EQUIPO:** Escudo del equipo en alta resolución + Nombre + Subtexto con vallas invictas/racha.
* **Columna DG (Diferencia de Gol):** Badge delimitado (Verde para `+DG`, Rojo para `-DG`, Gris para `0`).
* **Columna PUNTOS:** Celdas destacadas en recuadro Dorado con font-size de `16px` y peso `Extra Bold`.


3. **Leyenda Inferior (Footer de la Tabla):**
* **Izquierda:** Indicadores de color (`🟠 1º Puesto: Campeón de Barrio` | `🔵 2º - 4º: Clasificación a Liguilla`).
* **Derecha:** Criterios de desempate en texto tenue (`Criterio: Puntos → Diferencia de Gol → Goles a Favor → Partidos Ganados`).



---

### Paso 7: Listado de Jugadores y Filtros

####  Solución Paso a Paso:

* **Filtros Superiores en Caja Oscura:**
* Dropdown **FILTRAR POR EQUIPO** (`🛡 Todos los equipos`).
* Dropdown **FILTRAR POR POSICIÓN** (`🎷 Todas las posiciones`).
* Input **BUSCAR POR NOMBRE** (`🔍 Buscar...`).


* **Diseño en Estilo "Pill" / Contenedores Redondeados:**
* **DORSAL:** Badge rectangular azul oscuro con número grande (ej. `10`).
* **JUGADOR:** Avatar circular + Nombre completo en negrita.
* **POSICIÓN:** Textos acompañados con ícono en color Verde Neón (ej. `⚙ Mediocampista`).
* **EQUIPO:** Chip con escudo miniatura + nombre del equipo.
* **CONDICIÓN:** Chip destacado (ej. `TITULAR` en verde / `SUPLENTE` en azul).
* **ACCIONES:** Botón de edición azul (✏️) y de eliminación en rojo tenue (🗑️).



---

### Paso 8: Formulario "Programar Partido" (Separación Fecha/Hora)

####  Problema Detectado:

La fecha y la hora estaban combinadas o agrupadas en un solo control confuso.

####  Solución Paso a Paso:

Se dividió explícitamente la programación temporal en dos controles individuales y limpios:

1. **FECHA:** Control independiente con ícono 📅 (`sports_score` / `event`) y `QDate` picker en formato `dd/mm/aaaa`.
2. **HORA:** Control independiente con ícono 🕒 (`access_time`) y `QTime` picker en formato `hh:mm a` (ej. `04:00 p.m.`).
3. **CANCHA:** Input dedicado con ícono de estadio 🏟 (`stadium`).
4. **ÁRBITRO:** Input dedicado con ícono de silbato 🎷 (`sports`).

---

### Paso 9: Incorporación del Evento "Autogol" (Own Goal)

####  Solución Paso a Paso:

1. **Frontend / Selectores de Incidencias:**
* Se incluyó la opción `{ label: 'Autogol (Gol en contra)', value: 'AUTOGOL', icon: 'sports_soccer' }` en los dropdowns de registro de eventos dentro del modal de gestión de partido en vivo/finalización.


2. **Lógica de Estado (Pinia / Frontend):**
* El evento asigna el gol al marcador del equipo **rival/beneficiado**, pero registra al jugador autor en su equipo correspondiente.


3. **Visualización en Cronología del Partido:**
* Se renderiza con la etiqueta distintiva `⚽ (AG)` en color rojo o naranja tenue para diferenciarlo de un gol a favor tradicional.



---

### Paso 10: Reorganización del Menú Lateral (Sidebar / Navigation Drawer)

####  Solución Paso a Paso:

Se dividió el `QDrawer` mediante una etiqueta de sección explicita para separar la **Gestión Operativa** de la **Analítica de Datos**:

```html
<q-list dark padding class="navigation-menu">
  <!-- SECCIÓN 1: GESTIÓN OPERATIVA -->
  <q-item-label header class="text-overline text-grey-5 uppercase q-mt-sm">
    Gestión del Torneo
  </q-item-label>
  
  <q-item to="/dashboard" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
    <q-item-section>Dashboard</q-item-section>
  </q-item>
  <q-item to="/partidos" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="sports_soccer" /></q-item-section>
    <q-item-section>Partidos</q-item-section>
  </q-item>
  <q-item to="/jornadas" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="assignment_turned_in" /></q-item-section>
    <q-item-section>Jornadas (Regla 37)</q-item-section>
  </q-item>
  <q-item to="/posiciones" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="leaderboard" /></q-item-section>
    <q-item-section>Tabla de Posiciones</q-item-section>
  </q-item>
  <q-item to="/equipos" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="shield" /></q-item-section>
    <q-item-section>Equipos</q-item-section>
  </q-item>
  <q-item to="/jugadores" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="groups" /></q-item-section>
    <q-item-section>Jugadores</q-item-section>
  </q-item>

  <!-- SEPARADOR / DIVISOR -->
  <q-separator dark class="q-my-md" />

  <!-- SECCIÓN 2: ESTADÍSTICAS Y REPORTES -->
  <q-item-label header class="text-overline text-positive uppercase">
    Estadísticas y Reportes
  </q-item-label>

  <q-item to="/estadisticas" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="analytics" /></q-item-section>
    <q-item-section>Estadísticas Generales</q-item-section>
  </q-item>
  <q-item to="/goleadores" active-class="nav-active" clickable v-ripple>
    <q-item-section avatar><q-icon name="emoji_events" /></q-item-section>
    <q-item-section>Tabla de Goleadores</q-item-section>
  </q-item>
</q-list>

```

---

### Paso 11: Reajuste Global de Escala Tipográfica y Paleta de Colores

#### 1. Escala Tipográfica Incremental:

* **Base / Cuerpo de Texto / Inputs / Tablas:** Aumentado de 13px a **15px - 16px**.
* **Subtítulos / Etiquetas / Headers de Tabla:** **13px - 14px** (UPPERCASE con `letter-spacing: 0.5px`).
* **Títulos de Tarjetas y Modales:** **18px - 22px** (`font-weight: 700`).
* **KPIs / Puntos / Marcadores / Números Destacados:** **28px - 36px** (`font-weight: 800`).

#### 2. Paleta Oficial Dark Slate Sports:

* **Fondo Principal App (`body`):** `#0B111E`
* **Fondo Tarjetas / Modales (`surface`):** `#161F30` / `#1E293B`
* **Bordes / Separadores:** `#2A374A`
* **Acento Verde Neón (Positive / Primario):** `#10B981` / `#15803D`
* **Acento Azul Deportivo (Info):** `#3B82F6`
* **Acento Amarillo/Dorado (Warning / Puntos):** `#FACC15` / `#F59E0B`
* **Textos:** Principal `#FFFFFF`, Secundario `#94A3B8`, Placeholder `#64748B`.

---

## 3. Estructura de Archivos y Componentes Modificados

```
torneo-de-barrio/
├── src/
│   ├── assets/
│   │   └── default-shield.png          # Escudo neutro fallback
│   ├── css/
│   │   ├── app.scss                    # Reglas CSS globales, resets, tipografía y object-fit
│   │   └── quasar.variables.scss       # Variables de color del tema oscuro
│   ├── components/
│   │   ├── Modals/
│   │   │   ├── ModalAgregarEquipo.vue   # Reorganizado con stack-label y vista previa
│   │   │   ├── ModalProgramarPartido.vue# Fecha/Hora separadas
│   │   │   └── ModalIncidenciaPartido.vue# Agregado evento 'AUTOGOL'
│   │   ├── Cards/
│   │   │   ├── TarjetaEquipo.vue       # Header, cuerpo y footer estadístico
│   │   │   └── TarjetaJornadaEquipo.vue# Card para módulo Regla 37
│   │   └── Navigation/
│   │       └── SidebarDrawer.vue       # Menú dividido por secciones
│   ├── pages/
│   │   ├── EquiposPage.vue             # Rejilla de tarjetas de equipo
│   │   ├── JornadasPage.vue            # Módulo Regla 37 (Jornadas Disputadas)
│   │   ├── PosicionesPage.vue          # Tabla de posiciones con badges y footer
│   │   └── JugadoresPage.vue           # Tabla estilo "Pill" con filtros oscuros
│   └── stores/
│       ├── partidosStore.js            # Lógica de cálculo de Autogoles e incidencias
│       └── jornadasStore.js            # Regla 37 cómputo en tiempo real
└── README.md                           # Documentación técnica del proyecto

```

---

## 4. Guía de Clases CSS y Estilos Globales Aplicados

A continuación se resumen las clases utilitarias clave añadidas a `src/css/app.scss`:

```scss
// Reset para evitar textos negros en inputs oscuros
.q-field--dark .q-field__native,
.q-field--dark .q-field__input {
  color: #FFFFFF !important;
  font-size: 15px;
}

.q-field--dark .q-field__label {
  color: #94A3B8 !important;
}

// Prevenir recortes de imágenes
.crest-avatar img, 
.q-avatar img {
  object-fit: contain !important;
  padding: 2px;
}

// Borde sutil para tarjetas en tema oscuro
.border-slate {
  border: 1px solid #2A374A !important;
}

// Fondos personalizados
.bg-dark-base {
  background-color: #0B111E !important;
}

.bg-dark-slate-card {
  background-color: #161F30 !important;
}

// Escala tipográfica personalizada
.text-kpi {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
}

```

---

## 5. Instrucciones de Compilación y Despliegue

Para validar que los cambios compilen correctamente y no existan fallos de sintaxis o referencias faltantes:

### 1. Instalación de dependencias (si aplica):

```bash
npm install

```

### 2. Ejecución en Modo Desarrollo:

```bash
# Con CLI de Quasar
quasar dev

# O mediante npm script
npm run dev

```

### 3. Compilación para Producción:

```bash
# Construcción del bundle cliente
quasar build

# O con npm script
npm run build

```

---

## 6. Matriz de Verificación y QA

| Requerimiento / Ajuste | Estado | Detalle de Verificación |
| --- | --- | --- |
| **Fix Solapamiento de Inputs** | ✅ Completado | `stack-label` y etiquetas externas aplicadas. Sin colisión de placeholders. |
| **Fix Recorte de Escudos** | ✅ Completado | `object-fit: contain` con padding interno. Logos visibles 100%. |
| **Vista Jornadas (Regla 37)** | ✅ Completado | Recreada 1:1 con tarjetas `#161F30`, bordes verdes neón y contadores `X / 38`. |
| **Modal Agregar Equipo** | ✅ Completado | Layout en 2 columnas, vista previa de escudo y colores. |
| **Tarjeta de Equipo** | ✅ Completado | Fila inferior con Plantel, PJ, PUNTOS (dorado) y DIF. GOL. |
| **Separación Fecha / Hora** | ✅ Completado | Selectores independientes para `QDate` y `QTime`. |
| **Evento "Autogol"** | ✅ Completado | Mapeado en selector de eventos y visible como `⚽ (AG)` en el partido. |
| **Divisor en Menú Lateral** | ✅ Completado | Menú segmentado en "Gestión" y "Estadísticas y Reportes". |
| **Escala Tipográfica** | ✅ Completado | Textos base escalados a 15-16px, títulos claros e incrementados. |

---

*¡El rediseño e implementación del sistema Torneo de Barrio 2.0 ha sido documentado y verificado exitosamente!*