const Match = require('../models/Match');
<<<<<<< HEAD
const Team = require('../models/Team');

// ─── Aggregation Pipeline: Goleadores ───────────────────────────────────────
const getTopScorersAgg = async () => {
  return Match.aggregate([
    { $unwind: '$goals' },
    {
      $group: {
        _id: '$goals.player',
        teamId: { $last: '$goals.team' },
        goals: { $sum: 1 },
      },
    },
    { $sort: { goals: -1, _id: 1 } },
    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: '_id',
        as: 'playerData',
      },
    },
    { $unwind: { path: '$playerData', preserveNullAndEmpty: true } },
    {
      $lookup: {
        from: 'teams',
        localField: 'teamId',
        foreignField: '_id',
        as: 'teamData',
      },
    },
    { $unwind: { path: '$teamData', preserveNullAndEmpty: true } },
    {
      $project: {
        _id: 0,
        playerId: '$_id',
        player: { $ifNull: ['$playerData.name', 'Jugador desconocido'] },
        team: { $ifNull: ['$teamData.name', 'Sin equipo'] },
        teamId: '$teamId',
        goals: 1,
      },
    },
  ]);
};

// ─── Aggregation Pipeline: Asistencias ──────────────────────────────────────
const getTopAssistsAgg = async () => {
  return Match.aggregate([
    { $unwind: '$goals' },
    // Solo goles que tienen asistencia registrada
    { $match: { 'goals.assistPlayer': { $ne: null, $exists: true } } },
    {
      $group: {
        _id: '$goals.assistPlayer',
        teamId: { $last: '$goals.team' },
        assists: { $sum: 1 },
      },
    },
    { $sort: { assists: -1, _id: 1 } },
    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: '_id',
        as: 'playerData',
      },
    },
    { $unwind: { path: '$playerData', preserveNullAndEmpty: true } },
    {
      $lookup: {
        from: 'teams',
        localField: 'teamId',
        foreignField: '_id',
        as: 'teamData',
      },
    },
    { $unwind: { path: '$teamData', preserveNullAndEmpty: true } },
    {
      $project: {
        _id: 0,
        playerId: '$_id',
        player: { $ifNull: ['$playerData.name', 'Jugador desconocido'] },
        team: { $ifNull: ['$teamData.name', 'Sin equipo'] },
        teamId: '$teamId',
        assists: 1,
      },
    },
  ]);
=======
const Player = require('../models/Player');
const Team = require('../models/Team');

const buildStatsTable = async (eventType, labelField) => {
  const matches = await Match.find({}).lean();
  const statsMap = new Map();

  matches.forEach((match) => {
    const goalEntries = Array.isArray(match.goals) ? match.goals : [];
    const eventEntries = Array.isArray(match.events) ? match.events : [];

    if (eventType === 'GOAL') {
      goalEntries.forEach((goal) => {
        if (!goal?.player || !goal?.team) {
          return;
        }

        const playerId = goal.player.toString();
        const teamId = goal.team.toString();
        const current = statsMap.get(playerId) || { playerId, teamId, count: 0 };

        current.count += 1;
        current.teamId = teamId;
        statsMap.set(playerId, current);
      });
      return;
    }

    const assistKeys = new Set();

    goalEntries.forEach((goal) => {
      if (!goal?.assistPlayer || !goal?.team) {
        return;
      }

      const playerId = goal.assistPlayer.toString();
      const teamId = goal.team.toString();
      const key = `${match._id.toString()}:${teamId}:${playerId}:${goal.minute ?? 'n/a'}`;
      if (assistKeys.has(key)) {
        return;
      }

      assistKeys.add(key);
      const current = statsMap.get(playerId) || { playerId, teamId, count: 0 };
      current.count += 1;
      current.teamId = teamId;
      statsMap.set(playerId, current);
    });

    eventEntries.forEach((event) => {
      if (!event || event.type !== 'ASSIST' || !event.player || !event.team) {
        return;
      }

      const playerId = event.player.toString();
      const teamId = event.team.toString();
      const key = `${match._id.toString()}:${teamId}:${playerId}:${event.minute ?? 'n/a'}`;
      if (assistKeys.has(key)) {
        return;
      }

      const current = statsMap.get(playerId) || { playerId, teamId, count: 0 };
      current.count += 1;
      current.teamId = teamId;
      statsMap.set(playerId, current);
    });
  });

  const playerIds = [...statsMap.keys()];
  const players = playerIds.length
    ? await Player.find({ _id: { $in: playerIds } }).populate('team', 'name shortName').lean()
    : [];

  const playerById = new Map(players.map((player) => [player._id.toString(), player]));
  const teams = await Team.find().lean();
  const teamById = new Map(teams.map((team) => [team._id.toString(), team]));

  const rows = [...statsMap.values()].map((entry) => {
    const player = playerById.get(entry.playerId) || null;
    const team = teamById.get(entry.teamId) || (player?.team ? teamById.get(player.team._id.toString()) : null);

    return {
      playerId: entry.playerId,
      player: player?.name || 'Jugador desconocido',
      team: team?.name || player?.team?.name || 'Sin equipo',
      teamId: team?._id || player?.team?._id || null,
      [labelField]: entry.count,
    };
  }).sort((first, second) => {
    const diff = Number(second[labelField]) - Number(first[labelField]);
    if (diff !== 0) {
      return diff;
    }

    return String(first.player).localeCompare(String(second.player));
  });

  return rows.map((row, index) => ({
    position: index + 1,
    ...row,
  }));
>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
};

