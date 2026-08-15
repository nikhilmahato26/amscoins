const express = require('express')
const cors = require('cors')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use(notFound)
app.use(errorHandler)

module.exports = app
