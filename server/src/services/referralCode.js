const User = require('../models/User')

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (no 0/O/1/I)

function randomCode(len = 6) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

async function generateUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = randomCode()
    if (!(await User.exists({ referralCode: code }))) return code
  }
  throw new Error('Could not generate unique referral code')
}

module.exports = { generateUniqueCode, randomCode }
