const { Schema, model } = require('mongoose')

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'frozen'], default: 'active' },
    phone: { type: String },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralCount: { type: Number, default: 0 },
    tier: { type: String, enum: ['silver', 'gold', 'diamond'], default: 'silver' },
    firstDepositCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    referralCode: this.referralCode,
    referralCount: this.referralCount,
    tier: this.tier,
    createdAt: this.createdAt,
  }
}

module.exports = model('User', userSchema)
