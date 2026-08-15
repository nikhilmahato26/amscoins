const router = require('express').Router()
const validate = require('../middleware/validate')
const auth = require('../middleware/auth')
const { registerSchema, loginSchema } = require('../validation/schemas')
const { registerLimiter, loginLimiter } = require('../config/rateLimits')
const c = require('../controllers/authController')

router.post('/register', registerLimiter, validate(registerSchema), c.register)
router.post('/login', loginLimiter, validate(loginSchema), c.login)
router.get('/me', auth, c.me)

module.exports = router
