const router = require('express').Router()
const auth = require('../middleware/auth')
const requireAdmin = require('../middleware/requireAdmin')
const { getReport } = require('../controllers/reportsController')

router.use(auth, requireAdmin)
router.get('/:type', getReport)

module.exports = router
