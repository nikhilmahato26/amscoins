const router = require('express').Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/auth', require('./authRoutes'))
router.use('/users', require('./userRoutes'))
router.use('/plans', require('./planRoutes'))
router.use('/investments', require('./investmentRoutes'))
router.use('/wallet', require('./walletRoutes'))
router.use('/referral', require('./referralRoutes'))
router.use('/withdrawals', require('./withdrawalRoutes'))
router.use('/support', require('./supportRoutes'))
router.use('/admin', require('./adminRoutes'))
router.use('/leaderboard', require('./leaderboardRoutes'))
router.use('/dashboard', require('./dashboardRoutes'))
router.use('/settings', require('./settingsRoutes'))

module.exports = router
