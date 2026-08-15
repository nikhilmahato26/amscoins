const router = require('express').Router()
const auth = require('../middleware/auth')
const { overview } = require('../controllers/referralController')

router.get('/', auth, overview)

module.exports = router
