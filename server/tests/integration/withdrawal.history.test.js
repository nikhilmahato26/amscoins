process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const { credit } = require('../../src/services/walletService')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function registerFunded(balance) {
  const reg = await request(app).post('/api/auth/register').send({ name: 'A', email: `a${Math.random()}@b.com`, password: 'secret12' })
  const user = await User.findOne({ email: reg.body.user.email })
  await credit(user._id, balance, { type: 'adjustment', actor: 'admin' })
  return { token: reg.body.token, user }
}

async function adminToken() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('admin123', 10)
  await User.create({ name: 'Admin', email: 'admin@asm.com', passwordHash, role: 'admin', referralCode: code })
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@asm.com', password: 'admin123' })
  return res.body.token
}

const userTxns = async (token) =>
  (await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`)).body

test('a requested withdrawal is hidden from the user history until it is completed', async () => {
  const { token } = await registerFunded(200000)
  const aToken = await adminToken()

  // Only the initial funding shows so far.
  let hist = await userTxns(token)
  expect(hist.balance).toBe(200000)
  expect(hist.transactions).toHaveLength(1)

  // Request a withdrawal — money leaves the balance, but nothing new in history.
  const wd = await request(app).post('/api/withdrawals').set('Authorization', `Bearer ${token}`).send({ amount: 100000, upiId: 'x@upi' })
  expect(wd.status).toBe(201)
  hist = await userTxns(token)
  expect(hist.balance).toBe(100000)
  expect(hist.transactions).toHaveLength(1) // withdrawal NOT shown while pending
  expect(hist.transactions.some((t) => t.type === 'withdrawal')).toBe(false)

  // Admin completes it → now it appears, as settled.
  const done = await request(app).post(`/api/admin/withdrawals/${wd.body._id}/complete`).set('Authorization', `Bearer ${aToken}`)
  expect(done.status).toBe(200)
  hist = await userTxns(token)
  const wtxn = hist.transactions.find((t) => t.type === 'withdrawal')
  expect(wtxn).toBeTruthy()
  expect(wtxn.status).toBe('settled')
})

test('a rejected withdrawal never appears; the balance is restored quietly', async () => {
  const { token } = await registerFunded(200000)
  const aToken = await adminToken()

  const wd = await request(app).post('/api/withdrawals').set('Authorization', `Bearer ${token}`).send({ amount: 100000, upiId: 'x@upi' })
  await request(app).post(`/api/admin/withdrawals/${wd.body._id}/reject`).set('Authorization', `Bearer ${aToken}`).send({ note: 'bad details' })

  const hist = await userTxns(token)
  expect(hist.balance).toBe(200000) // money back
  expect(hist.transactions).toHaveLength(1) // no withdrawal, no refund line
  expect(hist.transactions.every((t) => t.type === 'adjustment')).toBe(true)
})

test('admin DOES see the in-flight withdrawal on the user detail view', async () => {
  const { token, user } = await registerFunded(200000)
  const aToken = await adminToken()
  await request(app).post('/api/withdrawals').set('Authorization', `Bearer ${token}`).send({ amount: 100000, upiId: 'x@upi' })

  const detail = await request(app).get(`/api/admin/users/${user._id}`).set('Authorization', `Bearer ${aToken}`)
  const pending = detail.body.transactions.find((t) => t.type === 'withdrawal')
  expect(pending).toBeTruthy()
  expect(pending.status).toBe('pending')
})
