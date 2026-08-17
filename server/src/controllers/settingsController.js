'use strict'

const asyncHandler = require('../middleware/asyncHandler')
const { ApiError } = require('../middleware/errorHandler')
const Settings = require('../models/Settings')
const cloudinaryConfig = require('../config/cloudinary')

// Maps a URL :key to the Settings field that stores its Cloudinary URL.
const IMAGE_KEYS = {
  'inr-qr': 'inrQrUrl',
  'usdt-trc20-qr': 'usdtTrc20QrUrl',
  'usdt-bep20-qr': 'usdtBep20QrUrl',
}

const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.getSingleton()
  res.json({ settings: settings.toPublic() })
})

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton()

  const { methods, ...scalars } = req.body
  Object.assign(settings, scalars)
  if (methods) settings.methods = { ...settings.methods.toObject(), ...methods }
  settings.updatedBy = req.user._id

  await settings.save()
  res.json({ settings: settings.toPublic() })
})

const uploadSettingsImage = asyncHandler(async (req, res) => {
  const field = IMAGE_KEYS[req.params.key]
  if (!field) throw new ApiError(400, 'Unknown image key')
  if (!req.file) throw new ApiError(400, 'No image file provided')
  if (!cloudinaryConfig.isConfigured()) throw new ApiError(503, 'Image uploads are not available right now')

  const result = await cloudinaryConfig.uploadImage(req.file.buffer, {
    folder: 'asmcoins/settings',
    publicId: req.params.key,
    // QR/barcode must stay square-ish and uncropped — no face gravity.
    transformation: [{ width: 1024, crop: 'limit' }],
  })

  const settings = await Settings.getSingleton()
  settings[field] = result.secure_url
  settings.updatedBy = req.user._id
  await settings.save()

  res.json({ settings: settings.toPublic() })
})

module.exports = { getSettings, updateSettings, uploadSettingsImage }
