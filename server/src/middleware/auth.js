const jwt = require('jsonwebtoken')
const User = require('../models/User')
const env = require('../config/env')
const { ApiError } = require('./errorHandler')

module.exports = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw new ApiError(401, 'Authentication required')
    const payload = jwt.verify(token, env.JWT_SECRET)
    const user = await User.findById(payload.id)
    if (!user) throw new ApiError(401, 'Invalid token')
    req.user = user
    next()
  } catch (e) {
    next(e.statusCode ? e : new ApiError(401, 'Invalid token'))
  }
}
