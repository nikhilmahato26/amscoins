const router = require('express').Router()
const auth = require('../middleware/auth')
const { walletLimiter } = require('../config/rateLimits')
const { summary } = require('../controllers/walletController')

router.get('/', auth, walletLimiter, summary)

module.exports = router
