const express = require('express');
const router = express.Router();
const {
    getMatches,
    getMatchById,
    createMatch,
    updateMatch,
    deleteMatch,
    updateMatchResult,
    updateMatchEvents
} = require('../controllers/matchController');

router.route('/')
.get(getMatches)
.post(createMatch);

router.route('/:id/result')
.put(updateMatchResult);

router.route('/:id/events')
.put(updateMatchEvents);

router.route('/:id')
.get(getMatchById)
.put(updateMatch)
.delete(deleteMatch);

module.exports = router;