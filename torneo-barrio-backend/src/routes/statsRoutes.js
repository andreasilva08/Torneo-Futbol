const express = require('express');
const router = express.Router();
const {
  getStandings,
  getTopScorers,
  getTopAssists,
  getGoalkeepers,
} = require('../controllers/statsController');

router.get('/standings', getStandings);
router.get('/stats/top-scorers', getTopScorers);
router.get('/stats/top-assists', getTopAssists);
router.get('/stats/goalkeepers', getGoalkeepers);

module.exports = router;
