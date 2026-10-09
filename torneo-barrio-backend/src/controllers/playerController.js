const Player = require('../models/Player');
const Team = require('../models/Team');

// Función auxiliar para normalizar y estructurar la salida de un jugador
// Garantiza compatibilidad absoluta con datos nativos de MongoDB Atlas (nombre, dorsal, posicion, equipo, condicion)
const formatPlayer = (doc) => {
  if (!doc) return null;
  const p = typeof doc.toObject === 'function' ? doc.toObject() : doc;

  const name = p.nombre || p.name || 'Sin nombre';
  const number = Number(
    p.dorsal !== undefined && p.dorsal !== null
      ? p.dorsal
      : p.number !== undefined && p.number !== null
      ? p.number
      : 0
  );
  const position = p.posicion || p.position || 'Delantero';

  // Normalizar condición / status
  let statusRaw = String(p.condicion || p.status || 'TITULAR').toUpperCase();
  let status = 'TITULAR';
  if (statusRaw.includes('ROJA') || statusRaw === 'EXPULSADO') {
    status = 'SANCIONADO_ROJA';
  } else if (statusRaw.includes('AMARILLA') || statusRaw.includes('AMARILLAS')) {
    status = 'SANCIONADO_AMARILLAS';
  } else if (statusRaw.includes('LESION') || statusRaw.includes('LESIONADO')) {
    status = 'LESIONADO';
  } else if (statusRaw.includes('SUPLENTE') || statusRaw === 'BANCA') {
    status = 'SUPLENTE';
  } else {
    status = 'TITULAR';
  }

  // Normalizar equipo
  let teamObj = p.team;
  if (!teamObj || typeof teamObj !== 'object') {
    const teamNameStr = p.equipo || (typeof p.team === 'string' ? p.team : 'Sin equipo');
    teamObj = {
      _id: p.team || null,
      name: teamNameStr,
      shortName: teamNameStr.slice(0, 3).toUpperCase(),
      logoUrl: '',
    };
  }

  // Normalizar estadísticas individuales
  const goals = Number(p.goals !== undefined && p.goals !== null ? p.goals : (p.goles !== undefined && p.goles !== null ? p.goles : 0));
  const assists = Number(p.assists !== undefined && p.assists !== null ? p.assists : (p.asistencias !== undefined && p.asistencias !== null ? p.asistencias : 0));
  const yellowCards = Number(p.yellowCards !== undefined && p.yellowCards !== null ? p.yellowCards : (p.tarjetasAmarillas !== undefined && p.tarjetasAmarillas !== null ? p.tarjetasAmarillas : 0));
  const redCards = Number(p.redCards !== undefined && p.redCards !== null ? p.redCards : (p.tarjetasRojas !== undefined && p.tarjetasRojas !== null ? p.tarjetasRojas : 0));

  return {
    ...p,
    name,
    nombre: name,
    number,
    dorsal: number,
    position,
    posicion: position,
    team: teamObj,
    equipo: typeof p.equipo === 'string' ? p.equipo : (teamObj?.name || ''),
    status,
    condicion: status,
    photoUrl: p.photoUrl || '',
    goals,
    goles: goals,
    assists,
    asistencias: assists,
    yellowCards,
    tarjetasAmarillas: yellowCards,
    redCards,
    tarjetasRojas: redCards,
  };
};

// @desc    Obtener todos los jugadores
// @route   GET /api/players  (opcional: ?page=1&limit=20)
const getPlayers = async (req, res) => {
  try {
    const page  = req.query.page  ? Math.max(1, Number(req.query.page))  : null;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;

    const query = Player.find().populate('team', 'name shortName logoUrl');

    if (page && limit) {
      const total = await Player.countDocuments();
      const players = await query.skip((page - 1) * limit).limit(limit);
      return res.status(200).json({
        data: players.map(formatPlayer),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    const players = await query;
    res.status(200).json(players.map(formatPlayer));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los jugadores', error: error.message });
  }
};

// @desc    Obtener un jugador por ID
// @route   GET /api/players/:id
const getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name shortName logoUrl');

    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado' });
    }

    res.status(200).json(formatPlayer(player));
  } catch (error) {
    res.status(400).json({ message: 'ID de jugador no válido', error: error.message });
  }
};

