const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Wallet = require('../models/Wallet')
const env = require('../config/env')
const { generateUniqueCode } = require('../services/referralCode')

async function seedAdmin() {
  if (await User.exists({ email: env.ADMIN_EMAIL.toLowerCase() })) return
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10)
  const referralCode = await generateUniqueCode()
  const admin = await User.create({
    name: 'ASM Admin',
    email: env.ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    referralCode,
  })
  await Wallet.create({ user: admin._id, balance: 0 })
  console.log(`Seeded admin: ${env.ADMIN_EMAIL}`)
}

module.exports = { seedAdmin }
