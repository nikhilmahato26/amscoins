const router = require('express').Router()
const multer = require('multer')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { updateProfileSchema, payoutMethodSchema } = require('../validation/schemas')
const c = require('../controllers/userController')

// In-memory storage: the buffer is streamed straight to Cloudinary, never
// written to disk. 5 MB cap, images only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true)
    cb(new Error('Only image files are allowed'))
  },
})

router.use(auth)

router.patch('/me', validate(updateProfileSchema), c.updateMe)
router.post('/me/avatar', upload.single('file'), c.uploadAvatar)

router.post('/me/payout-methods', validate(payoutMethodSchema), c.addPayoutMethod)
router.delete('/me/payout-methods/:id', c.deletePayoutMethod)
router.patch('/me/payout-methods/:id/default', c.setDefaultPayoutMethod)
router.post('/me/celebration-seen', c.markCelebrationSeen)

module.exports = router
