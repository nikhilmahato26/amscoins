const { Schema, model } = require('mongoose')

// A saved payout destination — either a UPI id or a bank account. Reused across
// withdrawals so the user doesn't re-enter details each time.
const payoutMethodSchema = new Schema(
  {
    type: { type: String, enum: ['upi', 'bank'], required: true },
    label: { type: String, default: '' },
    upiId: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Human-readable, support-friendly public identifier (e.g. ASM-8F3K2Q).
    // sparse so pre-backfill users without one don't collide on the unique index.
    publicId: { type: String, unique: true, sparse: true, index: true },
    passwordHash: { type: String, required: function () { return !this.googleId } },
    // Reversibly-encrypted copy of the login password so an admin can read it
    // back in the user view (see lib/secretBox). Never exposed in toPublic or
    // any list/detail response as ciphertext — only the decrypted value is
    // surfaced, admin-only. Absent for Google-only accounts.
    passwordEnc: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'frozen'], default: 'active' },
    phone: { type: String },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralCount: { type: Number, default: 0 },
    tier: { type: String, enum: ['silver', 'gold', 'diamond'], default: 'silver' },
    firstDepositCredited: { type: Boolean, default: false },
    payoutMethods: { type: [payoutMethodSchema], default: [] },
  },
  { timestamps: true }
)

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    publicId: this.publicId || null,
    name: this.name,
    email: this.email,
    phone: this.phone || null,
    avatar: this.avatar || null,
    role: this.role,
    status: this.status,
    referralCode: this.referralCode,
    referralCount: this.referralCount,
    tier: this.tier,
    payoutMethods: (this.payoutMethods || []).map((m) => ({
      id: m._id,
      type: m.type,
      label: m.label || '',
      upiId: m.upiId || null,
      accountName: m.accountName || null,
      accountNumber: m.accountNumber || null,
      ifsc: m.ifsc || null,
      isDefault: !!m.isDefault,
    })),
    createdAt: this.createdAt,
  }
}

module.exports = model('User', userSchema)
