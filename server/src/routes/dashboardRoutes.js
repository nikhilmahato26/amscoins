const router = require('express').Router()
const auth = require('../middleware/auth')
const { summary } = require('../controllers/dashboardController')

router.get('/', auth, summary)

module.exports = router
