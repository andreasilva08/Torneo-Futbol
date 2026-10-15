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
        stadium: resolveMatchStadium(m.stadium, m.homeTeam),
        homeTeam: normalizeTeamRef(m.homeTeam),
        awayTeam: normalizeTeamRef(m.awayTeam),
    };
};

const TEAM_FIELDS = 'name nombre shortName siglas logoUrl escudo_url stadium cancha estadio';
const PLAYER_FIELDS = 'name nombre number dorsal photoUrl';
const MATCH_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'SUSPENDED', 'POSTPONED'];
const RESCHEDULED_STATUSES = ['SUSPENDED', 'POSTPONED'];
const GENERIC_VENUES = new Set(['cancha local', 'cancha principal']);
const fixtureFormattersByTimeZone = new Map();

const getTeamStadium = (team) => {
    const venues = [team?.cancha, team?.estadio, team?.stadium]
        .map((venue) => String(venue || '').trim())
        .filter((venue) => venue && !GENERIC_VENUES.has(venue.toLowerCase()));
    return venues[0] || 'Cancha Local';
};
const resolveMatchStadium = (requestedVenue, homeTeam) => {
    const venue = String(requestedVenue || '').trim();
    return !venue || GENERIC_VENUES.has(venue.toLowerCase()) ? getTeamStadium(homeTeam) : venue;
};

const parseMatchDate = (date) => {
    if (date === undefined || date === null || date === '') return null;
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('La fecha del partido no es válida');
    }
    return parsedDate;
};

