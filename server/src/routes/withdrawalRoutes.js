const router = require('express').Router()
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createWithdrawalSchema } = require('../validation/schemas')
const { withdrawalCreateLimiter } = require('../config/rateLimits')
const c = require('../controllers/withdrawalController')

router.post('/', auth, withdrawalCreateLimiter, validate(createWithdrawalSchema), c.create)
router.get('/', auth, c.mine)

module.exports = router
