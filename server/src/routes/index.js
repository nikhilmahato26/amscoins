const router = require('express').Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/auth', require('./authRoutes'))
router.use('/plans', require('./planRoutes'))
router.use('/investments', require('./investmentRoutes'))
router.use('/wallet', require('./walletRoutes'))
router.use('/referral', require('./referralRoutes'))
router.use('/withdrawals', require('./withdrawalRoutes'))

module.exports = router
