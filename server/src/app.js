const express = require('express')
const cors = require('cors')
const httpLogger = require('./middleware/httpLogger')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { passport } = require('./config/passport')

const app = express()
// Trust exactly one hop: the nginx reverse proxy on the same VPS (see
// deploy/nginx/amscoins.conf, which sets X-Forwarded-For). Without this,
// req.ip resolves to nginx's own address for every request, so the IP-keyed
// rate limiters in config/rateLimits.js (register/login) would put every
// visitor behind the proxy in the same bucket instead of their real IP.
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())
app.use(passport.initialize())
app.use(httpLogger)

app.use('/api', require('./routes'))

app.use(notFound)
app.use(errorHandler)

module.exports = app
