const router = require('express').Router()
const validate = require('../middleware/validate')
const auth = require('../middleware/auth')
const { registerSchema, loginSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } = require('../validation/schemas')
const { registerLimiter, loginLimiter, forgotPasswordLimiter, otpVerifyLimiter } = require('../config/rateLimits')
const c = require('../controllers/authController')
const { passport, googleGuard } = require('../config/passport')

router.post('/register', registerLimiter, validate(registerSchema), c.register)
router.post('/login', loginLimiter, validate(loginSchema), c.login)
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), c.forgotPassword)
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), c.verifyOtp)
router.post('/reset-password', validate(resetPasswordSchema), c.resetPassword)
router.get('/me', auth, c.me)

router.get('/google', googleGuard, (req, res, next) => {
  // Carry the referral code through the Google round-trip via OAuth `state`,
  // so a user who arrived from a referral link keeps their referrer even when
  // they choose "Continue with Google" instead of the email form.
  const ref = typeof req.query.ref === 'string' ? req.query.ref.trim().toUpperCase() : ''
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: ref || undefined,
  })(req, res, next)
})
router.get('/google/callback', googleGuard, c.googleCallback)

module.exports = router
