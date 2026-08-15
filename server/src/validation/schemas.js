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

const createWithdrawalSchema = z.object({
  amount: z.number().int().positive(), // gross paise
  upiId: z.string().min(3),
})

const adjustWalletSchema = z.object({
  amount: z.number().int().positive(),
  direction: z.enum(['credit', 'debit']),
  note: z.string().optional(),
})

module.exports = {
  registerSchema,
  loginSchema,
  createInvestmentSchema,
  createWithdrawalSchema,
  adjustWalletSchema,
}
