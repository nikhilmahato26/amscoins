const router = require('express').Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/auth', require('./authRoutes'))
router.use('/plans', require('./planRoutes'))

module.exports = router
