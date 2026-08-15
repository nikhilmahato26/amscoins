const { Schema, model } = require('mongoose')

const passwordResetSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// TTL: Mongo removes expired records automatically.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = model('PasswordReset', passwordResetSchema)
