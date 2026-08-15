const router = require('express').Router()
const validate = require('../middleware/validate')
const auth = require('../middleware/auth')
const { registerSchema, loginSchema } = require('../validation/schemas')
const { registerLimiter, loginLimiter } = require('../config/rateLimits')
const c = require('../controllers/authController')
const { passport, googleGuard } = require('../config/passport')

router.post('/register', registerLimiter, validate(registerSchema), c.register)
router.post('/login', loginLimiter, validate(loginSchema), c.login)
router.get('/me', auth, c.me)

router.get(
  '/google',
  googleGuard,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)
router.get('/google/callback', googleGuard, c.googleCallback)

module.exports = router
