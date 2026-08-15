const express = require('express')
const cors = require('cors')
const httpLogger = require('./middleware/httpLogger')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()
app.use(cors())
app.use(express.json())
app.use(httpLogger)

app.use('/api', require('./routes'))

app.use(notFound)
app.use(errorHandler)

module.exports = app
