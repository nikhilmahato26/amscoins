process.env.JWT_SECRET = 'test'; process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { topInvestors } = require('../../src/services/leaderboardService')

beforeAll(setupDb); afterEach(clearDb); afterAll(teardownDb)

async function investor(name, amount, when = new Date()) {
  const code = await generateUniqueCode()
  const u = await User.create({ name, email: `${name}${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
  await Investment.create({ user: u._id, planKey: 'silver', amount, returnPct: 25, expectedReturn: amount*0.25,
    referenceCode: `ASM-${Math.random()}`, status: 'active', approvedAt: when, startAt: when })
  return u
}

test('ranks by total approved principal desc with names', async () => {
  await investor('Alice', 500000)
  await investor('Bob', 900000)
  const rows = await topInvestors('yearly')
  expect(rows[0].name).toBe('Bob')
  expect(rows[0].rank).toBe(1)
  expect(rows[0].totalInvested).toBe(900000)
  expect(rows[1].name).toBe('Alice')
})

test('daily excludes older approvals', async () => {
  const old = new Date(Date.now() - 3*24*3600*1000)
  await investor('Old', 999999, old)
  await investor('Fresh', 100000)
  const rows = await topInvestors('daily')
  expect(rows.map((r) => r.name)).toEqual(['Fresh'])
})