const parseMatchdayDate = (date, fallbackDate) => {
    if (date) {
        const dateString = String(date).trim();
        const parsedDate = new Date(`${dateString}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== dateString) {
            throw new Error('La fecha base de la jornada no es válida');
        }
        return dateString;
    }
    return fallbackDate ? new Date(fallbackDate).toISOString().slice(0, 10) : '';
};

const findMatchdayDateConstraintError = async ({ matchday, matchdayDate, excludeId, allowReschedule = false }) => {
    if (!matchdayDate || allowReschedule) return null;
    const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
    const existing = await Match.find({
        ...exclude,
        matchday: Number(matchday),
        status: { $nin: RESCHEDULED_STATUSES },
    }).select('matchdayDate date').lean();
    const dateConflict = existing.some((match) => {
        const existingDate = match.matchdayDate || (match.date ? new Date(match.date).toISOString().slice(0, 10) : '');
        return existingDate && existingDate !== matchdayDate;
    });
    return dateConflict
        ? 'Todos los partidos de una jornada deben tener la misma fecha base.'
        : null;
};

const findMatchConstraintError = async ({ matchday, homeTeam, awayTeam, date, stadium, excludeId }) => {
    const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
    const homeId = String(homeTeam);
    const awayId = String(awayTeam);

    const duplicatePairing = await Match.exists({
        ...exclude,
        matchday,
        $or: [
            { homeTeam: homeId, awayTeam: awayId },
            { homeTeam: awayId, awayTeam: homeId },
        ],
    });
    if (duplicatePairing) {
        return 'Este cruce ya está registrado en la jornada seleccionada';
    }

    const teamAlreadyScheduled = await Match.exists({
        ...exclude,
        matchday,
        $or: [
            { homeTeam: { $in: [homeId, awayId] } },
            { awayTeam: { $in: [homeId, awayId] } },
        ],
    });
    if (teamAlreadyScheduled) {
        return 'Uno de los equipos ya tiene un partido registrado en esta jornada';
    }

    const venue = String(stadium || '').trim();
    if (date && venue) {
        const escapedVenue = venue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const venueConflict = await Match.exists({
            ...exclude,
            date,
            stadium: { $regex: `^${escapedVenue}$`, $options: 'i' },
        });
        if (venueConflict) {
            return 'Ya hay un partido programado en esa cancha a la misma hora';
        }
    }

    return null;
};

const findMatchdayPrerequisiteError = async (matchday) => {
    const unfinishedPriorMatch = await Match.exists({
        matchday: { $lt: Number(matchday) },
        status: { $ne: 'FINISHED' },
    });
    return unfinishedPriorMatch
        ? 'No se puede iniciar este partido mientras haya encuentros pendientes de jornadas anteriores.'
        : null;
};

const isUnavailablePlayerStatus = (player) => {
    const status = String(player?.status || player?.condicion || '').trim().toUpperCase();
    return status === 'LESIONADO' || status === 'SUSPENDIDO' || status.startsWith('SANCIONADO');
};

const sameId = (first, second) => String(first || '') === String(second || '');

const createDoubleRoundRobinFixtures = (teamIds) => {
    const rotation = [...teamIds];
    if (rotation.length % 2 !== 0) rotation.push(null);

    const oneLegRounds = rotation.length - 1;
    const firstLegMatches = [];

    for (let round = 0; round < oneLegRounds; round += 1) {
        for (let index = 0; index < rotation.length / 2; index += 1) {
            const first = rotation[index];
            const second = rotation[rotation.length - 1 - index];
            if (!first || !second) continue;

            const isFirstTeamHome = (round + index) % 2 === 0;
            firstLegMatches.push({
                matchday: round + 1,
                date: null,
                homeTeam: isFirstTeamHome ? first : second,
                awayTeam: isFirstTeamHome ? second : first,
                status: 'SCHEDULED',
            });
        }

        rotation.splice(1, 0, rotation.pop());
    }

    const returnLegMatches = firstLegMatches.map((match) => ({
        ...match,
        matchday: match.matchday + oneLegRounds,
        homeTeam: match.awayTeam,
        awayTeam: match.homeTeam,
    }));

    return {
        matches: [...firstLegMatches, ...returnLegMatches],
        matchdays: oneLegRounds * 2,
    };
};

const createFixtureDate = ({ startDate, dayOffset, hour, minute = 0, timezoneOffsetMinutes, timeZone }) => {
    const [year, month, day] = startDate.split('-').map(Number);
    const localDateTime = Date.UTC(year, month - 1, day + dayOffset, hour, minute);
    if (timeZone) {
        let formatter = fixtureFormattersByTimeZone.get(timeZone);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat('en-US', {
                timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23',
            });
            fixtureFormattersByTimeZone.set(timeZone, formatter);
        }
        const getOffsetAt = (timestamp) => {
            const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp))
                .filter((part) => part.type !== 'literal')
                .map((part) => [part.type, Number(part.value)]));
            const localDateTimeAsUtc = Date.UTC(
                parts.year,
                parts.month - 1,
                parts.day,
                parts.hour,
                parts.minute,
                parts.second,
            );
            return localDateTimeAsUtc - timestamp;
        };
        let timestamp = localDateTime;
        timestamp = localDateTime - getOffsetAt(timestamp);
        timestamp = localDateTime - getOffsetAt(timestamp);
        return new Date(timestamp);
    }
    return new Date(localDateTime + timezoneOffsetMinutes * 60_000);
};

const scheduleFixtureMatches = ({ matches, teams, startDate, timezoneOffsetMinutes = 0, timeZone }) => {
    const teamsById = new Map(teams.map((team) => [team._id.toString(), team]));
    const matchIndexByMatchday = new Map();
    const matchesPerMatchday = new Map();
    for (const match of matches) {
        const matchday = Number(match.matchday);
        matchesPerMatchday.set(matchday, (matchesPerMatchday.get(matchday) || 0) + 1);
    }

    return matches.map((match) => {
        const matchday = Number(match.matchday);
        const matchIndex = matchIndexByMatchday.get(matchday) || 0;
        matchIndexByMatchday.set(matchday, matchIndex + 1);
        const matchCount = matchesPerMatchday.get(matchday);
        const slotMinutes = matchCount > 1
            ? Math.round((9 * 60 * matchIndex) / (matchCount - 1))
            : 0;

        return {
            ...match,
            matchdayDate: (() => {
                const [year, month, day] = startDate.split('-').map(Number);
                const baseDate = new Date(Date.UTC(year, month - 1, day + (matchday - 1) * 7));
                return baseDate.toISOString().slice(0, 10);
            })(),
            date: createFixtureDate({
                startDate,
                dayOffset: (matchday - 1) * 7,
                hour: 9 + Math.floor(slotMinutes / 60),
                minute: slotMinutes % 60,
                timezoneOffsetMinutes,
                timeZone,
            }),
            stadium: getTeamStadium(teamsById.get(match.homeTeam.toString())),
        };
    });
};

const generateFixture = async (req, res) => {
    try {
        const existingMatches = await Match.exists({});
        if (existingMatches) {
            return res.status(409).json({
                message: 'Ya existen partidos registrados. Elimina o corrige el fixture actual antes de generar uno nuevo.',
            });
        }

        const teams = await Team.find().sort({ _id: 1 }).select('_id stadium cancha estadio');
        if (teams.length < 2) {
            return res.status(400).json({ message: 'Se necesitan al menos dos equipos para generar el fixture.' });
        }

        const requestedStartDate = String(req.body?.startDate || '');
        const startDate = requestedStartDate || (() => {
            const tomorrow = new Date();
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            return tomorrow.toISOString().slice(0, 10);
        })();
        const parsedStartDate = new Date(`${startDate}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
            Number.isNaN(parsedStartDate.getTime()) ||
            parsedStartDate.toISOString().slice(0, 10) !== startDate) {
            return res.status(400).json({ message: 'La fecha de inicio del fixture no es válida.' });
        }

        const timezoneOffsetMinutes = req.body?.timezoneOffsetMinutes === undefined
            ? 0
            : Number(req.body.timezoneOffsetMinutes);
        if (!Number.isInteger(timezoneOffsetMinutes) || Math.abs(timezoneOffsetMinutes) > 14 * 60) {
            return res.status(400).json({ message: 'La zona horaria del fixture no es válida.' });
        }
        const timeZone = String(req.body?.timeZone || '').trim();
        if (timeZone) {
            try {
                new Intl.DateTimeFormat('en-US', { timeZone });
            } catch {
                return res.status(400).json({ message: 'La zona horaria del fixture no es válida.' });
            }
        }

        const fixture = createDoubleRoundRobinFixtures(teams.map((team) => team._id));
        const scheduledMatches = scheduleFixtureMatches({
            matches: fixture.matches,
            teams,
            startDate,
            timezoneOffsetMinutes,
            timeZone,
        });
        const createdMatches = await Match.insertMany(scheduledMatches);

        res.status(201).json({
            message: 'Fixture de ida y vuelta generado y programado correctamente.',
            teams: teams.length,
            matchdays: fixture.matchdays,
            matchesCreated: createdMatches.length,
        });
    } catch (error) {
        res.status(400).json({ message: 'Error al generar el fixture', error: error.message });
    }
};

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

