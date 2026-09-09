const router = require('express').Router()
const multer = require('multer')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createInvestmentSchema } = require('../validation/schemas')
const c = require('../controllers/investmentController')

// In-memory storage: the buffer is streamed straight to Cloudinary, never
// written to disk. 5 MB cap, raster images only (SVG excluded — SVGs can
// carry active script and would be stored as-is on Cloudinary).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml')
      return cb(null, true)
    cb(new Error('Only raster image files are allowed (SVG not permitted)'))
  },
})

// No rate limiter here on purpose. This endpoint is not "one deposit" — the pay
// screen calls it every time the user taps a payment method, and opening the
// INR-QR / USDT-QR screen goes through the same call ('inr-qr' is a pseudo-method
// that reuses createInvestment). A 3-per-hour cap therefore blocked users who
// were only browsing payment options or reopening the QR. Abuse is still bounded
// by the deposit gate (one submitted deposit at a time + depositCooldownHours),
// by createInvestment deleting the previous unnotified draft rather than piling
// rows up, and by nginx's 10 r/s per-IP cap on /api/.
router.post('/', auth, validate(createInvestmentSchema), c.create)
router.post('/:id/notify', auth, c.notify)
router.post('/:id/screenshot', auth, upload.single('file'), c.uploadScreenshot)
router.post('/:id/break', auth, c.requestBreak)
router.get('/', auth, c.mine)
// NOTE: must be registered BEFORE '/:id' so 'deposit-gate' isn't captured as an id.
router.get('/deposit-gate', auth, c.depositGate)
router.get('/:id', auth, c.getOne)

module.exports = router
