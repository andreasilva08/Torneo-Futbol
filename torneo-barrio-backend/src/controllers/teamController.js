const Team = require('../models/Team');
const Player = require('../models/Player');

const isValidImageUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch (error) {
    return false;
  }
};

const getDefaultTeamLogo = (teamName = '', teamId = '') => {
  const source = `${teamId || teamName || 'default-team'}`.trim();
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = source.charCodeAt(index) + ((hash << 5) - hash);
  }

  const normalized = Math.abs(hash) % 6;
  return `/images/default-team-${normalized + 1}.svg`;
};

const resolveTeamLogoUrl = (team = {}, teamName = '', teamId = '') => {
  const sourceName = teamName || team?.name || '';
  const sourceId = teamId || team?._id?.toString?.() || '';
  const rawUrl = typeof team?.logoUrl === 'string' ? team.logoUrl.trim() : '';

  if (isValidImageUrl(rawUrl)) {
    return rawUrl;
  }

  return getDefaultTeamLogo(sourceName, sourceId);
};

const normalizeTeamPayload = (team, teamName = '', teamId = '') => ({
  ...team,
  logoUrl: resolveTeamLogoUrl(team, teamName || team.name || '', teamId || team._id?.toString?.() || '')
})
// @desc    Obtener todos los equipos
// @route   GET /api/teams
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find().lean();
    res.status(200).json(teams.map((team) => normalizeTeamPayload(team, team.name, team._id.toString())));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los equipos', error: error.message });
  }
};

// @desc    Obtener un equipo por su ID
// @route   GET /api/teams/:id
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    res.status(200).json(normalizeTeamPayload(team.toObject(), team.name, team._id.toString()));
  } catch (error) {
    res.status(400).json({ message: 'ID de equipo no válido', error: error.message });
  }
};

// @desc    Crear un nuevo equipo
// @route   POST /api/teams
const createTeam = async (req, res) => {
  try {
    const { name, shortName, logoUrl, stadium } = req.body;
    const resolvedLogoUrl = resolveTeamLogoUrl({ logoUrl }, name, '');

    const newTeam = await Team.create({
      name,
      shortName,
      logoUrl: resolvedLogoUrl,
      stadium
    });

    const teamResponse = normalizeTeamPayload(newTeam.toObject(), newTeam.name, newTeam._id.toString());
    res.status(201).json(teamResponse);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ya existe un equipo con ese nombre' });
    }
    res.status(400).json({ message: 'Error al crear el equipo', error: error.message });
  }
};

// @desc    Actualizar un equipo
// @route   PUT /api/teams/:id
const updateTeam = async (req, res) => {
  try {
    const existingTeam = await Team.findById(req.params.id);
    if (!existingTeam) {
      return res.status(404).json({ message: 'Equipo no encontrado para actualizar' });
    }

    const nextPayload = {
      ...req.body,
      logoUrl: resolveTeamLogoUrl({
        ...existingTeam.toObject(),
        logoUrl: req.body.logoUrl,
      }, existingTeam.name, existingTeam._id.toString()),
    };

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      nextPayload,
      { new: true, runValidators: true }
    );

    res.status(200).json(normalizeTeamPayload(updatedTeam.toObject(), updatedTeam.name, updatedTeam._id.toString()));
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el equipo', error: error.message });
  }
};

// @desc    Eliminar un equipo
// @route   DELETE /api/teams/:id
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Equipo no encontrado para eliminar' });
    }

    res.status(200).json({ message: 'Equipo eliminado correctamente', id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: 'Error al eliminar el equipo', error: error.message });
  }
};

// @desc    Obtener todos los jugadores de un equipo específico (Plantilla)
// @route   GET /api/teams/:id/players
const getTeamPlayers = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    const players = await Player.find({ team: req.params.id }).select('-team');

    res.status(200).json({
      team: normalizeTeamPayload(team.toObject(), team.name, team._id.toString()),
      totalPlayers: players.length,
      players
    });
  } catch (error) {
    res.status(400).json({ message: 'ID de equipo no válido', error: error.message });
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamPlayers
};