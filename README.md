# ⚽ Torneo de Fútbol de Barrio - Plataforma de Gestión Deportiva

Sistema web full-stack diseñado para la administración, programación, control en vivo y estadísticas de torneos de fútbol aficionados y comunitarios.

Permite gestionar equipos, plantillas de jugadores, fixtures por jornadas, actas de partidos en vivo (goles, asistencias, tarjetas) y genera automáticamente la tabla de posiciones y las tablas de goleo y asistencias con cómputo nativo en base de datos.

---

## 📌 Tabla de Contenidos

1. [Características Principales](#-características-principales)
2. [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Requisitos Previos](#-requisitos-previos)
5. [Configuración e Instalación](#-configuración-e-instalación)
   - [Configuración del Backend](#1-backend-torneo-barrio-backend)
   - [Configuración del Frontend](#2-frontend-torneo-barrio-frontend)
6. [Catálogo de la API REST](#-catálogo-de-la-api-rest)
7. [Documento de Exposición y Mejoras](#-documento-de-exposición-y-mejoras)
8. [Autores y Créditos](#-autores-y-créditos)

---

## 🚀 Características Principales

- **🛡️ Gestión de Clubes / Equipos**: Creación, actualización y eliminación de equipos con nombre oficial, abreviatura (shortName), estadio y escudo.
- **🏃‍♂️ Gestión de Jugadores**: Registro de futbolistas vinculados a su club con número de dorsal, posición en el campo y fotografía.
- **📅 Fixture y Calendario por Jornadas**: Programación de partidos con fecha, hora y equipos rivales. Valida reglas de negocio (ej. un club no puede disputar la misma jornada dos veces).
- **⏱️ Marcador y Acta en Vivo**: Registro de resultados, estado (`SCHEDULED`, `IN_PROGRESS`, `FINISHED`), autores de goles con minuto y asistencias.
- **📊 Tabla de Posiciones Dinámica**: Cálculo automático de Puntos (Pts), Partidos Jugados (PJ), Ganados (PG), Empatados (PE), Perdidos (PP), Goles a Favor (GF), Goles en Contra (GC) y Diferencia de Gol (DG).
- **🥇 Tablas de Rendimiento (MongoDB Aggregation Pipelines)**:
  - Máximos Goleadores (Top Scorers).
  - Máximos Asistidores (Top Assists).
  - Valla Menos Vencida (Goalkeepers).

---

## 🛠️ Arquitectura y Stack Tecnológico

El proyecto está diseñado bajo un modelo **desacoplado Cliente-Servidor (Client-Server Architecture)**:

```mermaid
graph TD
    Client[Cliente Web: Vue 3 + Vite + Pinia] -->|Peticiones HTTP REST| Backend[API REST: Node.js + Express]
    Backend -->|Mongoose ODM / TCP Seguro| Database[(Base de Datos: MongoDB Atlas Cloud)]
```

### Backend
- **Entorno de ejecución**: Node.js
- **Framework web**: Express.js
- **Base de datos**: MongoDB Atlas (Cloud)
- **Modelado de datos (ODM)**: Mongoose
- **Variables de entorno**: dotenv
- **Seguridad**: CORS configurable con lista blanca

### Frontend
- **Framework**: Vue 3 (Composition API / Options API)
- **Empaquetador y Dev Server**: Vite
- **Manejo de Estado Global**: Pinia (con stores modulares: `teams`, `players`, `stats`, `tournament`)
- **Enrutamiento**: Vue Router
- **Cliente HTTP**: Axios (con interceptores para manejo centralizado de errores y tiempos de espera)

---

## 📂 Estructura del Proyecto

```text
Torneo-Futbol-main/
├── README.md                      # Documentación general del repositorio
├── EXPOSICION_Y_AJUSTES.md        # Guía para exponer el proyecto y bitácora técnica
│
├── torneo-barrio-backend/         # Servidor API REST (Node.js + Express)
│   ├── .env                       # Variables de entorno (conexión MongoDB Atlas, puerto)
│   ├── .env.example               # Plantilla de variables de entorno
│   ├── package.json
│   └── src/
│       ├── app.js                 # Inicialización de Express, CORS y middlewares
│       ├── config/
│       │   └── db.js              # Conexión optimizada a MongoDB Atlas con reconexión
│       ├── controllers/
│       │   ├── matchController.js # Lógica de partidos, fixture y actas
│       │   ├── playerController.js# Lógica de jugadores y plantillas
│       │   ├── statsController.js # Pipelines de agregación (posiciones, goleadores)
│       │   └── teamController.js  # Lógica de gestión de clubes
│       ├── middleware/
│       │   └── errorHandler.js    # Manejo centralizado de excepciones y errores HTTP
│       ├── models/
│       │   ├── Match.js           # Esquema de partidos, goles y eventos
│       │   ├── Player.js          # Esquema de jugadores
│       │   └── Team.js            # Esquema de equipos
│       └── routes/
│           ├── matchRoutes.js
│           ├── playerRoutes.js
│           ├── statsRoutes.js
│           └── teamRoutes.js
│
└── torneo-barrio-frontend/        # Interfaz de Usuario (Vue 3 + Vite)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tsconfig.json              # Configuración limpia de compilador para tooling
    └── src/
        ├── App.vue
        ├── main.js                # Montaje de Vue, Pinia y Vue Router
        ├── router/
        │   └── index.js           # Definición de rutas y vistas SPA
        ├── services/
        │   └── api.js             # Instancia Axios con interceptores de error
        ├── stores/                # Manejadores de estado Pinia
        │   ├── tournament.js      # Store global principal
        │   ├── teams.js           # Store modular de equipos
        │   ├── players.js         # Store modular de jugadores
        │   └── stats.js           # Store modular de estadísticas y posiciones
        └── views/                 # Vistas de la aplicación
            ├── DashboardView.vue   # Panel central con resumen general
            ├── TeamsView.vue       # Listado y creación de equipos
            ├── TeamDetailView.vue  # Perfil y plantilla del equipo
            ├── PlayersView.vue     # Catálogo de jugadores
            ├── MatchesView.vue     # Fixture por jornadas y filtros
            ├── MatchDetailView.vue # Marcador y acta de partido en vivo
            ├── StandingsView.vue   # Tabla de posiciones
            ├── ScorersView.vue     # Tabla de goleadores
            ├── AssistsView.vue     # Tabla de asistencias
            └── GoalkeepersView.vue # Valla menos vencida
```

---

## 📋 Requisitos Previos

- **Node.js**: Versión 18.x o superior instalada.
- **npm**: Versión 9.x o superior.
- **Acceso a Internet**: Para conectar con el clúster de **MongoDB Atlas**.

---

## ⚙️ Configuración e Instalación

### 1. Backend (`torneo-barrio-backend`)

1. Navega a la carpeta del backend:
   ```bash
   cd torneo-barrio-backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea o verifica el archivo `.env`:
   ```env
   PORT=5001
   MONGO_URI=mongodb+srv://torneoUser:juank123456@cluster1.p7qdqgc.mongodb.net/?appName=Cluster1
   CORS_ORIGIN=http://localhost:5173,http://localhost:4173
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   # o bien: npm start
   ```

   El servidor quedará disponible en: `http://localhost:5001`.

---

### 2. Frontend (`torneo-barrio-frontend`)

1. Abre una nueva terminal y navega a la carpeta del frontend:
   ```bash
   cd torneo-barrio-frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. (Opcional) Si requieres cambiar la URL del backend, crea un archivo `.env`:
   ```env
   VITE_API_URL=http://localhost:5001/api
   ```

4. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```

   La aplicación abrirá localmente en: `http://localhost:5173`.

---

## 📡 Catálogo de la API REST

### Equipos (`/api/teams`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/teams` | Obtener listado de todos los equipos |
| `GET` | `/api/teams/:id` | Obtener detalle de un equipo |
| `GET` | `/api/teams/:id/players` | Obtener todos los jugadores del equipo |
| `POST` | `/api/teams` | Crear un nuevo equipo |
| `PUT` | `/api/teams/:id` | Editar datos de un equipo |
| `DELETE` | `/api/teams/:id` | Eliminar un equipo |

### Jugadores (`/api/players`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/players` | Listar jugadores (soporta paginación: `?page=1&limit=20`) |
| `GET` | `/api/players/:id` | Obtener detalle de un jugador con su equipo |
| `POST` | `/api/players` | Registrar un nuevo jugador |
| `PUT` | `/api/players/:id` | Modificar datos de un jugador |
| `DELETE` | `/api/players/:id` | Eliminar un jugador |

### Partidos (`/api/matches`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/matches` | Listar partidos (filtros: `?matchday=1`, `?status=FINISHED`, `?page=1&limit=10`) |
| `GET` | `/api/matches/:id` | Detalle de un partido con alineaciones y goles |
| `POST` | `/api/matches` | Programar un nuevo partido |
| `PUT` | `/api/matches/:id` | Modificar fecha o equipos del partido |
| `PUT` | `/api/matches/:id/result` | Actualizar marcador, estado y lista de goles |
| `PUT` | `/api/matches/:id/events` | Registrar eventos disciplinarios y asistencias |
| `DELETE` | `/api/matches/:id` | Cancelar/Eliminar un partido |

### Estadísticas y Posiciones (`/api`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/standings` | Tabla de posiciones general calculada en tiempo real |
| `GET` | `/api/stats/top-scorers` | Tabla de goleadores (MongoDB Aggregation Pipeline) |
| `GET` | `/api/stats/top-assists` | Tabla de asistentes (MongoDB Aggregation Pipeline) |
| `GET` | `/api/stats/goalkeepers` | Valla menos vencida |

---

## 📑 Documento de Exposición y Mejoras

Para preparar una presentación formal o sustentación del proyecto, consulta el documento:
👉 **[EXPOSICION_Y_AJUSTES.md](./EXPOSICION_Y_AJUSTES.md)**

Incluye:
- Ficha técnica y propuesta de valor del software.
- Recorrido paso a paso de los flujos de usuario.
- Explicación de las optimizaciones de base de datos implementadas.
- Bitácora completa de los ajustes realizados hoy (MongoDB Atlas, Aggregation Pipelines, paginación, stores modulares).
- Guía para responder preguntas del jurado.

---

## 👥 Autores y Créditos

Proyecto desarrollado y optimizado para la gestión comunitaria del deporte.
- **Frontend & Backend**: Equipo de Desarrollo Torneo de Barrio
- **Arquitectura de Base de Datos**: MongoDB Atlas & Mongoose
