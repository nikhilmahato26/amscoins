'use strict'

const asyncHandler = require('../middleware/asyncHandler')
const coinIndexService = require('../services/coinIndexService')

exports.getIndex = asyncHandler(async (req, res) => {
  const range = req.query.range || '24h'
  res.json(await coinIndexService.getSeries(range))
})
