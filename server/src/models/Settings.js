'use strict'

const { Schema, model } = require('mongoose')

const methodsSchema = new Schema(
  {
    usdtCrypto: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    telegram: { type: Boolean, default: true },
    inrQr: { type: Boolean, default: true },
  },
  { _id: false }
)

const settingsSchema = new Schema(
  {
    // A fixed key guarantees a single shared document for all admins.
    key: { type: String, default: 'global', unique: true },

    inrThresholdPaise: { type: Number, default: 200000, min: 0 },

    cycleDurationHours: { type: Number, default: 24, min: 1 },
    autoRejectHours: { type: Number, default: 8, min: 1 },

    // Auto-deposit: the mirror of auto-reject. After this many hours a still-
    // pending deposit is AUTO-APPROVED (advanced to the next step) instead of
    // rejected. Money-sensitive (approving treats the deposit as paid), so it
    // defaults OFF — an admin must opt in. If auto-deposit fires before
    // auto-reject, the atomic status guard means auto-deposit wins.
    autoDepositHours: { type: Number, default: 24, min: 1 },

    // Deposit cooldown: after a user's deposit is APPROVED, they must wait this
    // many hours before starting another. A user with a still-pending deposit is
    // always blocked regardless of this value. 0 disables the post-approval
    // cooldown (the pending-lock still applies).
    depositCooldownHours: { type: Number, default: 6, min: 0 },

    // Withdrawal cooldown: after a user INITIATES a withdrawal, they must wait
    // this many hours before initiating another (rate-limit / anti-spam). The
    // anchor is the user's most recent withdrawal's `createdAt`, ANY status —
    // a rejected/failed withdrawal still consumes the window (strictest).
    // 0 disables the cooldown.
    withdrawalCooldownHours: { type: Number, default: 12, min: 0 },

    // Admin on/off switches for the automations. auto-reject / auto-pay default
    // on (behaviour unchanged until flipped); auto-deposit defaults off because
    // auto-approving a deposit is money-sensitive. Gating happens in the service
    // handlers so already-scheduled jobs also respect a flip.
    autoRejectEnabled: { type: Boolean, default: true },
    autoDepositEnabled: { type: Boolean, default: false },
    autoPayEnabled: { type: Boolean, default: true },

    inrQrUrl: { type: String, default: '' },

    usdtTrc20Address: { type: String, default: '' },
    usdtBep20Address: { type: String, default: '' },
    usdtTrc20QrUrl: { type: String, default: '' },
    usdtBep20QrUrl: { type: String, default: '' },

    whatsappNumber: { type: String, default: '' },
    telegramUsername: { type: String, default: '' },

    // INR value of 1 USDT — admin keeps this in sync with market rate
    usdtRateInr: { type: Number, default: 96, min: 1 },

    methods: { type: methodsSchema, default: () => ({}) },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

// Find-or-create the one shared document.
settingsSchema.statics.getSingleton = async function getSingleton() {
  const existing = await this.findOne({ key: 'global' })
  if (existing) return existing
  return this.create({ key: 'global' })
}

settingsSchema.methods.toPublic = function toPublic() {
  return {
    inrThresholdPaise: this.inrThresholdPaise,
    cycleDurationHours: this.cycleDurationHours,
    autoRejectHours: this.autoRejectHours,
    autoDepositHours: this.autoDepositHours,
    depositCooldownHours: this.depositCooldownHours,
    withdrawalCooldownHours: this.withdrawalCooldownHours,
    autoRejectEnabled: this.autoRejectEnabled,
    autoDepositEnabled: this.autoDepositEnabled,
    autoPayEnabled: this.autoPayEnabled,
    inrQrUrl: this.inrQrUrl,
    usdtTrc20Address: this.usdtTrc20Address,
    usdtBep20Address: this.usdtBep20Address,
    usdtTrc20QrUrl: this.usdtTrc20QrUrl,
    usdtBep20QrUrl: this.usdtBep20QrUrl,
    whatsappNumber: this.whatsappNumber,
    telegramUsername: this.telegramUsername,
    usdtRateInr: this.usdtRateInr,
    methods: {
      usdtCrypto: this.methods.usdtCrypto,
      whatsapp: this.methods.whatsapp,
      telegram: this.methods.telegram,
      inrQr: this.methods.inrQr,
    },
  }
}

module.exports = model('Settings', settingsSchema)
