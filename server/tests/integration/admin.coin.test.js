process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const CoinIndexState = require('../../src/models/CoinIndexState')
const CoinAdminAction = require('../../src/models/CoinAdminAction')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function login(role) {
  const passwordHash = await bcrypt.hash('pass1234', 10)
  const user = await User.create({
    name: role,
    email: `${role}${Math.random()}@asm.com`,
    passwordHash,
    role,
    referralCode: await generateUniqueCode(),
  })
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'pass1234' })
  return { user, token: res.body.token }
}

describe('admin coin endpoints', () => {
  it('rejects a non-admin on every endpoint', async () => {
    const { token } = await login('user')
    const auth = { Authorization: `Bearer ${token}` }

    await request(app).post('/api/admin/coin/pump').set(auth).send({ size: 'small', durationMinutes: 5 }).expect(403)
    await request(app).post('/api/admin/coin/crash').set(auth).send({ size: 'small', durationMinutes: 5 }).expect(403)
    await request(app).post('/api/admin/coin/volatility').set(auth).send({ value: 50 }).expect(403)
    await request(app).post('/api/admin/coin/reset').set(auth).send({}).expect(403)
    await request(app).get('/api/admin/coin/actions').set(auth).expect(403)
  })

  it('rejects an unauthenticated request', async () => {
    await request(app).post('/api/admin/coin/pump').send({ size: 'small', durationMinutes: 5 }).expect(401)
  })

  it('starts a pump and returns the new state', async () => {
    const { token } = await login('admin')
    await CoinIndexState.getSingleton()

    const res = await request(app)
      .post('/api/admin/coin/pump')
      .set('Authorization', `Bearer ${token}`)
      .send({ size: 'medium', durationMinutes: 10 })
      .expect(200)

    expect(res.body.move.action).toBe('pump')
    expect(res.body.move.targetPrice).toBeGreaterThan(res.body.move.startPrice)
  })

  it('starts a crash below the current price', async () => {
    const { token } = await login('admin')
    await CoinIndexState.getSingleton()

    const res = await request(app)
      .post('/api/admin/coin/crash')
      .set('Authorization', `Bearer ${token}`)
      .send({ size: 'hard', durationMinutes: 5 })
      .expect(200)

    expect(res.body.move.targetPrice).toBeLessThan(res.body.move.startPrice)
  })

  it('rejects an invalid size', async () => {
    const { token } = await login('admin')
    await request(app)
      .post('/api/admin/coin/pump')
      .set('Authorization', `Bearer ${token}`)
      .send({ size: 'enormous', durationMinutes: 5 })
      .expect(400)
  })

  it('rejects a volatility outside 0-100', async () => {
    const { token } = await login('admin')
    await request(app)
      .post('/api/admin/coin/volatility')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 500 })
      .expect(400)
  })

  it('resets the index to baseline', async () => {
    const { token } = await login('admin')
    const s = await CoinIndexState.getSingleton()
    s.currentPrice = 300000
    await s.save()

    const res = await request(app)
      .post('/api/admin/coin/reset')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200)

    expect(res.body.currentPrice).toBe(124780)
  })

  it('records exactly one audit row per action, attributed to the admin', async () => {
    const { user, token } = await login('admin')
    await CoinIndexState.getSingleton()

    await request(app)
      .post('/api/admin/coin/volatility')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 70 })
      .expect(200)

    const rows = await CoinAdminAction.find()
    expect(rows).toHaveLength(1)
    expect(String(rows[0].admin)).toBe(String(user._id))
  })

  it('lists actions newest first', async () => {
    const { token } = await login('admin')
    const auth = { Authorization: `Bearer ${token}` }
    await CoinIndexState.getSingleton()

    await request(app).post('/api/admin/coin/volatility').set(auth).send({ value: 20 }).expect(200)
    await request(app).post('/api/admin/coin/volatility').set(auth).send({ value: 90 }).expect(200)

    const res = await request(app).get('/api/admin/coin/actions').set(auth).expect(200)

    expect(res.body.total).toBe(2)
    expect(res.body.rows[0].params.value).toBe(90)
  })
})
