const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');

// Función para obtener partidos (con soporte de filtros y paginación opcional)
const getMatches = async (req, res) => {
    try {
        const filter = {};
        if (req.query.matchday) filter.matchday = Number(req.query.matchday);
        if (req.query.status) {
            filter.status = String(req.query.status).trim().toUpperCase();
        }

        // Paginación opcional: ?page=1&limit=20
        // Si no se envían, retorna todo (comportamiento original)
        const page  = req.query.page  ? Math.max(1, Number(req.query.page))  : null;
        const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;

        const query = Match.find(filter)
            .populate('homeTeam', 'name shortName logoUrl')
            .populate('awayTeam', 'name shortName logoUrl')
            .sort({ matchday: 1, date: 1 });

        if (page && limit) {
            const total = await Match.countDocuments(filter);
            const matches = await query.skip((page - 1) * limit).limit(limit);
            return res.status(200).json({
                data: matches,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            });
        }

        const matches = await query;
        res.status(200).json(matches);

    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los partidos', error: error.message });
    }
};

// Función para obtener el detalle de un partido
const getMatchById = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('homeTeam', 'name shortName logoUrl')
            .populate('awayTeam', 'name shortName logoUrl')
            .populate('goals.player', 'name number')
            .populate('goals.team', 'name shortName')
            .populate('events.player', 'name number')
            .populate('events.team', 'name shortName');

        if (!match) {
            return res.status(404).json({ message: 'Partido no encontrado' });
        }

        res.status(200).json(match);

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

        const invalidTeams = [];
        const [homeMatchdays, awayMatchdays] = await Promise.all([
            getFinishedMatchdaysForTeam(homeExist._id.toString()),
            getFinishedMatchdaysForTeam(awayExist._id.toString()),
        ]);

        if (homeMatchdays.length && numericMatchday <= Math.max(...homeMatchdays)) {
            invalidTeams.push(homeExist.name);
        }
        if (awayMatchdays.length && numericMatchday <= Math.max(...awayMatchdays)) {
            invalidTeams.push(awayExist.name);
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
            .populate('homeTeam', 'name shortName logoUrl')
            .populate('awayTeam', 'name shortName logoUrl');

        res.status(201).json(populatedMatch);

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
            .populate('homeTeam', 'name shortName logoUrl')
            .populate('awayTeam', 'name shortName logoUrl');

        res.status(200).json(updatedMatch);

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

                const playerBelongsToTeam = await Player.exists({
                    _id: goal.player,
                    team: goal.team
                });

                if (!playerBelongsToTeam) {
                    return res.status(400).json({
                        message: `El jugador no pertenece al equipo asignado para el gol`
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

        // populate() sobre el doc ya en memoria — evita segunda consulta a la BD
        await match.populate('homeTeam', 'name shortName logoUrl');
        await match.populate('awayTeam', 'name shortName logoUrl');
        await match.populate('goals.player', 'name number');
        await match.populate('goals.team', 'name shortName');

        res.status(200).json(match);
    } catch (error) {
        res.status(400).json({ message: 'Error al registrar el resultado', error: error.message });
    }
};

// Función para registrar eventos del partido (asistencias y tarjetas)
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
            const playerBelongsToTeam = await Player.exists({ _id: event.player, team: event.team });
            if (!playerBelongsToTeam) {
                return res.status(400).json({
                    message: `El jugador ${event.player} no pertenece al equipo asignado`
                });
            }
        }

        match.events = events;
        await match.save();

        // populate() sobre el doc ya en memoria — evita segunda consulta a la BD
        await match.populate('homeTeam', 'name shortName logoUrl');
        await match.populate('awayTeam', 'name shortName logoUrl');
        await match.populate('goals.player', 'name number');
        await match.populate('goals.team', 'name shortName');
        await match.populate('events.player', 'name number');
        await match.populate('events.team', 'name shortName');

        res.status(200).json(match);
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