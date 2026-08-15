const asyncHandler = require('../middleware/asyncHandler')
const authService = require('../services/authService')
const env = require('../config/env')
const { passport } = require('../config/passport')

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body)
  res.status(201).json({ user: user.toPublic(), token })
})

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body)
  res.json({ user: user.toPublic(), token })
})

const me = asyncHandler(async (req, res) => res.json({ user: req.user.toPublic() }))

const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      const reason = encodeURIComponent((err && err.message) || 'google_failed')
      return res.redirect(`${env.FRONTEND_URL}/login?error=${reason}`)
    }
    const token = authService.signToken(user)
    return res.redirect(`${env.FRONTEND_URL}/auth/callback#token=${token}`)
  })(req, res, next)
}

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email)
  res.json({ message: 'If an account exists for that email, a reset code has been sent.' })
})

const verifyOtp = asyncHandler(async (req, res) => {
  const { resetToken } = await authService.verifyResetOtp(req.body.email, req.body.otp)
  res.json({ resetToken })
})

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.resetToken, req.body.password)
  res.json({ message: 'Password updated. You can now sign in.' })
})

module.exports = { register, login, me, googleCallback, forgotPassword, verifyOtp, resetPassword }
