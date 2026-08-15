'use strict'

const User = require('../models/User')
const { tierForCount } = require('./tierService')
const logger = require('../lib/logger').child({ service: 'referral' })

/**
 * Credit the referrer when `depositUser` completes their FIRST deposit.
 * Idempotent: guarded by the `firstDepositCredited` flag so a re-approval
 * can never double-count. Runs inside the caller's transaction `session`.
 */
async function creditReferralIfFirst(depositUser, session) {
  if (depositUser.firstDepositCredited) {
    logger.debug('Referral skip — already credited for this user', {
      depositUserId: depositUser._id,
    })
    return { credited: false, referrerId: null }
  }

  // Atomically flip the flag — only the first caller wins the update.
  const flipped = await User.findOneAndUpdate(
    { _id: depositUser._id, firstDepositCredited: false },
    { $set: { firstDepositCredited: true } },
    { returnDocument: 'after', session }
  )
  if (!flipped) {
    logger.debug('Referral skip — concurrent approval already flipped the flag', {
      depositUserId: depositUser._id,
    })
    return { credited: false, referrerId: null }
  }

  if (!flipped.referredBy) {
    logger.debug('Referral skip — user has no referrer', { depositUserId: depositUser._id })
    return { credited: true, referrerId: null }
  }

  const referrer = await User.findOneAndUpdate(
    { _id: flipped.referredBy },
    { $inc: { referralCount: 1 } },
    { returnDocument: 'after', session }
  )

  let tierChange = false
  if (referrer) {
    const newTier = tierForCount(referrer.referralCount)
    if (newTier !== referrer.tier) {
      referrer.tier = newTier
      await referrer.save({ session })
      tierChange = true
    }

    logger.info('Referral credited', {
      referrerId: referrer._id,
      depositUserId: depositUser._id,
      newReferralCount: referrer.referralCount,
      tierChange,
      newTier: referrer.tier,
    })
  }

  return { credited: true, referrerId: flipped.referredBy }
}

module.exports = { creditReferralIfFirst }
