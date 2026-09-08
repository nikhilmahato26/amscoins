'use strict'

const router = require('express').Router()
const auth = require('../middleware/auth')
const c = require('../controllers/coinController')

router.use(auth)
router.get('/index', c.getIndex)

module.exports = router
