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

/** Human-readable public account id, e.g. ASM-8F3K2Q. Unique across users. */
async function generateUniquePublicId() {
  for (let i = 0; i < 10; i++) {
    const publicId = `ASM-${randomCode(6)}`
    if (!(await User.exists({ publicId }))) return publicId
  }
  throw new Error('Could not generate unique public id')
}

module.exports = { generateUniqueCode, generateUniquePublicId, randomCode }
