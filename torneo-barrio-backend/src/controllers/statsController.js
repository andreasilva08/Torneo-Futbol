const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');

// Helper para obtener el nombre seguro de un equipo
const getTeamName = (team) => {
  if (!team) return 'Equipo';
  return team.name || team.nombre || 'Equipo';
};

// Helper para obtener el nombre seguro de un jugador
const getPlayerName = (player) => {
  if (!player) return 'Jugador';
  return player.name || player.nombre || 'Jugador';
};

// @desc    Obtener tabla general de posiciones
// @route   GET /api/standings
const getStandings = async (req, res) => {
  try {
    const teams = await Team.find().lean();
    const matches = await Match.find({ status: 'FINISHED' }).lean();

    const standings = teams.map((team) => {
      const name = getTeamName(team);
      const shortName = team.shortName || team.siglas || name.slice(0, 3).toUpperCase();
      const logoUrl = team.logoUrl || team.escudo_url || '';
      const stadium = team.stadium || team.cancha || 'Cancha Local';
      const neighborhood = team.neighborhood || team.barrio || '';

      return {
        _id: team._id,
        name,
        nombre: name,
        shortName,
        siglas: shortName,
        logoUrl,
        escudo_url: logoUrl,
        stadium,
        cancha: stadium,
        neighborhood,
        barrio: neighborhood,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    });

    const standingsById = new Map(standings.map((team) => [team._id.toString(), team]));

    matches.forEach((match) => {
      const homeId = match.homeTeam ? match.homeTeam.toString() : null;
      const awayId = match.awayTeam ? match.awayTeam.toString() : null;
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
        const firstName = String(first.name || '');
        const secondName = String(second.name || '');
        return firstName.localeCompare(secondName);
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

// @desc    Obtener tabla de máximos goleadores
// @route   GET /api/stats/top-scorers
const getTopScorers = async (req, res) => {
  try {
    const [matches, allPlayers, allTeams] = await Promise.all([
      Match.find().lean(),
      Player.find().lean(),
      Team.find().lean(),
    ]);

    // Mapas para resolución rápida
    const playersById = new Map(allPlayers.map((p) => [p._id.toString(), p]));
    const playersByName = new Map(
      allPlayers.map((p) => [String(p.nombre || p.name || '').trim().toLowerCase(), p])
    );
    const teamsById = new Map(allTeams.map((t) => [t._id.toString(), t]));
    const teamsByName = new Map(
      allTeams.map((t) => [String(t.nombre || t.name || '').trim().toLowerCase(), t])
    );

    // Contenedor acumulador de goles por jugador: key = playerId
    const scorersMap = new Map();

    // 1. Contabilizar goles desde los partidos disputados
    for (const match of matches) {
      const matchGoals = Array.isArray(match.goals) ? match.goals : [];
      for (const goal of matchGoals) {
        if (goal.isOwnGoal || goal.isAutogol) {
          continue; // Los autogoles no suman al jugador en la tabla de goleadores
        }

        let playerObj = null;
        if (goal.player) {
          playerObj = playersById.get(goal.player.toString());
        }
        if (!playerObj && goal.scorer) {
          playerObj = playersByName.get(String(goal.scorer).trim().toLowerCase());
        }

        const playerId = playerObj ? playerObj._id.toString() : (goal.player ? goal.player.toString() : (goal.scorer || 'desconocido'));
        const playerName = playerObj ? getPlayerName(playerObj) : (goal.scorer || 'Jugador desconocido');

        // Determinar equipo
        let teamObj = null;
        if (goal.team) {
          teamObj = teamsById.get(goal.team.toString());
        }
        if (!teamObj && playerObj?.team) {
          teamObj = teamsById.get(playerObj.team.toString());
        }
        if (!teamObj && playerObj?.equipo) {
          teamObj = teamsByName.get(String(playerObj.equipo).trim().toLowerCase());
        }

        const teamName = teamObj ? getTeamName(teamObj) : (playerObj?.equipo || 'Sin equipo');
        const teamId = teamObj ? teamObj._id.toString() : null;

        if (!scorersMap.has(playerId)) {
          scorersMap.set(playerId, {
            playerId,
            player: playerName,
            team: teamName,
            teamId,
            goals: 0,
          });
        }

        scorersMap.get(playerId).goals += 1;
      }
    }

    // 2. Considerar también goles registrados directamente en los datos del jugador (si son mayores)
    for (const p of allPlayers) {
      const manualGoals = Number(p.goals !== undefined ? p.goals : (p.goles !== undefined ? p.goles : 0));
      if (manualGoals > 0) {
        const pId = p._id.toString();
        const pName = getPlayerName(p);
        let teamObj = p.team ? teamsById.get(p.team.toString()) : (p.equipo ? teamsByName.get(String(p.equipo).trim().toLowerCase()) : null);
        const teamName = teamObj ? getTeamName(teamObj) : (p.equipo || 'Sin equipo');
        const teamId = teamObj ? teamObj._id.toString() : null;

        if (!scorersMap.has(pId)) {
          scorersMap.set(pId, {
            playerId: pId,
            player: pName,
            team: teamName,
            teamId,
            goals: manualGoals,
          });
        } else {
          const current = scorersMap.get(pId);
          current.goals = Math.max(current.goals, manualGoals);
        }
      }
    }

    const rows = Array.from(scorersMap.values())
      .filter((item) => item.goals > 0)
      .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player))
      .map((row, i) => ({
        position: i + 1,
        ...row,
      }));

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular los goleadores', error: error.message });
  }
};

// @desc    Obtener tabla de máximos asistentes
// @route   GET /api/stats/top-assists
const getTopAssists = async (req, res) => {
  try {
    const [matches, allPlayers, allTeams] = await Promise.all([
      Match.find().lean(),
      Player.find().lean(),
      Team.find().lean(),
    ]);

    const playersById = new Map(allPlayers.map((p) => [p._id.toString(), p]));
    const playersByName = new Map(
      allPlayers.map((p) => [String(p.nombre || p.name || '').trim().toLowerCase(), p])
    );
    const teamsById = new Map(allTeams.map((t) => [t._id.toString(), t]));
    const teamsByName = new Map(
      allTeams.map((t) => [String(t.nombre || t.name || '').trim().toLowerCase(), t])
    );

    const assistsMap = new Map();

    const addAssist = (playerIdOrName, teamIdOrName) => {
      let playerObj = null;
      if (playersById.has(String(playerIdOrName))) {
        playerObj = playersById.get(String(playerIdOrName));
      } else if (playersByName.has(String(playerIdOrName).trim().toLowerCase())) {
        playerObj = playersByName.get(String(playerIdOrName).trim().toLowerCase());
      }

      const pId = playerObj ? playerObj._id.toString() : String(playerIdOrName);
      const pName = playerObj ? getPlayerName(playerObj) : String(playerIdOrName);

      let teamObj = null;
      if (teamIdOrName && teamsById.has(String(teamIdOrName))) {
        teamObj = teamsById.get(String(teamIdOrName));
      } else if (teamIdOrName && teamsByName.has(String(teamIdOrName).trim().toLowerCase())) {
        teamObj = teamsByName.get(String(teamIdOrName).trim().toLowerCase());
      } else if (playerObj?.team && teamsById.has(playerObj.team.toString())) {
        teamObj = teamsById.get(playerObj.team.toString());
      } else if (playerObj?.equipo && teamsByName.has(String(playerObj.equipo).trim().toLowerCase())) {
        teamObj = teamsByName.get(String(playerObj.equipo).trim().toLowerCase());
      }

      const teamName = teamObj ? getTeamName(teamObj) : (playerObj?.equipo || 'Sin equipo');
      const teamId = teamObj ? teamObj._id.toString() : null;

      if (!assistsMap.has(pId)) {
        assistsMap.set(pId, {
          playerId: pId,
          player: pName,
          team: teamName,
          teamId,
          assists: 0,
        });
      }

      assistsMap.get(pId).assists += 1;
    };

    // 1. Asistencias desde los goles de partidos
    for (const match of matches) {
      const matchGoals = Array.isArray(match.goals) ? match.goals : [];
      for (const goal of matchGoals) {
        if (goal.assistPlayer) {
          addAssist(goal.assistPlayer, goal.team);
        } else if (goal.assist && String(goal.assist).trim() !== '') {
          addAssist(goal.assist, goal.team);
        }
      }

      // 2. Asistencias desde la lista de eventos
      const matchEvents = Array.isArray(match.events) ? match.events : [];
      for (const event of matchEvents) {
        const evType = String(event.type || '').toUpperCase();
        if (evType === 'ASSIST' || evType.includes('ASISTENCIA')) {
          if (event.player) {
            addAssist(event.player, event.team);
          }
        }
      }
    }

    // 3. Considerar asistencias registradas directamente en los jugadores
    for (const p of allPlayers) {
      const manualAssists = Number(p.assists !== undefined ? p.assists : (p.asistencias !== undefined ? p.asistencias : 0));
      if (manualAssists > 0) {
        const pId = p._id.toString();
        const pName = getPlayerName(p);
        let teamObj = p.team ? teamsById.get(p.team.toString()) : (p.equipo ? teamsByName.get(String(p.equipo).trim().toLowerCase()) : null);
        const teamName = teamObj ? getTeamName(teamObj) : (p.equipo || 'Sin equipo');
        const teamId = teamObj ? teamObj._id.toString() : null;

        if (!assistsMap.has(pId)) {
          assistsMap.set(pId, {
            playerId: pId,
            player: pName,
            team: teamName,
            teamId,
            assists: manualAssists,
          });
        } else {
          const current = assistsMap.get(pId);
          current.assists = Math.max(current.assists, manualAssists);
        }
      }
    }

    const rows = Array.from(assistsMap.values())
      .filter((item) => item.assists > 0)
      .sort((a, b) => b.assists - a.assists || a.player.localeCompare(b.player))
      .map((row, i) => ({
        position: i + 1,
        ...row,
      }));

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular las asistencias', error: error.message });
  }
};

// @desc    Obtener valla menos vencida (porteros / equipos)
// @route   GET /api/stats/goalkeepers
const getGoalkeepers = async (req, res) => {
  try {
    const teams = await Team.find().lean();
    const matches = await Match.find({ status: 'FINISHED' }).lean();

    const teamStats = new Map(teams.map((team) => {
      const name = getTeamName(team);
      const shortName = team.shortName || team.siglas || name.slice(0, 3).toUpperCase();
      const logoUrl = team.logoUrl || team.escudo_url || '';

      return [team._id.toString(), {
        teamId: team._id,
        team: name,
        shortName,
        logoUrl,
        matches: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
      }];
    }));

    matches.forEach((match) => {
      const homeId = match.homeTeam ? match.homeTeam.toString() : null;
      const awayId = match.awayTeam ? match.awayTeam.toString() : null;
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
        const firstName = String(first.team || '');
        const secondName = String(second.team || '');
        return firstName.localeCompare(secondName);
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
