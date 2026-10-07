const express = require('express');
const router = express.Router();
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamPlayers 
} = require('../controllers/teamController');

// Rutas generales
router.route('/')
  .get(getTeams)
  .post(createTeam);

// Ruta para la plantilla de un equipo
router.route('/:id/players')
  .get(getTeamPlayers);

// Rutas con ID de equipo
router.route('/:id')
  .get(getTeamById)
  .put(updateTeam)
  .delete(deleteTeam);

module.exports = router;