// Función para programar un partido
const createMatch = async (req, res) => {
    try {
        const { matchday, matchdayDate, date, homeTeam, awayTeam, stadium, referee, status } = req.body;
        const numericMatchday = Number(matchday);

        if (!homeTeam || !awayTeam || String(homeTeam) === String(awayTeam)) {
            return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo' });
        }

        if (!Number.isInteger(numericMatchday) || numericMatchday < 1) {
            return res.status(400).json({ message: 'La jornada debe ser un número mayor o igual a 1' });
        }

        const [homeExist, awayExist] = await Promise.all([
            Team.findById(homeTeam),
            Team.findById(awayTeam),
        ]);
        if (!homeExist || !awayExist) {
            return res.status(404).json({ message: 'Uno de los equipos seleccionados no existe' });
        }

        const matchDate = parseMatchDate(date);
        const fixtureDate = parseMatchdayDate(matchdayDate, matchDate);
        const matchStatus = String(status || 'SCHEDULED').trim().toUpperCase();
        if (!MATCH_STATUSES.includes(matchStatus)) {
            return res.status(400).json({ message: 'El estado seleccionado no es válido' });
        }
        if (RESCHEDULED_STATUSES.includes(matchStatus) && !matchDate) {
            return res.status(400).json({
                message: '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.',
            });
        }
        if (matchStatus === 'IN_PROGRESS' && !matchDate) {
            return res.status(400).json({ message: 'No se puede iniciar un partido sin fecha y hora válidas.' });
        }
        if (matchStatus === 'IN_PROGRESS') {
            const prerequisiteError = await findMatchdayPrerequisiteError(numericMatchday);
            if (prerequisiteError) return res.status(409).json({ message: prerequisiteError });
        }
        if (matchStatus === 'FINISHED') {
            return res.status(400).json({ message: 'El partido debe iniciarse antes de poder finalizarlo.' });
        }
        const matchdayDateError = await findMatchdayDateConstraintError({
            matchday: numericMatchday,
            matchdayDate: fixtureDate,
            allowReschedule: RESCHEDULED_STATUSES.includes(matchStatus),
        });
        if (matchdayDateError) return res.status(409).json({ message: matchdayDateError });

        const matchStadium = resolveMatchStadium(stadium, homeExist);
        const constraintError = await findMatchConstraintError({
            matchday: numericMatchday,
            matchdayDate: fixtureDate,
            homeTeam: homeExist._id,
            awayTeam: awayExist._id,
            date: matchDate,
            stadium: matchStadium,
        });
        if (constraintError) return res.status(409).json({ message: constraintError });

        const newMatch = new Match({
            matchday: numericMatchday,
            matchdayDate: fixtureDate,
            date: matchDate,
            stadium: matchStadium,
            referee: referee || '',
            homeTeam,
            awayTeam,
            status: matchStatus,
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
        const { matchday, matchdayDate, date, homeTeam, awayTeam, stadium, referee, status } = req.body;
        const updateData = {};

        if (matchday !== undefined) {
            const numericMatchday = Number(matchday);
            if (!Number.isInteger(numericMatchday) || numericMatchday < 1) {
                return res.status(400).json({ message: 'La jornada debe ser un número mayor o igual a 1' });
            }
            updateData.matchday = numericMatchday;
        }

        if (date !== undefined) updateData.date = parseMatchDate(date);
        if (homeTeam !== undefined) updateData.homeTeam = homeTeam;
        if (awayTeam !== undefined) updateData.awayTeam = awayTeam;
        if (stadium !== undefined) updateData.stadium = String(stadium || '').trim();
        if (referee !== undefined) updateData.referee = String(referee || '').trim();
        if (status !== undefined) {
            const normalizedStatus = String(status).trim().toUpperCase();
            if (!MATCH_STATUSES.includes(normalizedStatus)) {
                return res.status(400).json({ message: 'El estado seleccionado no es válido' });
            }
            updateData.status = normalizedStatus;
        }

        const currentMatch = await Match.findById(req.params.id);
        if (!currentMatch) {
            return res.status(404).json({ message: 'Partido no encontrado' });
        }
        if (String(currentMatch.status).toUpperCase() === 'FINISHED') {
            return res.status(409).json({ message: 'El partido finalizado es inmutable y no se puede editar.' });
        }

        const finalHome = homeTeam || currentMatch.homeTeam.toString();
        const finalAway = awayTeam || currentMatch.awayTeam.toString();

        if (String(finalHome) === String(finalAway)) {
            return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo' });
        }

        const [homeExist, awayExist] = await Promise.all([
            Team.findById(finalHome),
            Team.findById(finalAway),
        ]);
        if (!homeExist || !awayExist) {
            return res.status(404).json({ message: 'Uno de los equipos seleccionados no existe' });
        }

        const finalMatchday = updateData.matchday ?? currentMatch.matchday;
        const finalDate = updateData.date !== undefined ? updateData.date : currentMatch.date;
        const finalStatus = updateData.status ?? currentMatch.status;
        const previousStatus = String(currentMatch.status || '').toUpperCase();
        const originalScheduledDate = currentMatch.originalDate || currentMatch.date;
        if (RESCHEDULED_STATUSES.includes(finalStatus)) {
            if (!finalDate || (
                finalStatus !== previousStatus &&
                currentMatch.date &&
                finalDate.getTime() === currentMatch.date.getTime()
            )) {
                return res.status(400).json({
                    message: '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.',
                });
            }
            if (!currentMatch.originalDate && !RESCHEDULED_STATUSES.includes(previousStatus) && currentMatch.date) {
                updateData.originalDate = currentMatch.date;
            }
        }
        if ((RESCHEDULED_STATUSES.includes(finalStatus) || RESCHEDULED_STATUSES.includes(previousStatus)) &&
            (!finalDate || (originalScheduledDate && finalDate.getTime() < originalScheduledDate.getTime()))) {
            return res.status(400).json({
                message: !finalDate
                    ? '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.'
                    : 'La nueva fecha no puede ser anterior a la fecha original del encuentro.',
            });
        }
        if (finalStatus === 'IN_PROGRESS' && !finalDate) {
            return res.status(400).json({ message: 'No se puede iniciar un partido sin fecha y hora válidas.' });
        }
        if (finalStatus === 'IN_PROGRESS') {
            const prerequisiteError = await findMatchdayPrerequisiteError(finalMatchday);
            if (prerequisiteError) return res.status(409).json({ message: prerequisiteError });
        }
        if (finalStatus === 'FINISHED' && previousStatus !== 'IN_PROGRESS') {
            return res.status(400).json({ message: 'El partido debe estar en vivo antes de poder finalizarlo.' });
        }

        const finalStadium = resolveMatchStadium(
            updateData.stadium !== undefined
                ? updateData.stadium
                : (String(finalHome) !== currentMatch.homeTeam.toString() ? '' : currentMatch.stadium),
            homeExist,
        );
        updateData.stadium = finalStadium;
        const finalMatchdayDate = parseMatchdayDate(
            matchdayDate ?? currentMatch.matchdayDate,
            finalDate,
        );
        updateData.matchdayDate = finalMatchdayDate;
        const matchdayDateError = await findMatchdayDateConstraintError({
            matchday: finalMatchday,
            matchdayDate: finalMatchdayDate,
            excludeId: currentMatch._id,
            allowReschedule: RESCHEDULED_STATUSES.includes(finalStatus) || Boolean(currentMatch.originalDate),
        });
        if (matchdayDateError) return res.status(409).json({ message: matchdayDateError });
        const constraintError = await findMatchConstraintError({
            matchday: finalMatchday,
            homeTeam: finalHome,
            awayTeam: finalAway,
            date: finalDate,
            stadium: finalStadium,
            excludeId: currentMatch._id,
        });
        if (constraintError) return res.status(409).json({ message: constraintError });

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
        if (String(match.status).toUpperCase() === 'FINISHED') {
            return res.status(409).json({ message: 'El partido finalizado es inmutable y no se puede modificar.' });
        }

        const normalizedStatus = status === undefined ? match.status : String(status).trim().toUpperCase();
        if (status !== undefined && !MATCH_STATUSES.includes(normalizedStatus)) {
            return res.status(400).json({ message: 'El estado seleccionado no es válido' });
        }
        if (normalizedStatus === 'IN_PROGRESS' && !match.date) {
            return res.status(400).json({ message: 'No se puede iniciar un partido sin fecha y hora válidas.' });
        }
        if (normalizedStatus === 'IN_PROGRESS') {
            const prerequisiteError = await findMatchdayPrerequisiteError(match.matchday);
            if (prerequisiteError) return res.status(409).json({ message: prerequisiteError });
        }
        if (normalizedStatus === 'FINISHED' && String(match.status).toUpperCase() !== 'IN_PROGRESS') {
            return res.status(400).json({ message: 'El partido debe estar en vivo antes de poder finalizarlo.' });
        }
        if (RESCHEDULED_STATUSES.includes(normalizedStatus) && !RESCHEDULED_STATUSES.includes(match.status)) {
            return res.status(400).json({
                message: '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.',
            });
        }

        if (goals !== undefined && !Array.isArray(goals)) {
            return res.status(400).json({ message: 'La lista de goles no es válida' });
        }

        if (Array.isArray(goals)) {
            const validTeamIds = [match.homeTeam.toString(), match.awayTeam.toString()];
            const [homeTeamDoc, awayTeamDoc] = await Promise.all([
                Team.findById(match.homeTeam),
                Team.findById(match.awayTeam),
            ]);

            const sanitizedGoals = [];

            for (let index = 0; index < goals.length; index += 1) {
                const goal = goals[index];
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
                        const previousGoal = goal._id
                            ? match.goals.id(goal._id)
                            : match.goals[index];
                        const previousPlayer = previousGoal?.player;
                        if (isUnavailablePlayerStatus(playerDoc) && !sameId(previousPlayer, goal.player)) {
                            return res.status(400).json({
                                message: 'No se puede seleccionar un jugador lesionado o suspendido',
                            });
                        }

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
                    _id: goal._id,
                    player: goal.player || null,
                    scorer: goal.scorer || '',
                    team: goal.team,
                    minute: Number.isFinite(Number(goal.minute)) ? Number(goal.minute) : 1,
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
        if (status !== undefined) match.status = String(status).trim().toUpperCase();

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
        if (String(match.status).toUpperCase() === 'FINISHED') {
            return res.status(409).json({ message: 'No se pueden agregar ni modificar incidencias de un partido finalizado.' });
        }

        const validTeamsIds = [match.homeTeam.toString(), match.awayTeam.toString()];
        const [homeTeamDoc, awayTeamDoc] = await Promise.all([
            Team.findById(match.homeTeam),
            Team.findById(match.awayTeam),
        ]);

        const sanitizedEvents = [];

        // Rastrear tarjetas amarillas y eventos por jugador en este partido
        const yellowCounts = new Map();

        if (!Array.isArray(events)) {
            return res.status(400).json({ message: 'La lista de incidencias no es válida' });
        }

        for (let index = 0; index < events.length; index += 1) {
            const event = events[index];
            const eventTeamId = event.team ? event.team.toString() : '';
            if (eventTeamId && !validTeamsIds.includes(eventTeamId)) {
                return res.status(400).json({
                    message: 'El evento está asignado a un equipo que no está jugando este partido'
                });
            }

            const evType = String(event.type || '').toUpperCase();
            const previousEvent = event._id
                ? match.events.id(event._id)
                : match.events[index];
            const selectedPlayerIds = [
                ['player', event.player],
                ['playerIn', event.playerIn],
                ['playerOut', event.playerOut],
            ];
            for (const [field, playerId] of selectedPlayerIds) {
                if (!playerId || sameId(previousEvent?.[field], playerId)) continue;
                const selectedPlayer = await Player.findById(playerId);
                if (!selectedPlayer) {
                    return res.status(400).json({ message: 'Uno de los jugadores seleccionados no existe' });
                }
                if (isUnavailablePlayerStatus(selectedPlayer)) {
                    return res.status(400).json({
                        message: 'No se puede seleccionar un jugador lesionado o suspendido',
                    });
                }
            }

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
                _id: event._id,
                type: event.type,
                player: event.player || null,
                team: event.team || null,
                minute: Number.isFinite(Number(event.minute)) ? Number(event.minute) : 1,
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
    updateMatchEvents,
    generateFixture,
    createDoubleRoundRobinFixtures,
    scheduleFixtureMatches,
};