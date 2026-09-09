'use strict'

const router = require('express').Router()
const { coinIndexLimiter } = require('../config/rateLimits')
const c = require('../controllers/coinController')

// Public: no login required. This endpoint returns only decorative price
// data (no money, no PII) and is shown on the logged-out landing page as
// the flagship marketing visual — an auth requirement would make it
// invisible to the exact audience it's meant to attract. Rate-limited
// instead, since it's now reachable by anyone.
router.get('/index', coinIndexLimiter, c.getIndex)

module.exports = router
