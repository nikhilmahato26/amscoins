class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

const notFound = (_req, res) => res.status(404).json({ error: 'Not found' })

const errorHandler = (err, _req, res, _next) => {
  const code = err.statusCode || 500
  if (code >= 500) console.error(err)
  res.status(code).json({ error: err.message || 'Server error' })
}

module.exports = { ApiError, notFound, errorHandler }
