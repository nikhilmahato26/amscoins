'use strict'
/**
 * seed-referrals.cjs
 *
 * Simulates the real referral flow:
 *   1. Creates a dummy "user two" with referredBy = user one (bhaveshsolminde@gmail.com)
 *   2. Creates an approved ₹2,000 Silver investment for user two
 *   3. Credits 3% of ₹2,000 = ₹60 as referral_bonus to user one's wallet
 *   4. Bumps user one's referralCount
 *
 * Run multiple times to test aggregate totals — each run creates a NEW dummy user
 * with a fresh deposit, so the bonus accumulates as separate transactions.
 *
 * Usage:
 *   node seed-referrals.cjs [referrer_email] [deposit_rupees]
 *
 * Defaults:
 *   referrer_email = bhaveshsolminde@gmail.com
 *   deposit_rupees = 2000  (₹2,000 → ₹60 bonus at 3%)
 *
 * Uses MONGO_URI from .env — no hardcoded credentials.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const crypto = require('crypto')

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('Missing MONGO_URI in .env')
  process.exit(1)
}

const { Schema } = mongoose

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, default: 'user' },
    status: { type: String, default: 'active' },
    referralCode: { type: String, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralCount: { type: Number, default: 0 },
    tier: { type: String, default: 'silver' },
    firstDepositCredited: { type: Boolean, default: false },
  },
  { strict: false, timestamps: true }
)

const WalletSchema = new Schema(
  { user: { type: Schema.Types.ObjectId, ref: 'User', unique: true }, balance: { type: Number, default: 0 } },
  { strict: false }
)

const TxnSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    type: String,
    direction: String,
    amount: Number,
    status: { type: String, default: 'settled' },
    note: { type: String, default: '' },
    actor: { type: String, default: 'system' },
    ref: { type: Schema.Types.ObjectId },
  },
  { strict: false, timestamps: true }
)

const InvestmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    planKey: String,
    amount: Number,
    returnPct: Number,
    installmentPcts: { type: [Number], default: [10, 10, 10] },
    expectedReturn: Number,
    referenceCode: { type: String, unique: true },
    referralCodeUsed: { type: String, default: null },
    isFirstDeposit: { type: Boolean, default: true },
    status: { type: String, default: 'active' },
    startAt: Date,
    maturesAt: Date,
  },
  { strict: false, timestamps: true }
)

const User = mongoose.models.User || mongoose.model('User', UserSchema)
const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema)
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TxnSchema)
const Investment = mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema)

function uid() { return crypto.randomBytes(4).toString('hex').toUpperCase() }
function refCode() { return 'ASM-' + crypto.randomBytes(4).toString('hex').toUpperCase() }
function hoursFromNow(h) { return new Date(Date.now() + h * 3_600_000) }

async function getOrCreateWallet(userId) {
  let w = await Wallet.findOne({ user: userId })
  if (!w) w = await Wallet.create({ user: userId, balance: 0 })
  return w
}

async function run() {
  const [, , referrerEmail, depositArg] = process.argv
  const email = referrerEmail ?? 'bhaveshsolminde@gmail.com'
  const depositRupees = Number(depositArg ?? 2000)
  const depositPaise = depositRupees * 100
  const bonusPaise = Math.round((depositPaise * 3) / 100)

  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  // ── 1. Find referrer (user one) ───────────────────────────────────────────
  const referrer = await User.findOne({ email })
  if (!referrer) {
    console.error(`Referrer not found: ${email}`)
    process.exit(1)
  }
  console.log(`Referrer (user one): ${referrer.name} <${referrer.email}> (${referrer._id})`)

  // ── 2. Create dummy user two ──────────────────────────────────────────────
  const dummyId = uid()
  const dummy = await User.create({
    name: `Dummy User ${dummyId}`,
    email: `dummy-${dummyId.toLowerCase()}@test.amscoins.com`,
    passwordHash: 'x', // never logs in
    referralCode: `DUM-${dummyId}`,
    referredBy: referrer._id,
    referralCodeUsed: referrer.referralCode,
    firstDepositCredited: true, // mark as already processed (we credit manually below)
    role: 'user',
    status: 'active',
    tier: 'silver',
  })
  console.log(`Created dummy user two: ${dummy.name} <${dummy.email}>`)

  // ── 3. Create active investment for dummy user ────────────────────────────
  const inv = await Investment.create({
    user: dummy._id,
    planKey: 'silver',
    amount: depositPaise,
    returnPct: 30,
    installmentPcts: [10, 10, 10],
    expectedReturn: Math.round(depositPaise * 1.30),
    referenceCode: refCode(),
    referralCodeUsed: referrer.referralCode,
    isFirstDeposit: true,
    status: 'active',
    startAt: new Date(),
    maturesAt: hoursFromNow(72),
  })
  console.log(`Investment created: ₹${depositRupees} Silver (${inv.referenceCode})`)

  // ── 4. Credit 3% referral bonus to referrer's wallet ─────────────────────
  console.log(`Bonus: 3% of ₹${depositRupees} = ₹${bonusPaise / 100}`)

  await getOrCreateWallet(referrer._id)
  await Wallet.updateOne({ user: referrer._id }, { $inc: { balance: bonusPaise } })

  await Transaction.create({
    user: referrer._id,
    type: 'referral_bonus',
    direction: 'credit',
    amount: bonusPaise,
    status: 'settled',
    note: `Referral bonus — ${dummy.name} deposited ₹${depositRupees}`,
    actor: 'system',
    ref: dummy._id,
  })

  // ── 5. Increment referrer's referralCount ─────────────────────────────────
  await User.updateOne({ _id: referrer._id }, { $inc: { referralCount: 1 } })

  const updatedWallet = await Wallet.findOne({ user: referrer._id })
  const updatedUser = await User.findById(referrer._id)
  console.log(`\nDone!`)
  console.log(`  Referrer referral count: ${updatedUser.referralCount}`)
  console.log(`  Referrer wallet balance: ₹${(updatedWallet.balance / 100).toFixed(2)}`)
  console.log(`\nRefresh the app — the referral bonus dialog should appear on the Home page.`)
  console.log(`The dialog will show ₹${bonusPaise / 100} (3% of ₹${depositRupees}).`)

  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
