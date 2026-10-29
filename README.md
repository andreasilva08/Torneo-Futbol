# ⚽ Torneo Barrio - Plataforma Full-Stack de Gestión Deportiva

Sistema web full-stack para la administración, programación y control de torneos de fútbol aficionados y comunitarios.

## 📌 Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Módulos Principales](#módulos-principales)
5. [Requisitos Previos](#requisitos-previos)
6. [Configuración e Instalación](#configuración-e-instalación)
7. [Despliegue](#despliegue)

---

## 📝 Descripción del Proyecto

Torneo Barrio es una plataforma full-stack diseñada para gestionar torneos de fútbol comunitarios, permitiendo:
- **Administración de equipos y jugadores**: Creación, edición y visualización de equipos y jugadores con sus respectivas condiciones (titular, suplente, lesionado, sancionado).
- **Gestión de partidos y actas**: Programación de partidos, registro de goles, asistencias, tarjetas, sustituciones y lesiones en tiempo real.
- **Tabla de posiciones dinámica**: Cálculo automático de posiciones, puntos, goles a favor y en contra.
- **Estadísticas avanzadas**: Tablas de goleadores, asistentes y valla menos vencida.
- **Control disciplinario**: Gestión de sanciones automáticas por tarjetas y lesiones.

El sistema está optimizado para ser utilizado en entornos comunitarios, con una interfaz intuitiva y funcionalidades que facilitan la gestión de torneos deportivos.

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js**: Entorno de ejecución.
- **Express.js**: Framework web para manejar las rutas y lógica del servidor.
- **MongoDB Atlas**: Base de datos NoSQL en la nube para almacenar datos de equipos, jugadores y partidos.
- **Mongoose**: ODM para modelar y validar los esquemas de datos.
- **Axios**: Cliente HTTP para manejar las peticiones desde el frontend.

### Frontend
- **Vue 3**: Framework progresivo para construir interfaces de usuario.
- **Quasar Framework**: Biblioteca de componentes para crear interfaces modernas y responsivas.
- **Vite**: Herramienta de construcción y desarrollo rápida.
- **Pinia**: Biblioteca de estado para Vue para manejar el estado global de la aplicación.
- **Vue Router**: Para el manejo de rutas y navegación.

---

## 📂 Estructura del Proyecto

```text
Torneo-Futbol/
├── torneo-barrio-backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Player.js          # Modelo de jugadores con condición 'SIN_ASIGNAR'
│   │   │   ├── Team.js            # Modelo de equipos
│   │   │   └── Match.js           # Modelo de partidos
│   │   ├── controllers/
│   │   │   ├── playerController.js # Lógica de jugadores
│   │   │   ├── matchController.js # Lógica de partidos
│   │   │   └── statsController.js # Lógica de estadísticas
│   │   └── routes/
│   │       ├── playerRoutes.js
│   │       ├── matchRoutes.js
│   │       └── statsRoutes.js
│   └── package.json
│   └── .env
│   └── .env.example
│   └── app.js
│   └── config/
│       └── db.js
│   └── middleware/
│       └── errorHandler.js
│
├── torneo-barrio-frontend/
│   ├── src/
│   │   ├── stores/
│   │   │   ├── tournament.js      # Store global
│   │   │   ├── teams.js           # Store de equipos
│   │   │   ├── players.js         # Store de jugadores
│   │   │   └── stats.js           # Store de estadísticas
│   │   ├── views/
│   │   │   ├── StandingsView.vue   # Tabla de posiciones
│   │   │   ├── PlayersView.vue     # Vista de jugadores
│   │   │   ├── MatchesView.vue     # Vista de partidos
│   │   │   └── MatchDetailView.vue # Detalle de partidos
│   │   ├── components/
│   │   ├── utils/
│   │   └── services/
│   │       └── api.js             # Configuración de Axios
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│   └── main.js
│   └── router/
│       └── index.js
│
├── README.md
└── .gitignore
```

---

## 📋 Módulos Principales

### 1. Equipos y Jugadores
- **Equipos**: Creación, edición y visualización de equipos con logos y nombres.
- **Jugadores**: Gestión de jugadores con condiciones como `TITULAR`, `SUPLENTE`, `LESIONADO`, `SANCIONADO_ROJA`, `SANCIONADO_AMARILLAS` y `SIN_ASIGNAR`.
- **Plantillas**: Visualización de jugadores por equipo con sus respectivas condiciones.

### 2. Partidos
- **Fixture**: Programación de partidos por jornadas.
- **Actas de Partido**: Registro de goles, asistencias, tarjetas, sustituciones y lesiones en tiempo real.
- **Marcador**: Visualización y actualización del marcador en vivo.

### 3. Estadísticas
- **Tabla de Posiciones**: Cálculo automático de puntos, partidos jugados, goles a favor y en contra.
- **Tablas de Rendimiento**: Máximos goleadores, asistentes y valla menos vencida.

### 4. Control Disciplinario
- **Sanciones Automáticas**: Detección de tarjetas rojas directas y acumulación de tarjetas amarillas.
- **Lesiones**: Registro de lesiones y sustituciones obligatorias.

---

## 📋 Requisitos Previos

- **Node.js**: Versión 18.x o superior.
- **npm**: Versión 9.x o superior.
- **MongoDB Atlas**: Cuenta activa para configurar la conexión a la base de datos.
- **Acceso a Internet**: Para conectar con MongoDB Atlas.

---

## ⚙️ Configuración e Instalación

### Backend

1. Navega a la carpeta del backend:
   ```bash
   cd torneo-barrio-backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura el archivo `.env` con las variables necesarias:
   ```env
   PORT=5001
   MONGO_URI=mongodb+srv://<usuario>:<password>@cluster1.p7qdqgc.mongodb.net/torneo-futbol?retryWrites=true&w=majority
   CORS_ORIGIN=http://localhost:5173,http://localhost:4173
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

   El servidor quedará disponible en: `http://localhost:5001`.

### Frontend

1. Abre una nueva terminal y navega a la carpeta del frontend:
   ```bash
   cd torneo-barrio-frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. (Opcional) Configura la URL del backend en `.env`:
   ```env
   VITE_API_URL=http://localhost:5001/api
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

   La aplicación se abrirá en: `http://localhost:5173`.

---

## 🚀 Despliegue

Para desplegar el proyecto en producción, sigue estos pasos:

### Backend

1. Configura las variables de entorno en un entorno de producción.
2. Compila y optimiza el código:
   ```bash
   npm run build
   ```
3. Ejecuta el servidor en modo producción:
   ```bash
   npm start
   ```

### Frontend

1. Compila la aplicación para producción:
   ```bash
   npm run build
   ```

2. Configura un servidor estático para servir los archivos generados en la carpeta `dist`.

---

## 📄 Notas Adicionales

- **Condición de Jugadores**: Los jugadores pueden tener las siguientes condiciones: `TITULAR`, `SUPLENTE`, `LESIONADO`, `SANCIONADO_ROJA`, `SANCIONADO_AMARILLAS` y `SIN_ASIGNAR`.
- **Validaciones**: El sistema valida que los dorsales sean únicos por equipo y que los jugadores sancionados no puedan participar en partidos.
- **Automatización**: Las estadísticas y tabla de posiciones se actualizan automáticamente al finalizar los partidos.

---

## 👥 Autores

Este proyecto fue desarrollado por el equipo de Torneo Barrio para facilitar la gestión de torneos deportivos comunitarios.