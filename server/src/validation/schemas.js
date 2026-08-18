const { z } = require('zod')

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  referralCode: z.string().trim().toUpperCase().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const createInvestmentSchema = z.object({
  planKey: z.enum(['silver', 'gold', 'diamond']),
  amount: z.number().int().positive(), // paise
  referralCode: z.string().trim().toUpperCase().optional(),
})

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
const ACCOUNT_RE = /^\d{6,18}$/

// A withdrawal destination: a saved method id, an inline UPI id, or inline bank
// details. Method is inferred from which fields are present (upiId → upi,
// account fields → bank), so the legacy `{ amount, upiId }` shape still works.
const createWithdrawalSchema = z
  .object({
    amount: z.number().int().positive(), // gross paise
    payoutMethodId: z.string().optional(),
    upiId: z.string().trim().min(3).optional(),
    accountName: z.string().trim().min(2).max(80).optional(),
    accountNumber: z.string().trim().regex(ACCOUNT_RE, 'Enter a valid account number').optional(),
    ifsc: z.string().trim().toUpperCase().regex(IFSC_RE, 'Enter a valid IFSC code').optional(),
  })
  .refine(
    (v) => !!v.payoutMethodId || !!v.upiId || !!(v.accountName && v.accountNumber && v.ifsc),
    { message: 'Provide a UPI id, bank details, or a saved payout method' }
  )

// Adding a saved payout method to the user's profile.
const payoutMethodSchema = z
  .object({
    type: z.enum(['upi', 'bank']),
    label: z.string().trim().max(40).optional(),
    upiId: z.string().trim().min(3).optional(),
    accountName: z.string().trim().min(2).max(80).optional(),
    accountNumber: z.string().trim().regex(ACCOUNT_RE, 'Enter a valid account number').optional(),
    ifsc: z.string().trim().toUpperCase().regex(IFSC_RE, 'Enter a valid IFSC code').optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((v) => (v.type === 'upi' ? !!v.upiId : !!(v.accountName && v.accountNumber && v.ifsc)), {
    message: 'Provide complete details for the selected payout type',
  })

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().min(7).max(20).regex(/^[0-9+\-\s]+$/, 'Enter a valid phone number').optional(),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined, {
    message: 'Provide at least one field to update',
  })

const adjustWalletSchema = z.object({
  amount: z.number().int().positive(),
  direction: z.enum(['credit', 'debit']),
  note: z.string().optional(),
})

const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(2000),
})

const resolveTicketSchema = z.object({
  adminNote: z.string().trim().max(1000).optional(),
})

const forgotPasswordSchema = z.object({ email: z.string().email() })
const verifyOtpSchema = z.object({ email: z.string().email(), otp: z.string().regex(/^\d{6}$/) })
const resetPasswordSchema = z.object({ resetToken: z.string().min(10), password: z.string().min(6) })

const updateSettingsSchema = z
  .object({
    inrThresholdPaise: z.number().int().min(0).optional(),
    cycleDurationHours: z.number().int().min(1).optional(),
    autoRejectHours: z.number().int().min(1).optional(),
    usdtTrc20Address: z.string().trim().optional(),
    usdtBep20Address: z.string().trim().optional(),
    whatsappNumber: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .optional(),
    telegramUsername: z
      .string()
      .transform((v) => v.trim().replace(/^@/, ''))
      .optional(),
    methods: z
      .object({
        usdtCrypto: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
        telegram: z.boolean().optional(),
        inrQr: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  })

const returnRejectSchema = z.object({
  reason: z.string().min(1),
  amount: z.number().int().min(0),
})

const bulkApproveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID required'),
})

module.exports = {
  registerSchema,
  loginSchema,
  createInvestmentSchema,
  returnRejectSchema,
  createWithdrawalSchema,
  payoutMethodSchema,
  updateProfileSchema,
  updateSettingsSchema,
  supportTicketSchema,
  resolveTicketSchema,
  adjustWalletSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  bulkApproveSchema,
}
