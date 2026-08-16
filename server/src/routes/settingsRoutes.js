'use strict'

const router = require('express').Router()
const multer = require('multer')
const auth = require('../middleware/auth')
const requireAdmin = require('../middleware/requireAdmin')
const validate = require('../middleware/validate')
const { updateSettingsSchema } = require('../validation/schemas')
const c = require('../controllers/settingsController')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true)
    cb(new Error('Only image files are allowed'))
  },
})

// Public — the payment page reads this without a session.
router.get('/', c.getSettings)

// Admin only.
router.put('/', auth, requireAdmin, validate(updateSettingsSchema), c.updateSettings)
router.post('/images/:key', auth, requireAdmin, upload.single('file'), c.uploadSettingsImage)

module.exports = router
