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

async function userToken() {
  const res = await request(app).post('/api/auth/register').send({ name: 'U', email: `u${Math.random()}@b.com`, password: 'secret12' })
  return res.body.token
}

test('user raises a query, it appears in their list, admin resolves it', async () => {
  const token = await userToken()

  const create = await request(app)
    .post('/api/support')
    .set('Authorization', `Bearer ${token}`)
    .send({ subject: 'Deposit not credited', message: 'I paid but my wallet is empty.' })
  expect(create.status).toBe(201)
  expect(create.body.ticket.publicRef).toMatch(/^SUP-[A-Z0-9]{6}$/)
  expect(create.body.ticket.status).toBe('open')
  const ticketId = create.body.ticket.id

  const mine = await request(app).get('/api/support/mine').set('Authorization', `Bearer ${token}`)
  expect(mine.status).toBe(200)
  expect(mine.body.tickets).toHaveLength(1)

  const aToken = await adminToken()
  const list = await request(app).get('/api/admin/support?status=open').set('Authorization', `Bearer ${aToken}`)
  expect(list.status).toBe(200)
  expect(list.body).toHaveLength(1)
  expect(list.body[0].user.email).toBeTruthy()

  const resolve = await request(app)
    .post(`/api/admin/support/${ticketId}/resolve`)
    .set('Authorization', `Bearer ${aToken}`)
    .send({ adminNote: 'Credited manually.' })
  expect(resolve.status).toBe(200)
  expect(resolve.body.status).toBe('resolved')

  // Resolving again is a 409 (already resolved).
  const again = await request(app)
    .post(`/api/admin/support/${ticketId}/resolve`)
    .set('Authorization', `Bearer ${aToken}`)
    .send({})
  expect(again.status).toBe(409)
})

test('support query with a too-short message is 400', async () => {
  const token = await userToken()
  const res = await request(app)
    .post('/api/support')
    .set('Authorization', `Bearer ${token}`)
    .send({ subject: 'Hi', message: 'x' })
  expect(res.status).toBe(400)
})

test('a non-admin cannot list support tickets', async () => {
  const token = await userToken()
  const res = await request(app).get('/api/admin/support').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(403)
})
