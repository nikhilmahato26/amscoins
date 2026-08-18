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

    inrQrUrl: { type: String, default: '' },

    usdtTrc20Address: { type: String, default: '' },
    usdtBep20Address: { type: String, default: '' },
    usdtTrc20QrUrl: { type: String, default: '' },
    usdtBep20QrUrl: { type: String, default: '' },

    whatsappNumber: { type: String, default: '' },
    telegramUsername: { type: String, default: '' },

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
    inrQrUrl: this.inrQrUrl,
    usdtTrc20Address: this.usdtTrc20Address,
    usdtBep20Address: this.usdtBep20Address,
    usdtTrc20QrUrl: this.usdtTrc20QrUrl,
    usdtBep20QrUrl: this.usdtBep20QrUrl,
    whatsappNumber: this.whatsappNumber,
    telegramUsername: this.telegramUsername,
    methods: {
      usdtCrypto: this.methods.usdtCrypto,
      whatsapp: this.methods.whatsapp,
      telegram: this.methods.telegram,
      inrQr: this.methods.inrQr,
    },
  }
}

module.exports = model('Settings', settingsSchema)
