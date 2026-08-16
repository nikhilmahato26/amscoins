'use strict'

const asyncHandler = require('../middleware/asyncHandler')
const { ApiError } = require('../middleware/errorHandler')
const { uploadImage, isConfigured } = require('../config/cloudinary')
const logger = require('../lib/logger').child({ service: 'user' })

// PATCH /api/users/me — update the signed-in user's editable profile fields.
const updateMe = asyncHandler(async (req, res) => {
  const user = req.user
  const { name, phone } = req.body
  if (name !== undefined) user.name = name
  if (phone !== undefined) user.phone = phone
  await user.save()
  logger.info('Profile updated', { userId: user._id })
  res.json({ user: user.toPublic() })
})

// POST /api/users/me/avatar — multipart image upload → Cloudinary → avatar URL.
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file provided')
  if (!isConfigured()) {
    logger.error('Avatar upload attempted but Cloudinary is not configured')
    throw new ApiError(503, 'Image uploads are not available right now')
  }

  const result = await uploadImage(req.file.buffer, { publicId: String(req.user._id) })
  req.user.avatar = result.secure_url
  await req.user.save()
  logger.info('Avatar updated', { userId: req.user._id })
  res.json({ user: req.user.toPublic() })
})

// POST /api/users/me/payout-methods — add a saved UPI or bank payout method.
const addPayoutMethod = asyncHandler(async (req, res) => {
  const user = req.user
  const { type, label, upiId, accountName, accountNumber, ifsc, isDefault } = req.body

  const method =
    type === 'bank'
      ? { type, label: label || '', accountName, accountNumber, ifsc }
      : { type, label: label || '', upiId }

  // The first method is always the default; otherwise honour the request.
  const makeDefault = isDefault || user.payoutMethods.length === 0
  if (makeDefault) user.payoutMethods.forEach((m) => { m.isDefault = false })
  method.isDefault = makeDefault

  user.payoutMethods.push(method)
  await user.save()
  logger.info('Payout method added', { userId: user._id, type })
  res.status(201).json({ user: user.toPublic() })
})

// DELETE /api/users/me/payout-methods/:id
const deletePayoutMethod = asyncHandler(async (req, res) => {
  const user = req.user
  const m = user.payoutMethods.id(req.params.id)
  if (!m) throw new ApiError(404, 'Payout method not found')

  const wasDefault = m.isDefault
  user.payoutMethods.pull(req.params.id)
  // Keep a default if any methods remain.
  if (wasDefault && user.payoutMethods.length > 0) user.payoutMethods[0].isDefault = true

  await user.save()
  logger.info('Payout method removed', { userId: user._id })
  res.json({ user: user.toPublic() })
})

// PATCH /api/users/me/payout-methods/:id/default
const setDefaultPayoutMethod = asyncHandler(async (req, res) => {
  const user = req.user
  const m = user.payoutMethods.id(req.params.id)
  if (!m) throw new ApiError(404, 'Payout method not found')

  user.payoutMethods.forEach((x) => { x.isDefault = String(x._id) === String(m._id) })
  await user.save()
  logger.info('Default payout method changed', { userId: user._id })
  res.json({ user: user.toPublic() })
})

module.exports = {
  updateMe,
  uploadAvatar,
  addPayoutMethod,
  deletePayoutMethod,
  setDefaultPayoutMethod,
}
