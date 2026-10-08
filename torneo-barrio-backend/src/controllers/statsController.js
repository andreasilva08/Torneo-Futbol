const Match = require('../models/Match');
const Team = require('../models/Team');

// ─── Aggregation Pipeline: Goleadores ───────────────────────────────────────
const getTopScorersAgg = async () => {
  return Match.aggregate([
    { $unwind: '$goals' },
    // Excluir autogoles de la tabla de máximos artilleros
    { $match: { 'goals.isOwnGoal': { $ne: true } } },
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
    const rows = await getTopScorersAgg();
    res.status(200).json(rows.map((row, i) => ({ position: i + 1, ...row })));
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular los goleadores', error: error.message });
  }
};

const getTopAssists = async (req, res) => {
  try {
    const rows = await getTopAssistsAgg();
    res.status(200).json(rows.map((row, i) => ({ position: i + 1, ...row })));
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
