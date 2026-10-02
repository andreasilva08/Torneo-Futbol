const Team = require('../models/Team');
const Player = require('../models/Player');

// @desc    Obtener todos los equipos
// @route   GET /api/teams
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    res.status(200).json(teams);
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

    res.status(200).json(team);
  } catch (error) {
    res.status(400).json({ message: 'ID de equipo no válido', error: error.message });
  }
};

// @desc    Crear un nuevo equipo
// @route   POST /api/teams
const createTeam = async (req, res) => {
  try {
    const { name, shortName, logoUrl, stadium } = req.body;

    const newTeam = await Team.create({
      name,
      shortName,
      logoUrl,
      stadium
    });

    res.status(201).json(newTeam);
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
    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ message: 'Equipo no encontrado para actualizar' });
    }

    res.status(200).json(updatedTeam);
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
      team: {
        _id: team._id,
        name: team.name,
        shortName: team.shortName,
        logoUrl: team.logoUrl,
        stadium: team.stadium
      },
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