const { ApiError } = require('./errorHandler')

module.exports = (req, _res, next) =>
  req.user && req.user.role === 'admin' ? next() : next(new ApiError(403, 'Admin only'))
