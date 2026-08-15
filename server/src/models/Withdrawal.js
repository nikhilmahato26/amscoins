const { Schema, model } = require('mongoose')

const withdrawalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gross: { type: Number, required: true }, // paise requested
    tds: { type: Number, required: true }, // paise
    net: { type: Number, required: true }, // paise paid to bank
    upiId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { timestamps: true }
)

module.exports = model('Withdrawal', withdrawalSchema)
