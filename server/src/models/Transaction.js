const { Schema, model } = require('mongoose')

const txnSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'refund', 'adjustment', 'return'], required: true },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true }, // paise
    status: { type: String, enum: ['pending', 'settled', 'rejected'], default: 'settled' },
    note: { type: String, default: '' },
    actor: { type: String, enum: ['user', 'admin', 'system'], default: 'system' },
    ref: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
)

module.exports = model('Transaction', txnSchema)
