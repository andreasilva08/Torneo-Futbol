const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');

// Normalizador de partidos para garantizar que los equipos siempre tengan name y shortName
const formatMatch = (matchDoc) => {
    if (!matchDoc) return null;
    const m = typeof matchDoc.toObject === 'function' ? matchDoc.toObject() : matchDoc;

    const normalizeTeamRef = (teamRef) => {
        if (!teamRef) return { name: 'Equipo', shortName: 'EQU', logoUrl: '/images/default-team.svg' };
        if (typeof teamRef !== 'object') return teamRef;
        const name = teamRef.name || teamRef.nombre || 'Equipo';
        const shortName = teamRef.shortName || teamRef.siglas || name.slice(0, 3).toUpperCase();
        const logoUrl = teamRef.logoUrl || teamRef.escudo_url || '/images/default-team.svg';
        return {
            ...teamRef,
            name,
            nombre: name,
            shortName,
            siglas: shortName,
            logoUrl,
            escudo_url: logoUrl,
        };
    };

    return {
        ...m,
        homeTeam: normalizeTeamRef(m.homeTeam),
        awayTeam: normalizeTeamRef(m.awayTeam),
    };
};

const TEAM_FIELDS = 'name nombre shortName siglas logoUrl escudo_url stadium cancha';
const PLAYER_FIELDS = 'name nombre number dorsal photoUrl';

// Función para obtener partidos (con soporte de filtros y paginación opcional)
const getMatches = async (req, res) => {
    try {
        const filter = {};
        if (req.query.matchday) filter.matchday = Number(req.query.matchday);
        if (req.query.status) {
            filter.status = String(req.query.status).trim().toUpperCase();
        }

        const page  = req.query.page  ? Math.max(1, Number(req.query.page))  : null;
        const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;

        const query = Match.find(filter)
            .populate('homeTeam', TEAM_FIELDS)
            .populate('awayTeam', TEAM_FIELDS)
            .populate('goals.player', PLAYER_FIELDS)
            .populate('goals.team', TEAM_FIELDS)
            .populate('events.player', PLAYER_FIELDS)
            .populate('events.playerIn', PLAYER_FIELDS)
            .populate('events.playerOut', PLAYER_FIELDS)
            .populate('events.team', TEAM_FIELDS)
            .sort({ matchday: 1, date: 1 });

        if (page && limit) {
            const total = await Match.countDocuments(filter);
            const matches = await query.skip((page - 1) * limit).limit(limit);
            return res.status(200).json({
                data: matches.map(formatMatch),
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            });
        }

        const matches = await query;
        res.status(200).json(matches.map(formatMatch));

    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los partidos', error: error.message });
    }
};

// Función para obtener el detalle de un partido
const getMatchById = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('homeTeam', TEAM_FIELDS)
            .populate('awayTeam', TEAM_FIELDS)
            .populate('goals.player', PLAYER_FIELDS)
            .populate('goals.team', TEAM_FIELDS)
            .populate('events.player', PLAYER_FIELDS)
            .populate('events.playerIn', PLAYER_FIELDS)
            .populate('events.playerOut', PLAYER_FIELDS)
            .populate('events.team', TEAM_FIELDS);

        if (!match) {
            return res.status(404).json({ message: 'Partido no encontrado' });
        }

        res.status(200).json(formatMatch(match));

    } catch (error) {
        res.status(400).json({ message: 'ID del partido inválido', error: error.message });
    }
};

const getFinishedMatchdaysForTeam = async (teamId) => {
    const finishedMatches = await Match.find({
        status: 'FINISHED',
        $or: [{ homeTeam: teamId }, { awayTeam: teamId }],
    }).select('matchday').lean();

    return finishedMatches
        .map((match) => Number(match.matchday))
        .filter((value) => Number.isFinite(value) && value > 0);
};

