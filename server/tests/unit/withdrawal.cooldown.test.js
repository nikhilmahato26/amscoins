process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Withdrawal = require('../../src/models/Withdrawal')
const Settings = require('../../src/models/Settings')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { credit } = require('../../src/services/walletService')
const { initiateWithdrawal } = require('../../src/services/withdrawalService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function makeFundedUser(balance) {
  const code = await generateUniqueCode()
  const u = await User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
  await credit(u._id, balance, { type: 'adjustment', actor: 'admin' })
  return u
}

test('second withdrawal within the cooldown window is blocked with 429', async () => {
  const s = await Settings.getSingleton()
  s.withdrawalCooldownHours = 12
  await s.save()

  const u = await makeFundedUser(300000)
  await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  await expect(initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })).rejects.toMatchObject({
    statusCode: 429,
  })
  // Only the first withdrawal was recorded; the wallet kept the rest.
  expect(await Withdrawal.countDocuments({ user: u._id })).toBe(1)
})

test('a rejected/failed prior withdrawal still consumes the window', async () => {
  const s = await Settings.getSingleton()
  s.withdrawalCooldownHours = 12
  await s.save()

  const u = await makeFundedUser(300000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  // Force the first one to a terminal non-success state.
  w.status = 'rejected'
  await w.save()

  await expect(initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })).rejects.toMatchObject({
    statusCode: 429,
  })
})

test('after the window has elapsed a new withdrawal is allowed', async () => {
  const s = await Settings.getSingleton()
  s.withdrawalCooldownHours = 12
  await s.save()

  const u = await makeFundedUser(300000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  // Backdate the first withdrawal past the window. `createdAt` is immutable in
  // Mongoose, so bypass the ODM and write through the raw collection.
  await Withdrawal.collection.updateOne(
    { _id: w._id },
    { $set: { createdAt: new Date(Date.now() - 13 * 3600e3) } }
  )

  const second = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  expect(second.gross).toBe(100000)
  expect(await Withdrawal.countDocuments({ user: u._id })).toBe(2)
})

test('cooldown of 0 disables the rate-limit', async () => {
  const s = await Settings.getSingleton()
  s.withdrawalCooldownHours = 0
  await s.save()

  const u = await makeFundedUser(300000)
  await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  const second = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  expect(second.gross).toBe(100000)
  expect(await Withdrawal.countDocuments({ user: u._id })).toBe(2)
})
