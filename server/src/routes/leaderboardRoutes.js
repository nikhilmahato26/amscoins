const router = require('express').Router()
const auth = require('../middleware/auth')
const { leaderboardLimiter } = require('../config/rateLimits')
const { list } = require('../controllers/leaderboardController')
router.get('/', auth, leaderboardLimiter, list)
module.exports = router