const getStandings = async (req, res) => {
  try {
    const teams = await Team.find().lean();
    const matches = await Match.find({ status: 'FINISHED' }).lean();

    const standings = teams.map((team) => ({
      _id: team._id,
      name: team.name,
      shortName: team.shortName,
      logoUrl: team.logoUrl || '',
      stadium: team.stadium || 'Cancha Local',
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    const standingsById = new Map(standings.map((team) => [team._id.toString(), team]));

    matches.forEach((match) => {
      const homeId = match.homeTeam?.toString();
      const awayId = match.awayTeam?.toString();
      const homeTeam = standingsById.get(homeId);
      const awayTeam = standingsById.get(awayId);

      if (!homeTeam || !awayTeam) {
        return;
      }

      const homeGoals = Number(match.homeScore || 0);
      const awayGoals = Number(match.awayScore || 0);

      homeTeam.played += 1;
      awayTeam.played += 1;
      homeTeam.goalsFor += homeGoals;
      awayTeam.goalsFor += awayGoals;
      homeTeam.goalsAgainst += awayGoals;
      awayTeam.goalsAgainst += homeGoals;

      if (homeGoals > awayGoals) {
        homeTeam.wins += 1;
        homeTeam.points += 3;
        awayTeam.losses += 1;
      } else if (homeGoals < awayGoals) {
        awayTeam.wins += 1;
        awayTeam.points += 3;
        homeTeam.losses += 1;
      } else {
        homeTeam.draws += 1;
        awayTeam.draws += 1;
        homeTeam.points += 1;
        awayTeam.points += 1;
      }
    });

    const rankedStandings = standings
      .map((team) => ({
        ...team,
        goalDifference: team.goalsFor - team.goalsAgainst,
      }))
      .sort((first, second) => {
        if (second.points !== first.points) {
          return second.points - first.points;
        }
        if (second.goalDifference !== first.goalDifference) {
          return second.goalDifference - first.goalDifference;
        }
        if (second.goalsFor !== first.goalsFor) {
          return second.goalsFor - first.goalsFor;
        }
        return first.name.localeCompare(second.name);
      })
      .map((team, index) => ({
        position: index + 1,
        ...team,
      }));

    res.status(200).json(rankedStandings);
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular la tabla de posiciones', error: error.message });
  }
};

const getTopScorers = async (req, res) => {
  try {
<<<<<<< HEAD
    const rows = await getTopScorersAgg();
    res.status(200).json(rows.map((row, i) => ({ position: i + 1, ...row })));
=======
    const scorers = await buildStatsTable('GOAL', 'goals');
    res.status(200).json(scorers);
>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular los goleadores', error: error.message });
  }
};

const getTopAssists = async (req, res) => {
  try {
<<<<<<< HEAD
    const rows = await getTopAssistsAgg();
    res.status(200).json(rows.map((row, i) => ({ position: i + 1, ...row })));
=======
    const assists = await buildStatsTable('ASSIST', 'assists');
    res.status(200).json(assists);
>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular las asistencias', error: error.message });
  }
};

const getGoalkeepers = async (req, res) => {
  try {
    const teams = await Team.find().lean();
    const matches = await Match.find({ status: 'FINISHED' }).lean();

    const teamStats = new Map(teams.map((team) => [team._id.toString(), {
      teamId: team._id,
      team: team.name,
      shortName: team.shortName,
      logoUrl: team.logoUrl || '',
      matches: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
    }]));

    matches.forEach((match) => {
      const homeId = match.homeTeam?.toString();
      const awayId = match.awayTeam?.toString();
      const homeSummary = teamStats.get(homeId);
      const awaySummary = teamStats.get(awayId);

      if (!homeSummary || !awaySummary) {
        return;
      }

      const homeGoals = Number(match.homeScore || 0);
      const awayGoals = Number(match.awayScore || 0);

      homeSummary.matches += 1;
      awaySummary.matches += 1;
      homeSummary.goalsAgainst += awayGoals;
      awaySummary.goalsAgainst += homeGoals;

      if (awayGoals === 0) {
        homeSummary.cleanSheets += 1;
      }

      if (homeGoals === 0) {
        awaySummary.cleanSheets += 1;
      }
    });

    const rows = [...teamStats.values()]
      .filter((team) => team.matches > 0)
      .sort((first, second) => {
        if (first.goalsAgainst !== second.goalsAgainst) {
          return first.goalsAgainst - second.goalsAgainst;
        }
        if (second.cleanSheets !== first.cleanSheets) {
          return second.cleanSheets - first.cleanSheets;
        }
        return first.team.localeCompare(second.team);
      })
      .map((team, index) => ({
        position: index + 1,
        ...team,
      }));

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular la valla menos vencida', error: error.message });
  }
};

module.exports = {
  getStandings,
  getTopScorers,
  getTopAssists,
  getGoalkeepers,
};
