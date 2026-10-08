const Player = require('../models/Player');
const Team = require('../models/Team');

// @desc    Obtener todos los jugadores
<<<<<<< HEAD
// @route   GET /api/players  (opcional: ?page=1&limit=20)
const getPlayers = async (req, res) => {
  try {
    // Paginación opcional: ?page=1&limit=20
    const page  = req.query.page  ? Math.max(1, Number(req.query.page))  : null;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;

    const query = Player.find().populate('team', 'name shortName');

    if (page && limit) {
      const total = await Player.countDocuments();
      const players = await query.skip((page - 1) * limit).limit(limit);
      return res.status(200).json({
        data: players,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    const players = await query;
=======
// @route   GET /api/players
const getPlayers = async (req, res) => {
  try {
    // populate('team', 'name shortName') trae el nombre y sigla del equipo en lugar de solo el ID
    const players = await Player.find().populate('team', 'name shortName');
>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los jugadores', error: error.message });
  }
};

// @desc    Obtener un jugador por ID
// @route   GET /api/players/:id
const getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name shortName logoUrl');

    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado' });
    }

    res.status(200).json(player);
  } catch (error) {
    res.status(400).json({ message: 'ID de jugador no válido', error: error.message });
  }
};

// @desc    Crear un nuevo jugador
// @route   POST /api/players
const createPlayer = async (req, res) => {
  try {
    const { name, number, position, team, photoUrl } = req.body;

    // Verificar que el equipo exista antes de asignar el jugador
    const teamExists = await Team.findById(team);
    if (!teamExists) {
      return res.status(404).json({ message: 'El equipo especificado no existe' });
    }

    const newPlayer = await Player.create({
      name,
      number,
      position,
      team,
      photoUrl
    });

    res.status(201).json(newPlayer);
  } catch (error) {
    // Controlar el error de índice duplicado (Mismo equipo + misma camiseta)
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El número de camiseta ya está asignado a otro jugador en este equipo'
      });
    }
    res.status(400).json({ message: 'Error al crear el jugador', error: error.message });
  }
};

// @desc    Actualizar un jugador
// @route  PUT /api/players/:id
const updatePlayer = async (req, res) => {
  try {
    // Si viene un cambio de equipo en el body, validar que el nuevo equipo exista
    if (req.body.team) {
      const teamExists = await Team.findById(req.body.team);
      if (!teamExists) {
        return res.status(404).json({ message: 'El nuevo equipo especificado no existe' });
      }
    }

    const updatedPlayer = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('team', 'name shortName');

    if (!updatedPlayer) {
      return res.status(404).json({ message: 'Jugador no encontrado para actualizar' });
    }

    res.status(200).json(updatedPlayer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El número de camiseta ya está asignado a otro jugador en este equipo'
      });
    }
    res.status(400).json({ message: 'Error al actualizar el jugador', error: error.message });
  }
};

// @desc    Eliminar un jugador
// @route   DELETE /api/players/:id
const deletePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado para eliminar' });
    }

    res.status(200).json({ message: 'Jugador eliminado correctamente', id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: 'Error al eliminar el jugador', error: error.message });
  }
};

module.exports = {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer
};