// @desc    Crear un nuevo jugador
// @route   POST /api/players
const createPlayer = async (req, res) => {
  try {
    const {
      name,
      nombre,
      number,
      dorsal,
      position,
      posicion,
      team,
      equipo,
      status,
      condicion,
      photoUrl,
      goals,
      goles,
      assists,
      asistencias,
      yellowCards,
      tarjetasAmarillas,
      redCards,
      tarjetasRojas,
    } = req.body;

    const playerName = name || nombre;
    if (!playerName) {
      return res.status(400).json({ message: 'El nombre del jugador es obligatorio' });
    }

    const playerNumber = Number(number !== undefined ? number : (dorsal !== undefined ? dorsal : 0));
    const playerPosition = position || posicion || 'Delantero';
    const playerStatus = (status || condicion || 'TITULAR').toUpperCase();

    let teamId = team;
    let equipoName = equipo;

    if (team) {
      const teamExists = await Team.findById(team);
      if (teamExists) {
        equipoName = teamExists.name || teamExists.nombre;
      }
    }

    const playerGoals = Number(goals !== undefined ? goals : (goles !== undefined ? goles : 0));
    const playerAssists = Number(assists !== undefined ? assists : (asistencias !== undefined ? asistencias : 0));
    const playerYellow = Number(yellowCards !== undefined ? yellowCards : (tarjetasAmarillas !== undefined ? tarjetasAmarillas : 0));
    const playerRed = Number(redCards !== undefined ? redCards : (tarjetasRojas !== undefined ? tarjetasRojas : 0));

    const newPlayer = await Player.create({
      name: playerName,
      nombre: playerName,
      number: playerNumber,
      dorsal: playerNumber,
      position: playerPosition,
      posicion: playerPosition,
      team: teamId || null,
      equipo: equipoName || '',
      status: playerStatus,
      condicion: playerStatus,
      photoUrl: photoUrl || '',
      goals: playerGoals,
      goles: playerGoals,
      assists: playerAssists,
      asistencias: playerAssists,
      yellowCards: playerYellow,
      tarjetasAmarillas: playerYellow,
      redCards: playerRed,
      tarjetasRojas: playerRed,
    });

    res.status(201).json(formatPlayer(newPlayer));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El número de camiseta ya está asignado a otro jugador en este equipo',
      });
    }
    res.status(400).json({ message: 'Error al crear el jugador', error: error.message });
  }
};

// @desc    Actualizar un jugador
// @route   PUT /api/players/:id
const updatePlayer = async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.name || body.nombre) {
      body.name = body.name || body.nombre;
      body.nombre = body.name;
    }
    if (body.number !== undefined || body.dorsal !== undefined) {
      body.number = body.number !== undefined ? Number(body.number) : Number(body.dorsal);
      body.dorsal = body.number;
    }
    if (body.position || body.posicion) {
      body.position = body.position || body.posicion;
      body.posicion = body.position;
    }
    if (body.status || body.condicion) {
      body.status = (body.status || body.condicion).toUpperCase();
      body.condicion = body.status;
    }

    if (body.goals !== undefined || body.goles !== undefined) {
      const g = Number(body.goals !== undefined ? body.goals : body.goles);
      body.goals = Math.max(0, g);
      body.goles = body.goals;
    }
    if (body.assists !== undefined || body.asistencias !== undefined) {
      const a = Number(body.assists !== undefined ? body.assists : body.asistencias);
      body.assists = Math.max(0, a);
      body.asistencias = body.assists;
    }
    if (body.yellowCards !== undefined || body.tarjetasAmarillas !== undefined) {
      const y = Number(body.yellowCards !== undefined ? body.yellowCards : body.tarjetasAmarillas);
      body.yellowCards = Math.max(0, y);
      body.tarjetasAmarillas = body.yellowCards;
    }
    if (body.redCards !== undefined || body.tarjetasRojas !== undefined) {
      const r = Number(body.redCards !== undefined ? body.redCards : body.tarjetasRojas);
      body.redCards = Math.max(0, r);
      body.tarjetasRojas = body.redCards;
    }

    if (body.team) {
      const teamExists = await Team.findById(body.team);
      if (teamExists) {
        body.equipo = teamExists.name || teamExists.nombre;
      }
    }

    const updatedPlayer = await Player.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    ).populate('team', 'name shortName logoUrl');

    if (!updatedPlayer) {
      return res.status(404).json({ message: 'Jugador no encontrado para actualizar' });
    }

    res.status(200).json(formatPlayer(updatedPlayer));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El número de camiseta ya está asignado a otro jugador en este equipo',
      });
    }
    res.status(400).json({ message: 'Error al actualizar el jugador', error: error.message });
  }
};

// @desc    Eliminar un jugador
// @route   DELETE /api/players/:id
const deletePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado para eliminar' });
    }

    res.status(200).json({ message: 'Jugador eliminado correctamente', id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: 'Error al eliminar el jugador', error: error.message });
  }
};

module.exports = {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
};