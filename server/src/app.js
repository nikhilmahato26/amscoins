const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const httpLogger = require('./middleware/httpLogger')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { passport } = require('./config/passport')
const env = require('./config/env')

const app = express()
// Trust exactly one hop: the nginx reverse proxy on the same VPS (see
// deploy/nginx/amscoins.conf, which sets X-Forwarded-For). Without this,
// req.ip resolves to nginx's own address for every request, so the IP-keyed
// rate limiters in config/rateLimits.js (register/login) would put every
// visitor behind the proxy in the same bucket instead of their real IP.
app.set('trust proxy', 1)
app.use(helmet())

// Production: set CORS_ORIGINS (comma-separated) or FRONTEND_URL to the real
// frontend origin(s). In development, localhost:5173 and :4000 are also allowed.
const allowedOrigins = (() => {
  const list = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [env.FRONTEND_URL]
  if (env.NODE_ENV !== 'production') {
    list.push('http://localhost:5173', 'http://localhost:4000')
  }
  return [...new Set(list)]
})()

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server, health checks, mobile apps (no Origin header)
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error(`CORS: origin not allowed — ${origin}`))
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '100kb' }))

// Express 5: req.query is a read-only getter; express-mongo-sanitize's default
// middleware mutates req.query in place and throws on Express 5. Sanitize only
// req.body — the app already zod-validates all inputs (belt-and-suspenders).
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  next()
})

function sanitizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeObject)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k]) => !k.startsWith('$') && !k.includes('.'))
        .map(([k, v]) => [k, sanitizeObject(v)])
    )
  }
  return obj
}

app.use(passport.initialize())
app.use(httpLogger)

app.use('/api', require('./routes'))

app.use(notFound)
app.use(errorHandler)

module.exports = app
