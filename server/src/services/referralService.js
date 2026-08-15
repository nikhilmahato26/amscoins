const User = require('../models/User')
const { tierForCount } = require('./tierService')

/**
 * Credit the referrer when `depositUser` completes their FIRST deposit.
 * Idempotent: guarded by the `firstDepositCredited` flag so a re-approval
 * can never double-count. Runs inside the caller's transaction `session`.
 */
async function creditReferralIfFirst(depositUser, session) {
  if (depositUser.firstDepositCredited) return { credited: false, referrerId: null }

  // Atomically flip the flag — only the first caller wins the update.
  const flipped = await User.findOneAndUpdate(
    { _id: depositUser._id, firstDepositCredited: false },
    { $set: { firstDepositCredited: true } },
    { returnDocument: 'after', session }
  )
  if (!flipped) return { credited: false, referrerId: null }
  if (!flipped.referredBy) return { credited: true, referrerId: null }

  const referrer = await User.findOneAndUpdate(
    { _id: flipped.referredBy },
    { $inc: { referralCount: 1 } },
    { returnDocument: 'after', session }
  )
  if (referrer) {
    const newTier = tierForCount(referrer.referralCount)
    if (newTier !== referrer.tier) {
      referrer.tier = newTier
      await referrer.save({ session })
    }
  }
  return { credited: true, referrerId: flipped.referredBy }
}

module.exports = { creditReferralIfFirst }
