const router = require('express').Router()
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { supportTicketSchema } = require('../validation/schemas')
const c = require('../controllers/supportController')

router.use(auth)

router.post('/', validate(supportTicketSchema), c.create)
router.get('/mine', c.mine)

module.exports = router
