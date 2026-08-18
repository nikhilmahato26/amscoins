const { Schema, model } = require('mongoose')

const withdrawalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gross: { type: Number, required: true }, // paise requested
    tds: { type: Number, required: true }, // paise
    net: { type: Number, required: true }, // paise paid to bank
    method: { type: String, enum: ['upi', 'bank'], default: 'upi' },
    // Present when method === 'upi'.
    upiId: { type: String, required: function () { return this.method === 'upi' } },
    // Present when method === 'bank'.
    accountName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'rejected'], default: 'pending' },
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    processedAt: { type: Date, default: null },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    failureReason: { type: String, default: null },
    idempotencyKey: { type: String, sparse: true, index: true },
    note: { type: String },
  },
  { timestamps: true }
)

module.exports = model('Withdrawal', withdrawalSchema)