// Función para programar un partido
const createMatch = async (req, res) => {
    try {
        const { matchday, date, homeTeam, awayTeam } = req.body;
        const numericMatchday = Number(matchday);

        if (homeTeam === awayTeam) {
            return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo' });
        }

        if (!numericMatchday || numericMatchday < 1) {
            return res.status(400).json({ message: 'La jornada debe ser un número mayor o igual a 1' });
        }

        const [homeExist, awayExist] = await Promise.all([
            Team.findById(homeTeam),
            Team.findById(awayTeam),
        ]);
        if (!homeExist || !awayExist) {
            return res.status(404).json({ message: 'Uno de los equipos seleccionados no existe' });
        }

        const homeName = homeExist.name || homeExist.nombre || 'Equipo local';
        const awayName = awayExist.name || awayExist.nombre || 'Equipo visitante';

        const invalidTeams = [];
        const [homeMatchdays, awayMatchdays] = await Promise.all([
            getFinishedMatchdaysForTeam(homeExist._id.toString()),
            getFinishedMatchdaysForTeam(awayExist._id.toString()),
        ]);

        if (homeMatchdays.length && numericMatchday <= Math.max(...homeMatchdays)) {
            invalidTeams.push(homeName);
        }
        if (awayMatchdays.length && numericMatchday <= Math.max(...awayMatchdays)) {
            invalidTeams.push(awayName);
        }

        if (invalidTeams.length) {
            const messages = invalidTeams.map((teamName) => `el equipo ${teamName} ya disputó la Jornada ${numericMatchday}`).join(' y ');
            return res.status(400).json({
                message: `No se puede registrar este partido porque ${messages}.`
            });
        }

        const newMatch = new Match({
            matchday: numericMatchday,
            date: date ? new Date(date) : new Date(),
            homeTeam,
            awayTeam,
        });

        const savedMatch = await newMatch.save();

        const populatedMatch = await Match.findById(savedMatch._id)
            .populate('homeTeam', TEAM_FIELDS)
            .populate('awayTeam', TEAM_FIELDS);

        res.status(201).json(formatMatch(populatedMatch));

    } catch (error) {
        res.status(400).json({ message: 'Error al programar el partido', error: error.message });
    }
};

// Función para actualizar datos generales de un partido
const updateMatch = async (req, res) => {
    try {
        const { matchday, date, homeTeam, awayTeam } = req.body;
        const updateData = {};

        if (matchday !== undefined) {
            const numericMatchday = Number(matchday);
            if (!numericMatchday || numericMatchday < 1) {
                return res.status(400).json({ message: 'La jornada debe ser un número mayor o igual a 1' });
            }
            updateData.matchday = numericMatchday;
        }

        if (date !== undefined) updateData.date = new Date(date);
        if (homeTeam !== undefined) updateData.homeTeam = homeTeam;
        if (awayTeam !== undefined) updateData.awayTeam = awayTeam;

        const currentMatch = await Match.findById(req.params.id);
        if (!currentMatch) {
            return res.status(404).json({ message: 'Partido no encontrado' });
        }

        const finalHome = homeTeam || currentMatch.homeTeam.toString();
        const finalAway = awayTeam || currentMatch.awayTeam.toString();

        if (finalHome === finalAway) {
            return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo' });
        }

        const updatedMatch = await Match.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('homeTeam', TEAM_FIELDS)
            .populate('awayTeam', TEAM_FIELDS);

        res.status(200).json(formatMatch(updatedMatch));

    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar el partido', error: error.message });
    }
};

// Función para eliminar un partido
const deleteMatch = async (req, res) => {
    try {
        const deletedMatch = await Match.findByIdAndDelete(req.params.id);

        if (!deletedMatch) {
            return res.status(404).json({ message: 'Partido no encontrado' });
        }

        res.status(200).json({ message: 'Partido eliminado correctamente', id: req.params.id });

    } catch (error) {
        res.status(400).json({ message: 'Error al eliminar el partido', error: error.message });
    }
};

