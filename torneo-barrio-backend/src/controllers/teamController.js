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

const normalizeTeamPayload = (team, teamName = '', teamId = '') => {
  const name = team.name || team.nombre || teamName || 'Equipo';
  const shortName = team.shortName || team.siglas || name.slice(0, 3).toUpperCase();
  const rawLogo = team.logoUrl || team.escudo_url || '';
  const resolvedLogo = resolveTeamLogoUrl({ logoUrl: rawLogo }, name, teamId || team._id?.toString?.() || '');

  return {
    ...team,
    name,
    nombre: name,
    shortName,
    siglas: shortName,
    logoUrl: resolvedLogo,
    escudo_url: resolvedLogo,
    coach: team.coach || team.dt || '',
    dt: team.dt || team.coach || '',
    neighborhood: team.neighborhood || team.barrio || '',
    barrio: team.barrio || team.neighborhood || '',
    stadium: team.stadium || team.cancha || 'Cancha Local',
    cancha: team.cancha || team.stadium || 'Cancha Local',
    foundationYear: Number(team.foundationYear || team.fundacion || 2026),
    fundacion: Number(team.fundacion || team.foundationYear || 2026),
  };
};

// @desc    Obtener todos los equipos
// @route   GET /api/teams
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find().lean();
    res.status(200).json(teams.map((team) => normalizeTeamPayload(team, team.name || team.nombre, team._id.toString())));
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

    res.status(200).json(normalizeTeamPayload(team.toObject(), team.name || team.nombre, team._id.toString()));
  } catch (error) {
    res.status(400).json({ message: 'ID de equipo no válido', error: error.message });
  }
};

// @desc    Crear un nuevo equipo
// @route   POST /api/teams
const createTeam = async (req, res) => {
  try {
    const {
      name,
      nombre,
      shortName,
      siglas,
      logoUrl,
      escudo_url,
      stadium,
      coach,
      dt,
      neighborhood,
      barrio,
      foundationYear,
      fundacion,
      primaryColor,
      secondaryColor,
      description,
    } = req.body;

    const teamName = name || nombre;
    if (!teamName) {
      return res.status(400).json({ message: 'El nombre del equipo es obligatorio' });
    }

    const teamShortName = shortName || siglas || teamName.slice(0, 3).toUpperCase();
    const rawLogo = logoUrl || escudo_url || '';
    const resolvedLogoUrl = resolveTeamLogoUrl({ logoUrl: rawLogo }, teamName, '');

    const newTeam = await Team.create({
      name: teamName,
      nombre: teamName,
      shortName: teamShortName,
      siglas: teamShortName,
      logoUrl: resolvedLogoUrl,
      escudo_url: resolvedLogoUrl,
      stadium: stadium || 'Cancha Local',
      coach: coach || dt || '',
      dt: dt || coach || '',
      neighborhood: neighborhood || barrio || '',
      barrio: barrio || neighborhood || '',
      foundationYear: foundationYear ? Number(foundationYear) : fundacion ? Number(fundacion) : 2026,
      fundacion: fundacion ? Number(fundacion) : foundationYear ? Number(foundationYear) : 2026,
      primaryColor: primaryColor || '#15803d',
      secondaryColor: secondaryColor || '#facc15',
      description: description || '',
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

    const players = await Player.find({
      $or: [{ team: req.params.id }, { equipo: team.name }],
    }).select('-team');

    const formattedPlayers = players.map((p) => {
      const raw = typeof p.toObject === 'function' ? p.toObject() : p;
      const name = raw.nombre || raw.name || 'Sin nombre';
      const number = raw.dorsal ?? raw.number ?? 0;
      const position = raw.posicion || raw.position || 'Delantero';
      const status = (raw.condicion || raw.status || 'TITULAR').toUpperCase();
      return {
        ...raw,
        name,
        nombre: name,
        number,
        dorsal: number,
        position,
        posicion: position,
        status,
        condicion: status,
      };
    });

    res.status(200).json({
      team: normalizeTeamPayload(team.toObject(), team.name, team._id.toString()),
      totalPlayers: formattedPlayers.length,
      players: formattedPlayers,
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