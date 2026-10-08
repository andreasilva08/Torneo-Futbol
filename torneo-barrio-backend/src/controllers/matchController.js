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

            for (const goal of goals) {
                if (!validTeamIds.includes(goal.team.toString())) {
                    return res.status(400).json({
                        message: 'Uno de los goles está asignado a un equipo que no juega este partido'
                    });
                }

                // En autogol, el jugador autor pertenece a cualquiera de los dos equipos que juegan el partido
                const isOwnGoal = Boolean(goal.isOwnGoal);
                const playerBelongs = isOwnGoal
                    ? await Player.exists({ _id: goal.player, $or: [{ team: match.homeTeam }, { team: match.awayTeam }] })
                    : await Player.exists({ _id: goal.player, team: goal.team });

                if (!playerBelongs) {
                    return res.status(400).json({
                        message: isOwnGoal
                            ? `El jugador del autogol no pertenece a los equipos participantes`
                            : `El jugador no pertenece al equipo asignado para el gol`
                    });
                }
            }

            if (typeof homeScore === 'number' && typeof awayScore === 'number') {
                const homeGoals = goals.filter((g) => g.team.toString() === match.homeTeam.toString()).length;
                const awayGoals = goals.filter((g) => g.team.toString() === match.awayTeam.toString()).length;
                if (homeGoals !== homeScore || awayGoals !== awayScore) {
                    return res.status(400).json({ message: 'El número de goles no coincide con el marcador ingresado' });
                }
            }

            match.goals = goals;
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

        for (const event of events) {
            if (!validTeamsIds.includes(event.team.toString())) {
                return res.status(400).json({
                    message: 'El evento está asignado a un equipo que no está jugando este partido'
                });
            }

            const isOwnGoalEvent = event.type === 'OWN_GOAL';
            const playerBelongsToTeam = isOwnGoalEvent
                ? await Player.exists({ _id: event.player, $or: [{ team: match.homeTeam }, { team: match.awayTeam }] })
                : await Player.exists({ _id: event.player, team: event.team });

            if (!playerBelongsToTeam) {
                return res.status(400).json({
                    message: `El jugador ${event.player} no pertenece a los equipos del partido`
                });
            }
        }

        match.events = events;
        await match.save();

        await match.populate('homeTeam', TEAM_FIELDS);
        await match.populate('awayTeam', TEAM_FIELDS);
        await match.populate('goals.player', PLAYER_FIELDS);
        await match.populate('goals.team', TEAM_FIELDS);
        await match.populate('events.player', PLAYER_FIELDS);
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