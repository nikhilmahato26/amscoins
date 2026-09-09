'use strict'

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const { seedPlans } = require('../../src/seed/seedPlans')
const invSvc = require('../../src/services/investmentService')
const cloudinaryConfig = require('../../src/config/cloudinary')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function registerAndDeposit() {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Depositor', email: `dep${Math.random()}@asm.com`, password: 'secret12' })
    .expect(201)
  const token = reg.body.token
  const deposit = await request(app)
    .post('/api/investments')
    .set('Authorization', `Bearer ${token}`)
    .send({ planKey: 'silver', amount: 100000 })
    .expect(201)
  return { token, investmentId: deposit.body.investment._id }
}

describe('POST /api/investments/:id/screenshot', () => {
  test('requires auth', async () => {
    const res = await request(app)
      .post('/api/investments/000000000000000000000000/screenshot')
      .attach('file', Buffer.from('fakepng'), 'proof.png')
    expect(res.status).toBe(401)
  })

  test('rejects a request with no file', async () => {
    const { token, investmentId } = await registerAndDeposit()
    const res = await request(app)
      .post(`/api/investments/${investmentId}/screenshot`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  test("404s on another user's investment", async () => {
    const { investmentId } = await registerAndDeposit()
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Someone Else', email: `other${Math.random()}@asm.com`, password: 'secret12' })
      .expect(201)

    const res = await request(app)
      .post(`/api/investments/${investmentId}/screenshot`)
      .set('Authorization', `Bearer ${reg2.body.token}`)
      .attach('file', Buffer.from('fakepng'), 'proof.png')
    expect(res.status).toBe(404)
  })

  test('rejects once the deposit is no longer pending', async () => {
    const { token, investmentId } = await registerAndDeposit()
    const admin = await User.create({
      name: 'Admin',
      email: `adm${Math.random()}@asm.com`,
      passwordHash: 'x',
      role: 'admin',
      referralCode: await generateUniqueCode(),
    })
    await invSvc.approveInvestment(investmentId, admin._id)

    const res = await request(app)
      .post(`/api/investments/${investmentId}/screenshot`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fakepng'), 'proof.png')
    expect(res.status).toBe(400)
  })

  test('returns 503 when Cloudinary is not configured', async () => {
    const spy = jest.spyOn(cloudinaryConfig, 'isConfigured').mockReturnValue(false)
    try {
      const { token, investmentId } = await registerAndDeposit()
      const res = await request(app)
        .post(`/api/investments/${investmentId}/screenshot`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fakepng'), 'proof.png')
      expect(res.status).toBe(503)
    } finally {
      spy.mockRestore()
    }
  })

  test('uploads and persists the screenshot URL on the investment', async () => {
    const fakeUrl = 'https://res.cloudinary.com/demo/image/upload/v1/asmcoins/payment-screenshots/fake.png'
    const isConfiguredSpy = jest.spyOn(cloudinaryConfig, 'isConfigured').mockReturnValue(true)
    const uploadSpy = jest.spyOn(cloudinaryConfig, 'uploadImage').mockResolvedValue({ secure_url: fakeUrl })
    try {
      const { token, investmentId } = await registerAndDeposit()

      const res = await request(app)
        .post(`/api/investments/${investmentId}/screenshot`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fakepng'), 'proof.png')

      expect(res.status).toBe(200)
      expect(res.body.investment.paymentScreenshotUrl).toBe(fakeUrl)
      expect(uploadSpy).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({ folder: 'asmcoins/payment-screenshots', publicId: investmentId })
      )

      const saved = await Investment.findById(investmentId)
      expect(saved.paymentScreenshotUrl).toBe(fakeUrl)
    } finally {
      isConfiguredSpy.mockRestore()
      uploadSpy.mockRestore()
    }
  })

  test('a re-upload overwrites the previous screenshot URL', async () => {
    const isConfiguredSpy = jest.spyOn(cloudinaryConfig, 'isConfigured').mockReturnValue(true)
    const uploadSpy = jest
      .spyOn(cloudinaryConfig, 'uploadImage')
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/first.png' })
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/second.png' })
    try {
      const { token, investmentId } = await registerAndDeposit()

      await request(app)
        .post(`/api/investments/${investmentId}/screenshot`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fakepng1'), 'first.png')
        .expect(200)

      const res = await request(app)
        .post(`/api/investments/${investmentId}/screenshot`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fakepng2'), 'second.png')
        .expect(200)

      expect(res.body.investment.paymentScreenshotUrl).toBe('https://res.cloudinary.com/demo/second.png')
    } finally {
      isConfiguredSpy.mockRestore()
      uploadSpy.mockRestore()
    }
  })
})
