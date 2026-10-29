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

// Validar si la temporada ha finalizado reglamentariamente (38 jornadas completas) o si los fichajes están habilitados
const isSeasonCompletedOrTransfersAllowed = async () => {
  if (process.env.ALLOW_PLAYER_TRANSFERS === 'true' || process.env.SEASON_STATUS === 'CLOSED') {
    return true;
  }
  const finishedMatchdays = await Match.distinct('matchday', { status: 'FINISHED' });
  const pendingMatches = await Match.countDocuments({ status: { $ne: 'FINISHED' } });

  // 38 jornadas finalizadas y sin ningún partido pendiente de jugar
  if (finishedMatchdays.length >= 38 && pendingMatches === 0) {
    return true;
  }
  return false;
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

  // ── Helper: convierte una cadena a Title Case (primera letra en mayúscula, resto en minúscula) ──
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  let firstName = p.firstName || p.primerNombre || '';
  let middleName = p.middleName || p.segundoNombre || '';
  let lastName = p.lastName || p.primerApellido || '';
  let secondLastName = p.secondLastName || p.segundoApellido || '';
  let jerseyName = p.jerseyName || p.nombreCamiseta || '';

  // ── Fallback para jugadores legacy: el formato original era 'APELLIDO Nombre' ──
  // Primera palabra = Apellido (lastName), segunda palabra = Nombre (firstName)
  if (!firstName && !lastName && name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      // Solo una palabra — asumimos que es el apellido
      lastName = toTitleCase(parts[0]);
    } else if (parts.length === 2) {
      // 'APELLIDO Nombre'
      lastName = toTitleCase(parts[0]);
      firstName = toTitleCase(parts[1]);
    } else if (parts.length === 3) {
      // 'APELLIDO Nombre SegundoApellido' o similar
      lastName = toTitleCase(parts[0]);
      firstName = toTitleCase(parts[1]);
      secondLastName = toTitleCase(parts[2]);
    } else if (parts.length >= 4) {
      // 'APELLIDO1 APELLIDO2 Nombre SegundoNombre'
      lastName = toTitleCase(parts[0]);
      secondLastName = toTitleCase(parts[1]);
      firstName = toTitleCase(parts[2]);
      middleName = toTitleCase(parts.slice(3).join(' '));
    }
  } else {
    // Normalizar Title Case en los campos estructurados si ya existen
    firstName = toTitleCase(firstName);
    lastName = toTitleCase(lastName);
    if (middleName) middleName = toTitleCase(middleName);
    if (secondLastName) secondLastName = toTitleCase(secondLastName);
  }

  if (!jerseyName) {
    jerseyName = (lastName || firstName || name).toUpperCase();
  }

  return {
    ...p,
    name,
    nombre: name,
    firstName,
    primerNombre: firstName,
    middleName,
    segundoNombre: middleName,
    lastName,
    primerApellido: lastName,
    secondLastName,
    segundoApellido: secondLastName,
    jerseyName,
    nombreCamiseta: jerseyName,
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
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : null;
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
      firstName,
      primerNombre,
      middleName,
      segundoNombre,
      lastName,
      primerApellido,
      secondLastName,
      segundoApellido,
      jerseyName,
      nombreCamiseta,
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

    const fName = String(firstName || primerNombre || '').trim();
    const mName = String(middleName || segundoNombre || '').trim();
    const lName = String(lastName || primerApellido || '').trim();
    const slName = String(secondLastName || segundoApellido || '').trim();
    let jName = String(jerseyName || nombreCamiseta || '').trim().toUpperCase();

    let playerName = '';
    if (fName || lName) {
      if (!fName) {
        return res.status(400).json({ message: 'El primer nombre del jugador es obligatorio' });
      }
      if (!lName) {
        return res.status(400).json({ message: 'El primer apellido del jugador es obligatorio' });
      }
      playerName = [fName, mName, lName, slName].filter(Boolean).join(' ');
      if (!jName) {
        jName = (lName || fName).toUpperCase();
      }
    } else {
      playerName = String(name || nombre || '').trim();
      if (!playerName) {
        return res.status(400).json({ message: 'El primer nombre y primer apellido del jugador son obligatorios' });
      }
      if (!jName) {
        jName = playerName.toUpperCase();
      }
    }

    const playerNumber = Number(number !== undefined ? number : (dorsal !== undefined ? dorsal : 0));
    const playerPosition = position || posicion || 'Delantero';
    // Estado inicial automático en 'TITULAR'
    const playerStatus = 'TITULAR';

    let teamId = team;
    let equipoName = equipo;

    if (team) {
      const teamExists = await Team.findById(team);
      if (teamExists) {
        equipoName = teamExists.name || teamExists.nombre;
      }
    }

    // Goles, asistencias y tarjetas se inicializan automáticamente en 0 en la base de datos
    const playerGoals = 0;
    const playerAssists = 0;
    const playerYellow = 0;
    const playerRed = 0;

    const newPlayer = await Player.create({
      name: playerName,
      nombre: playerName,
      firstName: fName,
      primerNombre: fName,
      middleName: mName,
      segundoNombre: mName,
      lastName: lName,
      primerApellido: lName,
      secondLastName: slName,
      segundoApellido: slName,
      jerseyName: jName,
      nombreCamiseta: jName,
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

    const fNameField = firstField('firstName', 'primerNombre');
    const mNameField = firstField('middleName', 'segundoNombre');
    const lNameField = firstField('lastName', 'primerApellido');
    const slNameField = firstField('secondLastName', 'segundoApellido');
    const jNameField = firstField('jerseyName', 'nombreCamiseta');

    if (fNameField) {
      body.firstName = String(input[fNameField] ?? '').trim();
      body.primerNombre = body.firstName;
    }
    if (mNameField) {
      body.middleName = String(input[mNameField] ?? '').trim();
      body.segundoNombre = body.middleName;
    }
    if (lNameField) {
      body.lastName = String(input[lNameField] ?? '').trim();
      body.primerApellido = body.lastName;
    }
    if (slNameField) {
      body.secondLastName = String(input[slNameField] ?? '').trim();
      body.segundoApellido = body.secondLastName;
    }
    if (jNameField) {
      body.jerseyName = String(input[jNameField] ?? '').trim().toUpperCase();
      body.nombreCamiseta = body.jerseyName;
    }

    if (fNameField || lNameField || mNameField || slNameField) {
      const finalFName = body.firstName !== undefined ? body.firstName : (currentPlayer.firstName || currentPlayer.primerNombre || '');
      const finalMName = body.middleName !== undefined ? body.middleName : (currentPlayer.middleName || currentPlayer.segundoNombre || '');
      const finalLName = body.lastName !== undefined ? body.lastName : (currentPlayer.lastName || currentPlayer.primerApellido || '');
      const finalSLName = body.secondLastName !== undefined ? body.secondLastName : (currentPlayer.secondLastName || currentPlayer.segundoApellido || '');
      
      const fullFromParts = [finalFName, finalMName, finalLName, finalSLName].filter(Boolean).join(' ');
      if (fullFromParts) {
        body.name = fullFromParts;
        body.nombre = fullFromParts;
      }
    } else {
      const nameField = firstField('name', 'nombre');
      if (nameField) {
        body.name = String(input[nameField] ?? '').trim();
        body.nombre = body.name;
      }
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

      // Validación estricta: Si el jugador se encuentra actualmente en LESIONADO, SANCIONADO_ROJA o SANCIONADO_AMARILLAS,
      // no se puede cambiar a TITULAR o SUPLENTE mientras esté inhabilitado.
      const currentStatus = String(currentPlayer.status || currentPlayer.condicion || '').toUpperCase();
      const isInhabilitated = currentStatus === 'LESIONADO' || currentStatus.startsWith('SANCIONADO');
      if (isInhabilitated && (requestedStatus === 'TITULAR' || requestedStatus === 'SUPLENTE')) {
        let motivo = 'sanción o baja médica';
        if (currentStatus === 'LESIONADO') motivo = 'lesión médica';
        else if (currentStatus === 'SANCIONADO_ROJA') motivo = 'sanción por tarjeta roja directa';
        else if (currentStatus === 'SANCIONADO_AMARILLAS') motivo = 'sanción por acumulación de tarjetas amarillas';
        
        return res.status(400).json({
          message: `El jugador se encuentra inhabilitado por ${motivo}. No puede ser asignado como Titular o Suplente hasta que finalice su período de inhabilitación.`
        });
      }

      body.status = requestedStatus;
      body.condicion = requestedStatus;
    }

    // Actualización de datos de lesión médica (fuera o dentro de partidos)
    if (Object.prototype.hasOwnProperty.call(input, 'injuryReason')) {
      body.injuryReason = String(input.injuryReason ?? '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(input, 'injuryDuration')) {
      body.injuryDuration = String(input.injuryDuration ?? '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(input, 'recoveryDate')) {
      body.recoveryDate = input.recoveryDate ? new Date(input.recoveryDate) : null;
    }

    const teamField = firstField('team', 'teamId');
    let targetTeamId = currentPlayer.team;
    if (teamField) {
      const requestedTeamId = input[teamField];
      const currentTeamIdStr = currentPlayer.team
        ? String(currentPlayer.team._id || currentPlayer.team).trim()
        : null;
      const requestedTeamIdStr = requestedTeamId
        ? (typeof requestedTeamId === 'object' ? String(requestedTeamId._id || requestedTeamId.id || '') : String(requestedTeamId)).trim()
        : null;

      // Validar si se está alterando el equipo del jugador
      const isTeamAltered = currentTeamIdStr !== null
        ? (requestedTeamIdStr !== currentTeamIdStr)
        : Boolean(requestedTeamIdStr);

      if (isTeamAltered) {
        const canTransfer = await isSeasonCompletedOrTransfersAllowed();
        if (!canTransfer) {
          return res.status(400).json({
            message: 'El jugador pertenece a este equipo. Para realizar transferencias o cambios de equipo, se debe finalizar la temporada actual (completar los 38 partidos reglamentarios).'
          });
        }
      }

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

    // Nota: Las estadísticas (goles, asistencias, tarjetas) son acumulativas y dependen
    // exclusivamente de los eventos de partidos (matchEvents). No son editables de forma manual.

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