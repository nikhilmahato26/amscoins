process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Withdrawal = require('../../src/models/Withdrawal')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function adminToken() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('admin123', 10)
  await User.create({ name: 'Admin', email: 'admin@asm.com', passwordHash, role: 'admin', referralCode: code })
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@asm.com', password: 'admin123' })
  return res.body.token
}

async function createUser() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('user123', 10)
  return User.create({ name: 'Test', email: 'test@test.com', passwordHash, role: 'user', tier: 'silver', referralCode: code })
}

describe('POST /api/admin/withdrawals/bulk-approve', () => {
  it('returns 400 for empty ids array', async () => {
    const token = await adminToken()
    const res = await request(app)
      .post('/api/admin/withdrawals/bulk-approve')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] })
    expect(res.status).toBe(400)
  })

  it('approves multiple pending withdrawals', async () => {
    const token = await adminToken()
    const user = await createUser()
    const [w1, w2] = await Withdrawal.create([
      { user: user._id, gross: 1000, tds: 0, net: 1000, method: 'upi', upiId: 'a@b', status: 'pending' },
      { user: user._id, gross: 2000, tds: 0, net: 2000, method: 'upi', upiId: 'a@b', status: 'pending' },
    ])
    const res = await request(app)
      .post('/api/admin/withdrawals/bulk-approve')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [String(w1._id), String(w2._id)] })
    expect(res.status).toBe(200)
    expect(res.body.approved).toBe(2)
    const updated = await Withdrawal.findById(w1._id)
    expect(updated.status).toBe('completed')
    expect(updated.processedAt).toBeTruthy()
  })

  it('skips non-pending withdrawals (idempotent)', async () => {
    const token = await adminToken()
    const user = await createUser()
    const [w1, w2] = await Withdrawal.create([
      { user: user._id, gross: 1000, tds: 0, net: 1000, method: 'upi', upiId: 'a@b', status: 'pending' },
      { user: user._id, gross: 2000, tds: 0, net: 2000, method: 'upi', upiId: 'a@b', status: 'completed' },
    ])
    const res = await request(app)
      .post('/api/admin/withdrawals/bulk-approve')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [String(w1._id), String(w2._id)] })
    expect(res.status).toBe(200)
    expect(res.body.approved).toBe(1)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/admin/withdrawals/bulk-approve')
      .send({ ids: ['abc'] })
    expect(res.status).toBe(401)
  })
})

describe('Withdrawal model — extended statuses', () => {
  it('accepts failed status with failureReason', async () => {
    const user = await createUser()
    const w = await Withdrawal.create({
      user: user._id, gross: 100, tds: 0, net: 100, method: 'upi', upiId: 'x@y',
      status: 'failed', failureReason: 'Bank timeout',
    })
    expect(w.status).toBe('failed')
    expect(w.failureReason).toBe('Bank timeout')
  })
})