// Función para actualizar resultado y goles
const updateMatchResult = async (req, res) => {
    try {
        const { homeScore, awayScore, status, goals } = req.body;

        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ message: 'Partido no encontrado' });
        }

        if (goals && Array.isArray(goals)) {
            const validTeamIds = [match.homeTeam.toString(), match.awayTeam.toString()];
            const [homeTeamDoc, awayTeamDoc] = await Promise.all([
                Team.findById(match.homeTeam),
                Team.findById(match.awayTeam),
            ]);

            const homeTeamNames = [homeTeamDoc?.name, homeTeamDoc?.nombre].filter(Boolean).map(n => n.trim().toLowerCase());
            const awayTeamNames = [awayTeamDoc?.name, awayTeamDoc?.nombre].filter(Boolean).map(n => n.trim().toLowerCase());

            const sanitizedGoals = [];

            for (const goal of goals) {
                const goalTeamId = goal.team ? goal.team.toString() : '';
                if (!validTeamIds.includes(goalTeamId)) {
                    return res.status(400).json({
                        message: 'Uno de los goles está asignado a un equipo que no juega este partido'
                    });
                }

                // En caso de que se pase ID de jugador, validar y sincronizar equipo si estaba vacío
                if (goal.player) {
                    const playerDoc = await Player.findById(goal.player);
                    if (playerDoc) {
                        const targetTeamDoc = goalTeamId === match.homeTeam.toString() ? homeTeamDoc : awayTeamDoc;
                        const otherTeamDoc = goalTeamId === match.homeTeam.toString() ? awayTeamDoc : homeTeamDoc;
                        const isOwnGoal = Boolean(goal.isOwnGoal || goal.isAutogol);

                        // Si el jugador no tenía equipo vinculado o tenía solo string, asociar su ID
                        if (!playerDoc.team) {
                            const assignTeam = isOwnGoal && otherTeamDoc ? otherTeamDoc : targetTeamDoc;
                            if (assignTeam) {
                                playerDoc.team = assignTeam._id;
                                playerDoc.equipo = assignTeam.name || assignTeam.nombre || playerDoc.equipo;
                                await playerDoc.save();
                            }
                        }
                    }
                }

                // Limpiar assistPlayer para no causar CastError si llega vacío o 'null'
                const assistPlayerId = (goal.assistPlayer && String(goal.assistPlayer).trim() !== '' && String(goal.assistPlayer) !== 'null')
                    ? goal.assistPlayer
                    : null;

                sanitizedGoals.push({
                    player: goal.player || null,
                    scorer: goal.scorer || '',
                    team: goal.team,
                    minute: Number(goal.minute) || 1,
                    assistPlayer: assistPlayerId,
                    assist: goal.assist || '',
                    isOwnGoal: Boolean(goal.isOwnGoal || goal.isAutogol),
                    isAutogol: Boolean(goal.isOwnGoal || goal.isAutogol),
                });
            }

            if (typeof homeScore === 'number' && typeof awayScore === 'number') {
                const homeGoals = sanitizedGoals.filter((g) => g.team.toString() === match.homeTeam.toString()).length;
                const awayGoals = sanitizedGoals.filter((g) => g.team.toString() === match.awayTeam.toString()).length;
                if (homeGoals !== homeScore || awayGoals !== awayScore) {
                    return res.status(400).json({ message: 'El número de goles no coincide con el marcador ingresado' });
                }
            }

            match.goals = sanitizedGoals;
        }

        if (typeof homeScore === 'number') match.homeScore = homeScore;
        if (typeof awayScore === 'number') match.awayScore = awayScore;
        if (status) match.status = status;

        await match.save();

        await match.populate('homeTeam', TEAM_FIELDS);
        await match.populate('awayTeam', TEAM_FIELDS);
        await match.populate('goals.player', PLAYER_FIELDS);
        await match.populate('goals.team', TEAM_FIELDS);

        res.status(200).json(formatMatch(match));
    } catch (error) {
        res.status(400).json({ message: 'Error al registrar el resultado', error: error.message });
    }
};

