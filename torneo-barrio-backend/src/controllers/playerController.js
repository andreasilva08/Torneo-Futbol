const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');

// Agregación dinámica de incidencias de partidos (goles, asistencias, tarjetas)
const getPlayerStatsFromMatches = async () => {
  try {
    const matches = await Match.find().lean();
    const statsById = new Map();
    const statsByName = new Map();

    const getRecord = (map, key) => {
      if (!key) return null;
      const strKey = String(key).trim().toLowerCase();
      if (!map.has(strKey)) {
        map.set(strKey, { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
      }
      return map.get(strKey);
    };

    for (const match of matches) {
      const goalsList = Array.isArray(match.goals) ? match.goals : (Array.isArray(match.goles) ? match.goles : []);
      for (const g of goalsList) {
        const isAuto = Boolean(g.isOwnGoal || g.isAutogol || g.autogol);
        if (!isAuto) {
          const pId = g.player
            ? (typeof g.player === 'object' ? (g.player._id || g.player.id) : g.player)
            : (g.jugador || g.jugadorId || g.playerId);
          const pName = g.scorer || g.goleador || g.player?.name || g.player?.nombre || '';

          if (pId) {
            const rec = getRecord(statsById, pId.toString());
            if (rec) rec.goals += 1;
          }
          if (pName) {
            const rec = getRecord(statsByName, pName);
            if (rec) rec.goals += 1;
          }
        }

        const aId = g.assistPlayer
          ? (typeof g.assistPlayer === 'object' ? (g.assistPlayer._id || g.assistPlayer.id) : g.assistPlayer)
          : (g.asistidor || g.asistente || g.assistPlayerId);
        const aName = g.assist || g.asistencia || '';
        if (aId) {
          const rec = getRecord(statsById, aId.toString());
          if (rec) rec.assists += 1;
        }
        if (aName) {
          const rec = getRecord(statsByName, aName);
          if (rec) rec.assists += 1;
        }
      }

      const eventsList = Array.isArray(match.events) ? match.events : (Array.isArray(match.incidencias) ? match.incidencias : []);
      for (const e of eventsList) {
        const pId = e.player
          ? (typeof e.player === 'object' ? (e.player._id || e.player.id) : e.player)
          : (e.jugador || e.jugadorId || e.playerId);
        const pName = e.playerName || e.nombre || e.scorer || '';
        const normType = String(e.type || e.tipo || '').toUpperCase();

        const targets = [];
        if (pId) {
          const r = getRecord(statsById, pId.toString());
          if (r) targets.push(r);
        }
        if (pName) {
          const r = getRecord(statsByName, pName);
          if (r) targets.push(r);
        }

        for (const rec of targets) {
          if (normType === 'YELLOW_CARD' || normType.includes('AMARILLA')) {
            rec.yellowCards += 1;
          } else if (normType === 'RED_CARD' || normType.includes('ROJA')) {
            rec.redCards += 1;
          } else if (normType === 'ASSIST' || normType.includes('ASIST')) {
            rec.assists += 1;
          } else if (normType === 'GOAL' || normType === 'GOL') {
            rec.goals += 1;
          }
        }
      }
    }

    return { statsById, statsByName };
  } catch (err) {
    console.error('Error calculando estadísticas dinámicas de partidos:', err);
    return { statsById: new Map(), statsByName: new Map() };
  }
};

// Función auxiliar para normalizar y estructurar la salida de un jugador
// Garantiza compatibilidad absoluta con datos nativos de MongoDB Atlas (nombre, dorsal, posicion, equipo, condicion)
const formatPlayer = (doc, statsAgg = null) => {
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

  // Estadísticas dinámicas acumuladas de partidos + manuales
  const pId = (p._id || p.id || '').toString();
  const pName = String(p.nombre || p.name || '').trim().toLowerCase();

  const fromId = statsAgg?.statsById?.get(pId) || null;
  const fromName = statsAgg?.statsByName?.get(pName) || null;

  const matchGoals = Math.max(fromId?.goals || 0, fromName?.goals || 0);
  const matchAssists = Math.max(fromId?.assists || 0, fromName?.assists || 0);
  const matchYellow = Math.max(fromId?.yellowCards || 0, fromName?.yellowCards || 0);
  const matchRed = Math.max(fromId?.redCards || 0, fromName?.redCards || 0);

  const manualGoals = Number(p.goals !== undefined && p.goals !== null ? p.goals : (p.goles !== undefined && p.goles !== null ? p.goles : 0));
  const manualAssists = Number(p.assists !== undefined && p.assists !== null ? p.assists : (p.asistencias !== undefined && p.asistencias !== null ? p.asistencias : 0));
  const manualYellow = Number(p.yellowCards !== undefined && p.yellowCards !== null ? p.yellowCards : (p.tarjetasAmarillas !== undefined && p.tarjetasAmarillas !== null ? p.tarjetasAmarillas : 0));
  const manualRed = Number(p.redCards !== undefined && p.redCards !== null ? p.redCards : (p.tarjetasRojas !== undefined && p.tarjetasRojas !== null ? p.tarjetasRojas : 0));

  const goals = Math.max(manualGoals, matchGoals);
  const assists = Math.max(manualAssists, matchAssists);
  const yellowCards = Math.max(manualYellow, matchYellow);
  const redCards = Math.max(manualRed, matchRed);

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

    const [statsAgg, total, players] = await Promise.all([
      getPlayerStatsFromMatches(),
      page && limit ? Player.countDocuments() : Promise.resolve(0),
      page && limit
        ? Player.find().populate('team', 'name shortName logoUrl').skip((page - 1) * limit).limit(limit)
        : Player.find().populate('team', 'name shortName logoUrl')
    ]);

    if (page && limit) {
      return res.status(200).json({
        data: players.map((p) => formatPlayer(p, statsAgg)),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    res.status(200).json(players.map((p) => formatPlayer(p, statsAgg)));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los jugadores', error: error.message });
  }
};

// @desc    Obtener un jugador por ID
// @route   GET /api/players/:id
const getPlayerById = async (req, res) => {
  try {
    const [player, statsAgg] = await Promise.all([
      Player.findById(req.params.id).populate('team', 'name shortName logoUrl'),
      getPlayerStatsFromMatches()
    ]);

    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado' });
    }

    res.status(200).json(formatPlayer(player, statsAgg));
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
      photo,
      foto_url,
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
      photoUrl: photoUrl || photo || foto_url || '',
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
    const input = req.body && typeof req.body === 'object' ? req.body : {};
    const currentPlayer = await Player.findById(req.params.id);
    if (!currentPlayer) {
      return res.status(404).json({ message: 'Jugador no encontrado para actualizar' });
    }

    const firstField = (...fields) => fields.find((field) => Object.prototype.hasOwnProperty.call(input, field));
    const body = {};

    const nameField = firstField('name', 'nombre');
    if (nameField) {
      body.name = String(input[nameField] ?? '').trim();
      body.nombre = body.name;
    }

    const numberField = firstField('number', 'dorsal');
    if (numberField) {
      const number = Number(input[numberField]);
      if (!Number.isInteger(number) || number < 0 || number > 99) {
        return res.status(400).json({ message: 'El dorsal debe ser un número entero entre 0 y 99' });
      }
      body.number = number;
      body.dorsal = number;
    }

    const positions = ['Portero', 'Defensa', 'Mediocampista', 'Delantero'];
    const positionField = firstField('position', 'posicion');
    if (positionField && String(input[positionField] ?? '').trim()) {
      const requestedPosition = String(input[positionField]).trim();
      const position = positions.find((value) => value.toLowerCase() === requestedPosition.toLowerCase());
      if (!position) return res.status(400).json({ message: 'La posición seleccionada no es válida' });
      body.position = position;
      body.posicion = position;
    }

    const statuses = ['TITULAR', 'SUPLENTE', 'LESIONADO', 'SANCIONADO_ROJA', 'SANCIONADO_AMARILLAS'];
    const statusField = firstField('status', 'condicion');
    if (statusField && String(input[statusField] ?? '').trim()) {
      const requestedStatus = String(input[statusField]).trim().toUpperCase();
      if (!statuses.includes(requestedStatus)) {
        return res.status(400).json({ message: 'La condición seleccionada no es válida' });
      }
      body.status = requestedStatus;
      body.condicion = requestedStatus;
    }

    const teamField = firstField('team', 'teamId');
    let targetTeamId = currentPlayer.team;
    if (teamField) {
      const requestedTeamId = input[teamField];
      if (requestedTeamId === null || requestedTeamId === '') {
        targetTeamId = null;
        body.team = null;
        body.equipo = '';
      } else {
        const teamId = typeof requestedTeamId === 'object'
          ? requestedTeamId._id || requestedTeamId.id
          : requestedTeamId;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'El equipo seleccionado no existe' });
        targetTeamId = team._id;
        body.team = team._id;
        body.equipo = team.name || team.nombre || '';
      }
    }

    const photoField = firstField('photoUrl', 'photo', 'foto_url');
    if (photoField) {
      const photoUrl = String(input[photoField] ?? '').trim();
      if (photoUrl) {
        const isLocalImage = photoUrl.startsWith('/') || photoUrl.startsWith('data:image/');
        let isHttpImage = false;
        try {
          const parsedUrl = new URL(photoUrl);
          isHttpImage = ['http:', 'https:'].includes(parsedUrl.protocol) && Boolean(parsedUrl.hostname);
        } catch {
          isHttpImage = false;
        }
        if (!isLocalImage && !isHttpImage) {
          return res.status(400).json({ message: 'La URL de foto no es válida' });
        }
      }
      body.photoUrl = photoUrl;
    }

    const numericFields = [
      { aliases: ['goals', 'goles'], fields: ['goals', 'goles'] },
      { aliases: ['assists', 'asistencias'], fields: ['assists', 'asistencias'] },
      { aliases: ['yellowCards', 'tarjetasAmarillas'], fields: ['yellowCards', 'tarjetasAmarillas'] },
      { aliases: ['redCards', 'tarjetasRojas'], fields: ['redCards', 'tarjetasRojas'] },
    ];
    for (const definition of numericFields) {
      const field = firstField(...definition.aliases);
      if (!field) continue;
      const value = Number(input[field]);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ message: `El valor de ${field} debe ser un número mayor o igual a 0` });
      }
      for (const targetField of definition.fields) body[targetField] = value;
    }

    const finalNumber = body.number ?? currentPlayer.number ?? currentPlayer.dorsal;
    const shouldCheckNumber = Boolean(numberField || teamField);
    if (shouldCheckNumber && targetTeamId && finalNumber !== null && finalNumber !== undefined) {
      const numberExists = await Player.findOne({
        team: targetTeamId,
        number: finalNumber,
        _id: { $ne: req.params.id },
      });
      if (numberExists) {
        return res.status(400).json({ message: 'El dorsal ya pertenece a otro jugador' });
      }
    }

    const updatedPlayer = await Player.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true, context: 'query' },
    ).populate('team', 'name shortName logoUrl');

    res.status(200).json(formatPlayer(updatedPlayer));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El dorsal ya pertenece a otro jugador' });
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