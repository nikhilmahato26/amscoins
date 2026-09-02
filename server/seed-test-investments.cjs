'use strict'
/**
 * seed-test-investments.cjs
 *
 * Creates 2 active Silver installment investments for testing:
 *   Investment A — Day 1 installment is 'available' (ready for admin to approve)
 *   Investment B — Day 2 installment is 'available' (ready for admin to approve)
 *
 * Usage:
 *   node seed-test-investments.cjs [email]
 *
 * Default email: bhaveshsolminde@gmail.com
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

const UserSchema = new Schema({ name: String, email: { type: String, unique: true } }, { strict: false })
const InvestmentSchema = new Schema({
  user:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  planKey:         { type: String, required: true },
  amount:          { type: Number, required: true },
  returnPct:       { type: Number, required: true },
  installmentPcts: { type: [Number], default: [] },
  expectedReturn:  { type: Number, required: true },
  referenceCode:   { type: String, required: true, unique: true },
  status:          { type: String, default: 'active' },
  startAt:         Date,
  maturesAt:       Date,
  installments: [
    {
      day:       Number,
      pct:       Number,
      amount:    Number,
      status:    { type: String, default: 'scheduled' },
      maturesAt: Date,
      _id:       false,
    },
  ],
}, { strict: false, timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)
const Investment = mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema)

function refCode() {
  return 'ASM-' + crypto.randomBytes(4).toString('hex').toUpperCase()
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 3_600_000)
}
function hoursAgo(h) {
  return new Date(Date.now() - h * 3_600_000)
}

async function run() {
  const email = process.argv[2] ?? 'bhaveshsolminde@gmail.com'

  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const user = await User.findOne({ email })
  if (!user) { console.error(`User not found: ${email}`); process.exit(1) }
  console.log(`Found user: ${user.name} (${user._id})`)

  // Silver plan: 30% return, pcts [10,10,10], 72h total
  // amount: ₹1,000 = 100_000 paise
  const amount = 100_000
  const returnPct = 30
  const installmentPcts = [10, 10, 10]
  const expectedReturn = Math.round(amount * (1 + returnPct / 100))

  // ── Investment A: Day 1 available, Day 2 & 3 scheduled ────────────────────
  // Simulates: started 24h ago, Day 1 already matured, Days 2&3 still pending
  const startA = hoursAgo(24)
  const invA = await Investment.create({
    user: user._id,
    planKey: 'silver',
    amount,
    returnPct,
    installmentPcts,
    expectedReturn,
    referenceCode: refCode(),
    status: 'active',
    startAt: startA,
    maturesAt: new Date(startA.getTime() + 72 * 3_600_000),
    installments: [
      { day: 1, pct: 10, amount: Math.round(amount * 0.10), status: 'available',  maturesAt: hoursAgo(1) },
      { day: 2, pct: 10, amount: Math.round(amount * 0.10), status: 'scheduled',  maturesAt: hoursFromNow(23) },
      { day: 3, pct: 10, amount: Math.round(amount * 0.10), status: 'scheduled',  maturesAt: hoursFromNow(47) },
    ],
  })
  console.log(`Investment A (Day 1 available): ${invA.referenceCode}`)

  // ── Investment B: Day 1 paid, Day 2 available, Day 3 scheduled ───────────
  // Simulates: started 48h ago, Day 1 already approved, Day 2 matured+ready
  const startB = hoursAgo(48)
  const invB = await Investment.create({
    user: user._id,
    planKey: 'silver',
    amount,
    returnPct,
    installmentPcts,
    expectedReturn,
    referenceCode: refCode(),
    status: 'active',
    startAt: startB,
    maturesAt: new Date(startB.getTime() + 72 * 3_600_000),
    installments: [
      { day: 1, pct: 10, amount: Math.round(amount * 0.10), status: 'paid',       maturesAt: hoursAgo(25), creditedAt: hoursAgo(24) },
      { day: 2, pct: 10, amount: Math.round(amount * 0.10), status: 'available',  maturesAt: hoursAgo(1) },
      { day: 3, pct: 10, amount: Math.round(amount * 0.10), status: 'scheduled',  maturesAt: hoursFromNow(23) },
    ],
  })
  console.log(`Investment B (Day 2 available): ${invB.referenceCode}`)

  console.log('\nDone! Both investments are now active in the DB.')
  console.log('The admin Installments tab should show them under "Running Investments"')
  console.log('and "Ready to Approve" should list 2 rows (Day 1 + Day 2).')

  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
