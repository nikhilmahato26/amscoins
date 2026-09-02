const router = require('express').Router()
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createInvestmentSchema } = require('../validation/schemas')
const { investmentCreateLimiter } = require('../config/rateLimits')
const c = require('../controllers/investmentController')

router.post('/', auth, investmentCreateLimiter, validate(createInvestmentSchema), c.create)
router.post('/:id/notify', auth, c.notify)
router.post('/:id/break', auth, c.requestBreak)
router.get('/', auth, c.mine)
// NOTE: must be registered BEFORE '/:id' so 'deposit-gate' isn't captured as an id.
router.get('/deposit-gate', auth, c.depositGate)
router.get('/:id', auth, c.getOne)

module.exports = router