// Función para registrar eventos del partido (asistencias, tarjetas y autogol)
const updateMatchEvents = async (req, res) => {
    try {
        const { events } = req.body;

        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ message: 'Partido no encontrado para registrar eventos' });
        }

        const validTeamsIds = [match.homeTeam.toString(), match.awayTeam.toString()];
        const [homeTeamDoc, awayTeamDoc] = await Promise.all([
            Team.findById(match.homeTeam),
            Team.findById(match.awayTeam),
        ]);

        const sanitizedEvents = [];

        // Rastrear tarjetas amarillas y eventos por jugador en este partido
        const yellowCounts = new Map();

        for (const event of events) {
            const eventTeamId = event.team ? event.team.toString() : '';
            if (eventTeamId && !validTeamsIds.includes(eventTeamId)) {
                return res.status(400).json({
                    message: 'El evento está asignado a un equipo que no está jugando este partido'
                });
            }

            const evType = String(event.type || '').toUpperCase();

            // Vincular y actualizar condición del jugador principal
            if (event.player) {
                const playerDoc = await Player.findById(event.player);
                if (playerDoc) {
                    const targetTeam = eventTeamId === match.homeTeam.toString() ? homeTeamDoc : awayTeamDoc;
                    if (!playerDoc.team && targetTeam) {
                        playerDoc.team = targetTeam._id;
                        playerDoc.equipo = targetTeam.name || targetTeam.nombre || playerDoc.equipo;
                    }

                    if (evType === 'RED_CARD' || evType.includes('ROJA')) {
                        playerDoc.status = 'SANCIONADO_ROJA';
                        playerDoc.condicion = 'SANCIONADO_ROJA';
                    } else if (evType === 'YELLOW_CARD' || evType.includes('AMARILLA')) {
                        const currentCount = (yellowCounts.get(playerDoc._id.toString()) || 0) + 1;
                        yellowCounts.set(playerDoc._id.toString(), currentCount);
                        if (currentCount >= 2) {
                            playerDoc.status = 'SANCIONADO_AMARILLAS';
                            playerDoc.condicion = 'SANCIONADO_AMARILLAS';
                        }
                    } else if (evType === 'INJURY' || evType.includes('LESION')) {
                        playerDoc.status = 'LESIONADO';
                        playerDoc.condicion = 'LESIONADO';
                    }

                    await playerDoc.save();
                }
            }

            // Si es sustitución por lesión y viene el jugador que sale (lesionado)
            if (event.playerOut && (evType === 'INJURY' || evType.includes('LESION'))) {
                const outDoc = await Player.findById(event.playerOut);
                if (outDoc) {
                    outDoc.status = 'LESIONADO';
                    outDoc.condicion = 'LESIONADO';
                    await outDoc.save();
                }
            }

            sanitizedEvents.push({
                type: event.type,
                player: event.player || null,
                team: event.team || null,
                minute: Number(event.minute) || 1,
                playerIn: event.playerIn || null,
                playerOut: event.playerOut || null,
                injuryTime: event.injuryTime || '',
                description: event.description || '',
            });
        }

        match.events = sanitizedEvents;
        await match.save();

        await match.populate('homeTeam', TEAM_FIELDS);
        await match.populate('awayTeam', TEAM_FIELDS);
        await match.populate('goals.player', PLAYER_FIELDS);
        await match.populate('goals.team', TEAM_FIELDS);
        await match.populate('events.player', PLAYER_FIELDS);
        await match.populate('events.playerIn', PLAYER_FIELDS);
        await match.populate('events.playerOut', PLAYER_FIELDS);
        await match.populate('events.team', TEAM_FIELDS);

        res.status(200).json(formatMatch(match));
    } catch (error) {
        res.status(400).json({ message: 'Error al registrar los eventos', error: error.message });
    }
};

module.exports = {
    getMatches,
    getMatchById,
    createMatch,
    updateMatch,
    deleteMatch,
    updateMatchResult,
    updateMatchEvents
};