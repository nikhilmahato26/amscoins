const router = require('express').Router()
const auth = require('../middleware/auth')
const { summary } = require('../controllers/walletController')

router.get('/', auth, summary)

module.exports = router
