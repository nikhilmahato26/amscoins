const asyncHandler = require('../middleware/asyncHandler')
const authService = require('../services/authService')

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body)
  res.status(201).json({ user: user.toPublic(), token })
})

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body)
  res.json({ user: user.toPublic(), token })
})

const me = asyncHandler(async (req, res) => res.json({ user: req.user.toPublic() }))

module.exports = { register, login, me }
