const router = require('express').Router()
const auth = require('../middleware/auth')
const { dashboardLimiter } = require('../config/rateLimits')
const { summary } = require('../controllers/dashboardController')

router.get('/', auth, dashboardLimiter, summary)

module.exports = router
