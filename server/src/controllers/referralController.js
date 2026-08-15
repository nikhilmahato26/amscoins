const asyncHandler = require('../middleware/asyncHandler')
const User = require('../models/User')
const env = require('../config/env')

const overview = asyncHandler(async (req, res) => {
  const u = req.user
  const referrals = await User.find({ referredBy: u._id }).select('name createdAt firstDepositCredited')
  const nextTier = u.referralCount < 11 ? 'gold' : u.referralCount < 21 ? 'diamond' : null
  const nextTierAt = u.referralCount < 11 ? 11 : u.referralCount < 21 ? 21 : null
  res.json({
    referralCode: u.referralCode,
    link: `${env.FRONTEND_URL}/?ref=${u.referralCode}`,
    count: u.referralCount,
    tier: u.tier,
    nextTier,
    nextTierAt,
    referrals: referrals.map((r) => ({ name: r.name, joinedAt: r.createdAt, credited: r.firstDepositCredited })),
  })
})

module.exports = { overview }
