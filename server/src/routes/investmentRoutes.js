const router = require('express').Router()
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createInvestmentSchema } = require('../validation/schemas')
const c = require('../controllers/investmentController')

router.post('/', auth, validate(createInvestmentSchema), c.create)
router.get('/', auth, c.mine)

module.exports = router
