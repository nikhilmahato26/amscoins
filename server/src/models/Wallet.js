const { Schema, model } = require('mongoose')

const walletSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    balance: { type: Number, default: 0 }, // paise
  },
  { timestamps: true }
)

module.exports = model('Wallet', walletSchema)
