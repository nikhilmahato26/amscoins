const router = require('express').Router()
const validate = require('../middleware/validate')
const auth = require('../middleware/auth')
const { registerSchema, loginSchema } = require('../validation/schemas')
const c = require('../controllers/authController')

router.post('/register', validate(registerSchema), c.register)
router.post('/login', validate(loginSchema), c.login)
router.get('/me', auth, c.me)

module.exports = router
