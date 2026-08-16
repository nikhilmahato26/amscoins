const { Schema, model } = require('mongoose')

const supportTicketSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publicRef: { type: String, required: true, unique: true }, // e.g. SUP-8F3K2Q
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    adminNote: { type: String, default: '' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
)

supportTicketSchema.methods.toPublic = function () {
  return {
    id: this._id,
    publicRef: this.publicRef,
    subject: this.subject,
    message: this.message,
    status: this.status,
    adminNote: this.adminNote || '',
    resolvedAt: this.resolvedAt || null,
    createdAt: this.createdAt,
  }
}

module.exports = model('SupportTicket', supportTicketSchema)
