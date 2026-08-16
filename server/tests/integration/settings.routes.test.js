'use strict'

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const env = require('../../src/config/env')
const { generateUniqueCode } = require('../../src/services/referralCode')
const cloudinary = require('../../src/config/cloudinary')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const tokenFor = (user) => jwt.sign({ id: user._id.toString() }, env.JWT_SECRET)

async function makeUser(role = 'user') {
  const referralCode = await generateUniqueCode()
  return User.create({
    name: role === 'admin' ? 'Admin' : 'User',
    email: `${role}-${Date.now()}@t.com`,
    passwordHash: 'x',
    role,
    referralCode,
  })
}

describe('Settings API', () => {
  test('GET /api/settings is public and returns defaults', async () => {
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.settings.inrThresholdPaise).toBe(200000)
    expect(res.body.settings.binancePayName).toBe('ASM Coins')
  })

  test('PUT /api/settings requires auth', async () => {
    const res = await request(app).put('/api/settings').send({ binancePayId: 'x' })
    expect(res.status).toBe(401)
  })

  test('PUT /api/settings rejects non-admin', async () => {
    const user = await makeUser('user')
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ binancePayId: 'x' })
    expect(res.status).toBe(403)
  })

  test('PUT /api/settings updates fields as admin', async () => {
    const admin = await makeUser('admin')
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        usdtTrc20Address: 'TXYZ',
        whatsappNumber: '+91 98765 43210',
        telegramUsername: '@iamhim_bss',
        inrThresholdPaise: 300000,
        methods: { binancePay: false },
      })
    expect(res.status).toBe(200)
    expect(res.body.settings.usdtTrc20Address).toBe('TXYZ')
    expect(res.body.settings.whatsappNumber).toBe('919876543210')
    expect(res.body.settings.telegramUsername).toBe('iamhim_bss')
    expect(res.body.settings.inrThresholdPaise).toBe(300000)
    expect(res.body.settings.methods.binancePay).toBe(false)
  })

  test('POST image returns 503 when Cloudinary is not configured', async () => {
    const spy = jest.spyOn(cloudinary, 'isConfigured').mockReturnValue(false)
    try {
      const admin = await makeUser('admin')
      const res = await request(app)
        .post('/api/settings/images/inr-qr')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .attach('file', Buffer.from('fakepng'), 'qr.png')
      expect(res.status).toBe(503)
    } finally {
      spy.mockRestore()
    }
  })

  test('POST image rejects an unknown key', async () => {
    const admin = await makeUser('admin')
    const res = await request(app)
      .post('/api/settings/images/not-a-key')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .attach('file', Buffer.from('fakepng'), 'qr.png')
    expect(res.status).toBe(400)
  })
})
