process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
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

describe('GET /api/admin/reports/:type', () => {
  it('monthly — returns array', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/reports/monthly')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('conversion — returns shape', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/reports/conversion')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pending')
    expect(res.body).toHaveProperty('conversionRate')
  })

  it('roi — returns shape', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/reports/roi')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('expectedReturn')
    expect(res.body).toHaveProperty('roiPct')
  })

  it('performance — returns array', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/reports/performance')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('unknown type — 400', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/admin/reports/unknown')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })
})
