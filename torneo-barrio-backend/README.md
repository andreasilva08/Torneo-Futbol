# Rutas de la API-Equipos
Listar todos los clubes 
GET /api/teams

Consultar un club por su id
Get /api/teams/id:

Crear un equipo 
POST /api/teams

Editar datos de un equipo (Nombre, Siglas, Logo y Estadio)
PUT /api/teams/id:

Eliminar un equipo 
DELETE /api/teams/id:

body
  "team": {
    "_id": "660a1f2e3b4c5d6e7f8a9b0c",
    "name": "Barrio Norte FC",
    "shortName": "BNF",
    "logoUrl": "",
    "stadium": "Cancha El Bosque"
  }

# Rutas de la API-Jugadores
Todos los jugadores de la liga
GET /api/players

Consultar la plantilla de un club 
GET /api/teams/:id/players

Consultar un equipo por su id: 
GET /api/players/:id

Registrar un jugador 
POST /api/players

Editar datos un jugador(Nombre, Numero, Posicion y Foto)
PUT /api/player/id:

Eliminar un jugador 
DELETE /api/players/id:

body{
      "_id": "660f8a9b0c1d2e3f4a5b6c7d",
      "name": "Juan Pérez",
      "number": 10,
      "position": "Delantero",
      "photoUrl": "",
      "createdAt": "2026-10-01T20:30:00.000Z",
      "updatedAt": "2026-10-01T20:30:00.000Z"
    }

# Rutas de la API-Partidos
Obtener partidos, con filtros opcionales: `?matchday=3`, `?status=FINISHED` (o `SCHEDULED` / `IN_PROGRESS`)
GET /api/matches 

Obtener un partido por su ID, con goles y jugadores detallados
GET /api/matches/:id 

Programar un partido nuevo
POST /api/matches 

Editar datos generales del partido (Jornada, fecha y equipos)
PUT /api/matches/:id 

Eliminar un partido
DELETE `/api/matches/:id` 

Actualizar marcador, estado y lista de goles (panel de admin)
PUT `/api/matches/:id/result` 

body{
    "homeScore": 1,
    "awayScore": 2,
    "status": "FINISHED",
    "goals": [
        {
            "player": "65c3d8c5a04d286d8867a9f0",
            "team": "65c3d8c5a04d286d8867a9f1",
            "minute": 45
        },
        {
            "player": "65c3d8c5a04d286d8867a9f2",
            "team": "65c3d8c5a04d286d8867a9f3",
            "minute": 78
        }
    ]
}